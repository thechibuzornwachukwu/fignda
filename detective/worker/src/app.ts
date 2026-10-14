// Lantern Row API. Pure request handling; bindings come in through `deps` so tests can run it directly.
// One job: a finished step of a case is checked here, by the engine that made it, and kept on the account.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { CHAPTERS, checkStep } from './caseStep';
import { MAX_LOG_EVENTS, MAX_PLAY_MS } from './replay';

export type Deps = {
  /** Service role client. Server side only. */
  db: SupabaseClient;
  origins: readonly string[];
};

export const LIMITS = { playsPerHour: 120 } as const;

const MAX_BODY = 64 * 1024;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

function json(body: Json, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}

const fail = (status: number, error: string, extra?: Record<string, string>) => json({ error }, status, extra);

function withCors(res: Response, origin: string | null, origins: readonly string[]) {
  if (!origin || !origins.includes(origin)) return res;
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', origin);
  // So the page can read when to try again after a 429.
  h.set('Access-Control-Expose-Headers', 'Retry-After');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public headers: Record<string, string> = {},
  ) {
    super(code);
  }
}

async function readJson(req: Request): Promise<unknown> {
  const len = Number(req.headers.get('Content-Length') ?? 0);
  if (len > MAX_BODY) throw new HttpError(413, 'body_too_large');
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'body_too_large');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

/** No header: guest. A header that does not verify: 401. */
async function currentUser(db: SupabaseClient, req: Request): Promise<User | null> {
  const h = req.headers.get('Authorization');
  if (!h) return null;
  const m = h.match(/^Bearer\s+(\S+)$/);
  if (!m) throw new HttpError(401, 'bad_token');
  const { data, error } = await db.auth.getUser(m[1]);
  if (error || !data.user) throw new HttpError(401, 'bad_token');
  return data.user;
}

async function limit(db: SupabaseClient, key: string, max: number, windowSecs = 3600) {
  const { data, error } = await db.rpc('hit_rate_limit', { p_key: key, p_max: max, p_window_seconds: windowSecs });
  if (error) throw new HttpError(503, 'rate_limit_unavailable');
  const row = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; retry_after: number };
  if (!row.allowed) throw new HttpError(429, 'rate_limited', { 'Retry-After': String(row.retry_after) });
}

// ---------------------------------------------------------------------------
// POST /api/plays: a finished step of a case
// ---------------------------------------------------------------------------

const Ms = z.number().int().min(0).max(MAX_PLAY_MS);

export const PlayBody = z
  .object({
    // A step of a case, counted from 1. `named`: the line-up only, the suspects named, in order.
    // `picked`: a step answered by picking only, the picks made, in order, counted from 0.
    game: z
      .object({
        type: z.literal('case'),
        id: z.string().regex(/^[a-z0-9-]{2,40}$/),
        step: z.number().int().min(1).max(12),
        named: z.array(z.string().min(1).max(60)).max(2).optional(),
        picked: z.array(z.number().int().min(0).max(39)).max(40).optional(),
      })
      .strict(),
    log: z
      .object({
        events: z.array(z.object({ a: z.number().int().min(0).max(5000), b: z.number().int().min(0).max(5000), t: Ms }).strict()).max(MAX_LOG_EVENTS),
        hints: z.array(Ms).max(MAX_LOG_EVENTS),
        finish: Ms,
      })
      .strict(),
  })
  .strict();

async function plays(req: Request, deps: Deps) {
  const user = await currentUser(deps.db, req);
  if (!user) throw new HttpError(401, 'sign_in_required');
  await limit(deps.db, `plays:user:${user.id}`, LIMITS.playsPerHour);
  const parsed = PlayBody.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'bad_request');
  const { game, log } = parsed.data;
  const chapter = CHAPTERS[game.id];
  if (!chapter) throw new HttpError(404, 'unknown_game');
  const c = checkStep(chapter, game.step, log, game.named, game.picked);
  if (!c.ok) throw new HttpError(c.status, c.reason);
  const kept = await deps.db.rpc('record_step', { p_user: user.id, p_chapter: chapter.id, p_step: game.step, p_stars: c.stars, p_score: c.score });
  if (kept.error || !kept.data) throw new HttpError(500, 'save_failed');
  return json({ verified: true, step: game.step, found: c.found, total: c.total, hints: c.hints, secs: c.secs, score: c.score, stars: c.stars });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = req.headers.get('Origin');
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    if (!origin || !deps.origins.includes(origin)) return fail(403, 'origin_not_allowed');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      },
    });
  }
  // Browsers from other sites are refused outright, not just left without CORS headers.
  if (origin && !deps.origins.includes(origin)) return fail(403, 'origin_not_allowed');

  let res: Response;
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') res = json({ ok: true });
    else if (url.pathname === '/api/plays' && req.method === 'POST') res = await plays(req, deps);
    else res = fail(404, 'not_found');
  } catch (e) {
    res = e instanceof HttpError ? fail(e.status, e.code, e.headers) : fail(500, 'server_error');
  }
  return withCors(res, origin, deps.origins);
}
