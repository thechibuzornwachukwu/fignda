// Fignda API. Pure request handling; bindings come in through `deps` so tests can run it directly.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { dayNo } from '../../src/engine/daily';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import type { AiGenerate } from './ai';
import { MAX_LOG_EVENTS, MAX_PLAY_MS, replay } from './replay';
import { TOPIC_MAX, cleanTopic, isProfane, shareCode, topicKey } from './text';

export type Deps = {
  /** Service role client. Server side only. */
  db: SupabaseClient;
  /** Null when no AI key is configured: /api/generate is off. */
  ai: AiGenerate | null;
  origins: readonly string[];
  now?: () => Date;
};

export const LIMITS = {
  guestGeneratePerHour: 5,
  userGeneratePerHour: 20,
  playsPerHour: 120,
} as const;

const MAX_BODY = 64 * 1024;
const CACHE_HOURS = 24;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

function json(body: Json, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

const fail = (status: number, error: string, extra?: Record<string, string>) => json({ error }, status, extra);

function withCors(res: Response, origin: string | null, origins: readonly string[]) {
  if (!origin || !origins.includes(origin)) return res;
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
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

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public headers: Record<string, string> = {},
  ) {
    super(code);
  }
}

// ---------------------------------------------------------------------------
// Auth and rate limits
// ---------------------------------------------------------------------------

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

/** Cloudflare sets and overwrites CF-Connecting-IP; clients cannot spoof it through Cloudflare. */
const clientIp = (req: Request) => req.headers.get('CF-Connecting-IP') ?? 'unknown';

async function limit(db: SupabaseClient, key: string, max: number, windowSecs = 3600) {
  const { data, error } = await db.rpc('hit_rate_limit', { p_key: key, p_max: max, p_window_seconds: windowSecs });
  if (error) throw new HttpError(503, 'rate_limit_unavailable');
  const row = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; retry_after: number };
  if (!row.allowed) throw new HttpError(429, 'rate_limited', { 'Retry-After': String(row.retry_after) });
}

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------

/** What the AI must return. Anything else is a friendly failure. */
export const AiPuzzle = z
  .object({
    title: z.string().trim().min(1).max(40),
    paragraph: z.string().trim().min(40).max(900),
    words: z.array(z.string().regex(/^[A-Za-z]{3,12}$/)).min(1).max(20),
  })
  .strict();

/** True when some occurrence of the answer runs across a space or punctuation (the point of the game). */
export function crossesWords(chars: readonly { li: number }[], spans: ReadonlyArray<readonly [number, number]>): boolean {
  const at = new Map<number, number>();
  chars.forEach((c, i) => c.li >= 0 && at.set(c.li, i));
  return spans.some(([a, b]) => at.get(b)! - at.get(a)! > b - a);
}

const AI_ATTEMPTS = 2;

/** One AI round: validated, filtered, at least 4 hidden words that cross word boundaries. */
async function draft(ai: AiGenerate, topic: string) {
  const raw = await ai(topic).catch(() => null);
  const parsed = raw == null ? null : AiPuzzle.safeParse(extractJson(raw));
  if (!parsed?.success) return null;
  const { title, paragraph, words } = parsed.data;
  if (isProfane(title, paragraph, words.join(' '))) return null;
  const puzzle = buildHiddenWords({ text: paragraph, dict: words });
  const hidden = puzzle.answers.filter((a) => crossesWords(puzzle.chars, a.spans));
  if (hidden.length < 4) return null;
  return { title, paragraph, dict: hidden.map((a) => a.label) };
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function generate(req: Request, deps: Deps) {
  if (!deps.ai) throw new HttpError(503, 'generate_off');
  const body = (await readJson(req)) as { topic?: unknown } | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'bad_request');
  const topic = cleanTopic(body.topic);
  if (!topic) throw new HttpError(400, 'empty_topic');
  if (topic.length > TOPIC_MAX) throw new HttpError(400, 'topic_too_long');
  if (isProfane(topic)) throw new HttpError(422, 'generate_failed');

  const user = await currentUser(deps.db, req);
  await limit(
    deps.db,
    user ? `gen:user:${user.id}` : `gen:ip:${clientIp(req)}`,
    user ? LIMITS.userGeneratePerHour : LIMITS.guestGeneratePerHour,
  );

  // 24h cache by normalised topic.
  const key = topicKey(topic);
  const since = new Date((deps.now?.() ?? new Date()).getTime() - CACHE_HOURS * 3600_000).toISOString();
  const cached = await deps.db
    .from('games')
    .select('id, share_code, title, noun, text, dict')
    .eq('kind', 'custom')
    .eq('topic_key', key)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cached.data) return json({ ...gameOut(cached.data), cached: true });

  // The engine decides what really hides. Keep real hits that cross word boundaries only.
  let made: Awaited<ReturnType<typeof draft>> = null;
  for (let i = 0; i < AI_ATTEMPTS && !made; i++) made = await draft(deps.ai, topic);
  if (!made) throw new HttpError(422, 'generate_failed');
  const { title, paragraph, dict } = made;

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = shareCode();
    const row = {
      id: `c-${code.toLowerCase()}`,
      kind: 'custom',
      owner_id: user?.id ?? null,
      share_code: code,
      category: 'Custom',
      title,
      noun: `${topic.toLowerCase()} words`.slice(0, 80),
      text: paragraph,
      dict,
      topic_key: key,
    };
    const ins = await deps.db.from('games').insert(row).select('id, share_code, title, noun, text, dict').single();
    if (!ins.error) return json(gameOut(ins.data));
    if (ins.error.code !== '23505') throw new HttpError(500, 'save_failed');
  }
  throw new HttpError(500, 'save_failed');
}

