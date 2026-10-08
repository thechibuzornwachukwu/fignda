// Fignda API. Pure request handling; bindings come in through `deps` so tests can run it directly.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { dayNo } from '../../src/engine/daily';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { checkDraft, crossesWords, MAKE, WORD_RE } from '../../src/engine/make';
import pools from '../../data/copy.json';
import type { AiGenerate } from './ai';
import { PUSH_ENDPOINT, type PushSend } from './push';
import { MAX_LOG_EVENTS, MAX_PLAY_MS, replay } from './replay';
import { TOPIC_MAX, cleanTopic, isProfane, shareCode, topicKey } from './text';

export { crossesWords };

export type Deps = {
  /** Service role client. Server side only. */
  db: SupabaseClient;
  /** Null when no AI key is configured: /api/generate is off. */
  ai: AiGenerate | null;
  origins: readonly string[];
  /** Null when no VAPID keys are configured: reminders are off. */
  push?: PushSend | null;
  /** Public VAPID key, handed to browsers so they can subscribe. */
  pushKey?: string | null;
  now?: () => Date;
};

export const LIMITS = {
  guestGeneratePerHour: 5,
  userGeneratePerHour: 20,
  playsPerHour: 120,
  pushLinesPerHour: 60,
  invitesPerHour: 30,
  nudgesPerHour: 20,
  puzzlesPerHour: 10,
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

const AI_ATTEMPTS = 2;

/** One AI round: validated, filtered, at least 4 hidden words that cross word boundaries. */
export async function draft(ai: AiGenerate, topic: string) {
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
// POST /api/puzzles. A player's own puzzle: their paragraph, their words, checked by the engine.
// ---------------------------------------------------------------------------

const line = (max: number) =>
  z
    .string()
    .transform((s) => cleanTopic(s))
    .pipe(z.string().min(2).max(max));

export const PuzzleBody = z
  .object({
    title: line(MAKE.titleMax),
    /** What is hidden, plural: "Lagos places". */
    noun: line(MAKE.nounMax),
    text: z
      .string()
      .transform((s) => cleanTopic(s))
      .pipe(z.string().min(MAKE.minText).max(MAKE.maxText)),
    words: z.array(z.string().regex(WORD_RE)).min(MAKE.minWords).max(MAKE.maxWords),
  })
  .strict();

async function makePuzzle(req: Request, deps: Deps) {
  const user = await currentUser(deps.db, req);
  if (!user) throw new HttpError(401, 'sign_in_required');
  await limit(deps.db, `puzzle:user:${user.id}`, LIMITS.puzzlesPerHour);
  const parsed = PuzzleBody.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'bad_request');
  const { title, noun, text, words } = parsed.data;
  if (isProfane(title, noun, text, words.join(' '))) throw new HttpError(422, 'not_allowed');

  // The same check the maker screen runs. Every word must really hide across word boundaries.
  const draft = checkDraft(text, words);
  if (!draft.ok) {
    return json({ error: 'not_hidden', words: draft.words.filter((w) => w.state !== 'hidden').map((w) => w.word) }, 422);
  }
  // The answer list comes from the engine, in the engine's own labels.
  const dict = buildHiddenWords({ text, dict: words }).answers.map((a) => a.label);

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = shareCode();
    const ins = await deps.db
      .from('games')
      .insert({ id: `c-${code.toLowerCase()}`, kind: 'custom', owner_id: user.id, share_code: code, category: 'Player made', title, noun, text, dict })
      .select('id, share_code, title, noun, text, dict')
      .single();
    if (!ins.error) return json(gameOut(ins.data));
    if (ins.error.code !== '23505') throw new HttpError(500, 'save_failed');
  }
  throw new HttpError(500, 'save_failed');
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
    /** Played in a room: stored for the Together board, never for the solo boards. */
    room: z
      .string()
      .regex(/^[A-HJ-NP-Z2-9]{6}$/)
      .optional(),
  })
  .strict();

async function plays(req: Request, deps: Deps) {
  const user = await currentUser(deps.db, req);
  if (!user) throw new HttpError(401, 'sign_in_required');
  await limit(deps.db, `plays:user:${user.id}`, LIMITS.playsPerHour);

  const parsed = PlayBody.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'bad_request');
  const { game, log, room } = parsed.data;
  // Dailies are one try, alone.
  if (room && game.type === 'daily') throw new HttpError(400, 'bad_request');
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

  if (room) {
    // Only this player's own selections are stored. Who gets a word two players both found is settled by time
    // when the board is read, so a teammate's find is never credited here.
    const saved = await deps.db.rpc('record_room_play', {
      p_room: room,
      p_game: gameId,
      p_user: user.id,
      p_total: r.total,
      p_hints: r.hints,
      p_finish_ms: log.finish,
      p_finds: r.finds,
      p_log: log,
    });
    if (saved.error) {
      if (saved.error.code === '23505') throw new HttpError(409, 'already_played');
      throw new HttpError(500, 'save_failed');
    }
    return json({ verified: true, room: true, found: r.found, total: r.total, hints: r.hints, secs: r.secs });
  }

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
    // Which words, for "only 8% found this word".
    found_keys: r.finds.map((f) => f.k),
  });
  if (ins.error) {
    if (ins.error.code === '23505') throw new HttpError(409, 'already_played');
    throw new HttpError(500, 'save_failed');
  }
  return json({ verified: true, found: r.found, total: r.total, hints: r.hints, misses: r.misses, secs: r.secs, score: r.score });
}

// ---------------------------------------------------------------------------
// Daily reminders. The cron sends empty pushes; the service worker then asks here what to say.
// ---------------------------------------------------------------------------

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
const any = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

/** Where a game lives: curated puzzles by id, custom ones by their share code. */
const gamePath = (id: string) => (id.startsWith('c-') ? `/p/${id.slice(2).toUpperCase()}` : `/play/${id}`);

/**
 * The line for one player. A fresh room invite comes first, then a friend who has played, then the streak,
 * then the plain nudge.
 */
export function reminderLine(ctx: { streak: number; friend: string | null; inviteFrom?: string | null }): string {
  if (ctx.inviteFrom) return fill(any(pools.inviteGame), { name: ctx.inviteFrom });
  if (ctx.friend) return fill(any(pools.remindFriend), { name: ctx.friend });
  if (ctx.streak >= 2) return fill(any(pools.remindStreak), { n: ctx.streak });
  return any(pools.remind);
}

/** POST /api/push/line. Called by the service worker when a push arrives. The endpoint is its only identity. */
async function pushLine(req: Request, deps: Deps) {
  await limit(deps.db, `pushline:ip:${clientIp(req)}`, LIMITS.pushLinesPerHour);
  const body = (await readJson(req)) as { endpoint?: unknown } | null;
  const endpoint = body && typeof body === 'object' && typeof body.endpoint === 'string' ? body.endpoint : '';
  let url = `/d/${dayNo(deps.now?.() ?? new Date())}`;
  // An unknown browser gets the plain line: nothing here says whether an endpoint is registered.
  let ctx = { streak: 0, friend: null as string | null, inviteFrom: null as string | null };
  if (endpoint.length <= 1000 && PUSH_ENDPOINT.test(endpoint)) {
    const { data } = await deps.db.rpc('reminder_context', { p_endpoint: endpoint });
    type Row = { streak: number; friend: string | null; invite_from: string | null; invite_game: string | null; invite_room: string | null };
    const row = (Array.isArray(data) ? data[0] : data) as Row | null | undefined;
    if (row) {
      ctx = { streak: row.streak ?? 0, friend: row.friend ?? null, inviteFrom: row.invite_from ?? null };
      if (row.invite_from && row.invite_game && row.invite_room) url = `${gamePath(row.invite_game)}?room=${row.invite_room}`;
    }
  }
  return json({ title: 'Fignda', body: reminderLine(ctx), url });
}

/** Empty pushes to a few browsers. Gone ones are forgotten. Returns how many went out. */
async function pushAll(deps: Deps, endpoints: string[]): Promise<number> {
  if (!deps.push) return 0;
  let sent = 0;
  await Promise.all(
    endpoints.slice(0, 5).map(async (endpoint) => {
      const status = await deps.push!(endpoint).catch(() => 0);
      if (status === 404 || status === 410) await deps.db.from('push_subs').delete().eq('endpoint', endpoint);
      else if (status >= 200 && status < 300) sent++;
    }),
  );
  return sent;
}

const Handle = z.string().regex(/^[a-z0-9._]{2,20}$/);
const endpointsOf = (data: unknown) => ((data ?? []) as Array<{ endpoint: string }>).map((r) => r.endpoint);