function gameOut(g: { id: string; share_code: string; title: string; noun: string; text: string; dict: unknown }) {
  return { id: g.id, code: g.share_code, title: g.title, noun: g.noun, text: g.text, dict: g.dict };
}

// ---------------------------------------------------------------------------
// POST /api/plays
// ---------------------------------------------------------------------------

const Ms = z.number().int().min(0).max(MAX_PLAY_MS);

export const PlayBody = z
  .object({
    game: z.discriminatedUnion('type', [
      z.object({ type: z.literal('daily'), day_no: z.number().int().min(1).max(100000) }).strict(),
      z.object({ type: z.literal('game'), id: z.string().regex(/^[a-z0-9-]{2,40}$/) }).strict(),
    ]),
    log: z
      .object({
        events: z
          .array(z.object({ a: z.number().int().min(0).max(5000), b: z.number().int().min(0).max(5000), t: Ms }).strict())
          .max(MAX_LOG_EVENTS),
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
  const today = dayNo(deps.now?.() ?? new Date());

  let gameId: string;
  let dayNum: number | null = null;
  let expected: string[] | null = null;
  if (game.type === 'daily') {
    // One try, today only. Past days' answers are public, so they cannot be verified.
    if (game.day_no !== today) throw new HttpError(400, 'not_today');
    const d = await deps.db.from('daily').select('game_id').eq('day_no', today).single();
    const a = await deps.db.from('daily_answers').select('answers').eq('day_no', today).single();
    if (d.error || a.error) throw new HttpError(500, 'daily_missing');
    gameId = d.data.game_id;
    dayNum = today;
    expected = a.data.answers as string[];
  } else {
    gameId = game.id;
  }

  const g = await deps.db.from('games').select('id, text, dict').eq('id', gameId).maybeSingle();
  if (g.error || !g.data) throw new HttpError(404, 'unknown_game');
  const puzzle = buildHiddenWords({ text: g.data.text as string, dict: g.data.dict as string[] });
  if (expected && puzzle.answers.map((x) => x.key).join() !== expected.join()) throw new HttpError(500, 'daily_mismatch');

  const r = replay(puzzle, log, game.type === 'daily');
  if (!r.ok) throw new HttpError(422, r.reason);

  const ins = await deps.db.from('plays').insert({
    user_id: user.id,
    game_id: gameId,
    day_no: dayNum,
    found: r.found,
    total: r.total,
    hints: r.hints,
    misses: r.misses,
    secs: r.secs,
    score: r.score,
    verified: true,
    source: 'worker',
    log,
  });
  if (ins.error) {
    if (ins.error.code === '23505') throw new HttpError(409, 'already_played');
    throw new HttpError(500, 'save_failed');
  }
  return json({ verified: true, found: r.found, total: r.total, hints: r.hints, misses: r.misses, secs: r.secs, score: r.score });
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
    if (url.pathname === '/api/health' && req.method === 'GET') res = json({ ok: true, generate: !!deps.ai });
    else if (url.pathname === '/api/generate' && req.method === 'POST') res = await generate(req, deps);
    else if (url.pathname === '/api/plays' && req.method === 'POST') res = await plays(req, deps);
    else res = fail(404, 'not_found');
  } catch (e) {
    res = e instanceof HttpError ? fail(e.status, e.code, e.headers) : fail(500, 'server_error');
  }
  return withCors(res, origin, deps.origins);
}