/** POST /api/invite. Ask a player you follow into your room. They see it on the games screen; a push goes out if they follow you back. */
async function invite(req: Request, deps: Deps) {
  const user = await currentUser(deps.db, req);
  if (!user) throw new HttpError(401, 'sign_in_required');
  await limit(deps.db, `invite:user:${user.id}`, LIMITS.invitesPerHour);
  const parsed = z
    .object({ handle: Handle, game: z.string().regex(/^[a-z0-9-]{2,40}$/), room: z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/) })
    .strict()
    .safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'bad_request');
  const { handle: to, game, room } = parsed.data;
  const r = await deps.db.rpc('claim_invite', { p_user: user.id, p_handle: to, p_game: game, p_room: room });
  if (r.error) {
    if (r.error.code === '23505') return json({ ok: true, pushed: 0, again: true });
    if (r.error.code === '42501') throw new HttpError(403, 'not_following');
    if (r.error.code === '23503') throw new HttpError(404, 'unknown_game');
    throw new HttpError(500, 'save_failed');
  }
  return json({ ok: true, pushed: await pushAll(deps, endpointsOf(r.data)) });
}

/** POST /api/nudge. You have played, your streak friend has not: one nudge a day. */
async function nudge(req: Request, deps: Deps) {
  const user = await currentUser(deps.db, req);
  if (!user) throw new HttpError(401, 'sign_in_required');
  await limit(deps.db, `nudge:user:${user.id}`, LIMITS.nudgesPerHour);
  const parsed = z.object({ handle: Handle }).strict().safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'bad_request');
  const r = await deps.db.rpc('claim_nudge', { p_user: user.id, p_handle: parsed.data.handle });
  if (r.error) {
    const why = r.error.message;
    if (why.includes('already nudged')) throw new HttpError(409, 'already_nudged');
    if (why.includes('play first')) throw new HttpError(409, 'play_first');
    if (why.includes('already played')) throw new HttpError(409, 'already_played');
    if (why.includes('no streak')) throw new HttpError(404, 'no_streak');
    throw new HttpError(500, 'save_failed');
  }
  return json({ ok: true, pushed: await pushAll(deps, endpointsOf(r.data)) });
}

/**
 * Hourly cron. Sends one empty push to every browser whose reminder hour is now and whose player has not played
 * today. Browsers the push service says are gone are forgotten.
 */
export async function sendReminders(deps: Deps): Promise<{ sent: number; gone: number; failed: number }> {
  const out = { sent: 0, gone: 0, failed: 0 };
  if (!deps.push) return out;
  const { data, error } = await deps.db.rpc('claim_due_reminders');
  if (error) throw new Error('claim_due_reminders failed');
  const due = ((data ?? []) as Array<{ endpoint: string }>).map((r) => r.endpoint);
  // A few at a time: push services are quick, but a Worker run is short.
  for (let i = 0; i < due.length; i += 20) {
    await Promise.all(
      due.slice(i, i + 20).map(async (endpoint) => {
        const status = await deps.push!(endpoint).catch(() => 0);
        if (status === 404 || status === 410) {
          await deps.db.from('push_subs').delete().eq('endpoint', endpoint);
          out.gone++;
        } else if (status >= 200 && status < 300) out.sent++;
        else out.failed++;
      }),
    );
  }
  return out;
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
    if (url.pathname === '/api/health' && req.method === 'GET') res = json({ ok: true, generate: !!deps.ai, push: (deps.push && deps.pushKey) || null });
    else if (url.pathname === '/api/generate' && req.method === 'POST') res = await generate(req, deps);
    else if (url.pathname === '/api/plays' && req.method === 'POST') res = await plays(req, deps);
    else if (url.pathname === '/api/puzzles' && req.method === 'POST') res = await makePuzzle(req, deps);
    else if (url.pathname === '/api/push/line' && req.method === 'POST') res = await pushLine(req, deps);
    else if (url.pathname === '/api/invite' && req.method === 'POST') res = await invite(req, deps);
    else if (url.pathname === '/api/nudge' && req.method === 'POST') res = await nudge(req, deps);
    else res = fail(404, 'not_found');
  } catch (e) {
    res = e instanceof HttpError ? fail(e.status, e.code, e.headers) : fail(500, 'server_error');
  }
  return withCors(res, origin, deps.origins);
}
