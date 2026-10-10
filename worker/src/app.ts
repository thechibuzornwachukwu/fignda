// Gazecraft API. Pure request handling; bindings come in through `deps` so tests can run it directly.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { dayNo } from '../../src/engine/daily';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { checkDraft, crossesWords, MAKE, WORD_RE } from '../../src/engine/make';
import pools from '../../data/copy.json';
import type { AiGenerate } from './ai';
import { GUEST_KEY_RE, JOB, JOB_COLS, isDead, jobOut, ownerKey, refunds, withHeartbeat, type JobRow, type JobTiming } from './jobs';
import { PUSH_ENDPOINT, type PushSend } from './push';
import { MAX_LOG_EVENTS, MAX_PLAY_MS, replay } from './replay';
import { MAX_UNKNOWN, onRealWords, tokensOf, unknownIn } from './realWords';
import { allowsLink, safetyCheck, type SafetyEnv } from './safety';
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
  /** The safety check's models. Unset: the word filter only, and every puzzle is saved `unchecked`. */
  safety?: SafetyEnv | null;
  /** User ids with owner power (OWNER_USER_IDS). Empty: the owner endpoints answer 404 to everyone. */
  owners?: readonly string[];
  /** The Worker's ctx.waitUntil: about 30 more seconds after the answer has gone. */
  waitUntil?: (p: Promise<unknown>) => void;
  /** Job timings, for tests. */
  job?: Partial<JobTiming>;
};

export const LIMITS = {
  guestGeneratePerHour: 5,
  userGeneratePerHour: 20,
  playsPerHour: 120,
  pushLinesPerHour: 60,
  invitesPerHour: 30,
  nudgesPerHour: 20,
  puzzlesPerHour: 10,
  reportsPerHour: 20,
  /** Per address, guests too: a share has no player on it. */
  sharesPerHour: 30,
  /** Guests: every background ask, failed ones included. A failure hands back one of the 5, never one of these. */
  guestGenerateTriesPerHour: 15,
  /** Opening /run. It only ever does work for the one runner that wins the claim. */
  generateRunsPerHour: 60,
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
  // So the page can read when to try again after a 429.
  h.set('Access-Control-Expose-Headers', 'Retry-After');
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

/** One AI round: validated, filtered, at least 4 hidden words that cross word boundaries and sit on real words. */
export async function draft(ai: AiGenerate, topic: string) {
  const raw = await ai(topic).catch(() => null);
  const parsed = raw == null ? null : AiPuzzle.safeParse(extractJson(raw));
  if (!parsed?.success) return null;
  const { title, paragraph, words } = parsed.data;
  if (isProfane(title, paragraph, words.join(' '))) return null;
  // A model that cannot hide a word cuts it in two with a space ("cr oss"). Those are not puzzles.
  const hidden = honestWords(paragraph, words);
  if (!hidden) return null;
  return { title, paragraph, dict: hidden };
}

/** The hidden words that cross word boundaries and sit on real words. Null when there are under 4, or the text is full of fragments. */
export function honestWords(text: string, dict: readonly string[]): string[] | null {
  const puzzle = buildHiddenWords({ text, dict });
  const tokens = tokensOf(puzzle.chars);
  if (unknownIn(tokens).length > MAX_UNKNOWN) return null;
  const hidden = puzzle.answers.filter((a) => crossesWords(puzzle.chars, a.spans) && onRealWords(tokens, a.spans));
  return hidden.length < 4 ? null : hidden.map((a) => a.label);
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

const GAME_COLS = 'id, share_code, title, noun, text, dict';
type GameRow = { id: string; share_code: string; title: string; noun: string; text: string; dict: unknown };

const nowOf = (deps: Deps) => deps.now?.() ?? new Date();

/** A puzzle made for this topic in the last 24 hours that still holds up. Hidden ones are never handed out. */
async function cachedFor(deps: Deps, key: string): Promise<GameRow | null> {
  const since = new Date(nowOf(deps).getTime() - CACHE_HOURS * 3600_000).toISOString();
  const cached = await deps.db
    .from('games')
    .select(GAME_COLS)
    .eq('kind', 'custom')
    .eq('topic_key', key)
    .is('hidden_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // A puzzle saved before the real-word check may be made of fragments. Do not hand it out again.
  const stillGood = cached.data && honestWords(cached.data.text, (cached.data.dict as string[] | null) ?? []);
  return cached.data && stillGood ? (cached.data as GameRow) : null;
}

/**
 * The slow part: cache, model, engine, safety check, save. Used by the request that waits and by a job's runner.
 * Throws generate_failed (nothing usable came back) or not_allowed (the safety check refused it); nothing is saved then.
 */
async function makeForTopic(deps: Deps, topic: string, userId: string | null): Promise<{ game: GameRow; cached: boolean }> {
  if (!deps.ai) throw new HttpError(503, 'generate_off');
  const key = topicKey(topic);
  const cached = await cachedFor(deps, key);
  if (cached) return { game: cached, cached: true };

  // The engine decides what really hides. Keep real hits that cross word boundaries only.
  let made: Awaited<ReturnType<typeof draft>> = null;
  for (let i = 0; i < AI_ATTEMPTS && !made; i++) made = await draft(deps.ai, topic);
  if (!made) throw new HttpError(422, 'generate_failed');
  const { title, paragraph, dict } = made;
  const noun = `${topic.toLowerCase()} words`.slice(0, 80);

  // Machine-made puzzles go through the same safety check as player-made ones before they get a link.
  const safety = await safetyCheck({ title, noun, paragraph }, dict, deps.safety ?? {});
  if (!allowsLink(safety)) throw new HttpError(422, 'not_allowed');

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = shareCode();
    const row = {
      id: `c-${code.toLowerCase()}`,
      kind: 'custom',
      owner_id: userId,
      share_code: code,
      category: 'Custom',
      title,
      noun,
      text: paragraph,
      dict,
      topic_key: key,
      safety,
    };
    const ins = await deps.db.from('games').insert(row).select(GAME_COLS).single();
    if (!ins.error) return { game: ins.data as GameRow, cached: false };
    if (ins.error.code !== '23505') throw new HttpError(500, 'save_failed');
  }
  throw new HttpError(500, 'save_failed');
}

async function generate(req: Request, deps: Deps) {
  if (!deps.ai) throw new HttpError(503, 'generate_off');
  const body = (await readJson(req)) as { topic?: unknown; background?: unknown; guest?: unknown } | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'bad_request');
  const topic = cleanTopic(body.topic);
  if (!topic) throw new HttpError(400, 'empty_topic');
  if (topic.length > TOPIC_MAX) throw new HttpError(400, 'topic_too_long');
  if (isProfane(topic)) throw new HttpError(422, 'generate_failed');

  const user = await currentUser(deps.db, req);
  // Background making: answer at once with a job. Without the flag the request waits, as it always has.
  if (body.background === true) return startJob(req, deps, topic, user, body.guest);

  await limit(
    deps.db,
    user ? `gen:user:${user.id}` : `gen:ip:${clientIp(req)}`,
    user ? LIMITS.userGeneratePerHour : LIMITS.guestGeneratePerHour,
  );
  const { game, cached } = await makeForTopic(deps, topic, user?.id ?? null);
  return json(cached ? { ...gameOut(game), cached: true } : gameOut(game));
}

// ---------------------------------------------------------------------------
// Background making. Rules and the reason for /run: worker/src/jobs.ts.
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const timing = (deps: Deps): JobTiming => ({ ...JOB, ...deps.job });

async function readJob(deps: Deps, id: string): Promise<JobRow | null> {
  const { data } = await deps.db.from('generate_jobs').select(JOB_COLS).eq('id', id).maybeSingle();
  return (data as JobRow | null) ?? null;
}

/**
 * Waiting to failed, once. `claim`: only if this runner still holds the job. A guest gets the request back when
 * the making failed; the update's own row count makes sure that happens one time only.
 */
async function failJob(deps: Deps, row: JobRow, error: string, claim?: string): Promise<JobRow> {
  let q = deps.db.from('generate_jobs').update({ state: 'failed', error }).eq('id', row.id).eq('state', 'waiting');
  if (claim) q = q.eq('claim_id', claim);
  const { data } = await q.select(JOB_COLS).maybeSingle();
  if (!data) return (await readJob(deps, row.id)) ?? row;
  if (refunds(row, error)) {
    await deps.db.rpc('refund_rate_limit', { p_key: row.refund_key, p_window_seconds: 3600, p_at: row.created_at });
  }
  return data as JobRow;
}

/** A job nobody can finish any more is failed the moment someone looks at it. */
const settle = (deps: Deps, row: JobRow) => (isDead(row, nowOf(deps), timing(deps)) ? failJob(deps, row, 'generate_failed') : Promise.resolve(row));

/** POST /api/generate with background: true. One job per player at a time: a second ask returns the first. */
async function startJob(req: Request, deps: Deps, topic: string, user: User | null, guest: unknown) {
  const ip = clientIp(req);
  const owner = ownerKey(user?.id ?? null, ip, typeof guest === 'string' && GUEST_KEY_RE.test(guest) ? guest : undefined);
  const waiting = async () => {
    const { data } = await deps.db.from('generate_jobs').select(JOB_COLS).eq('owner_key', owner).eq('state', 'waiting').maybeSingle();
    return data ? settle(deps, data as JobRow) : null;
  };
  const first = await waiting();
  if (first?.state === 'waiting') return json(jobOut(first, nowOf(deps), timing(deps)));

  // Counted only now: asking again for the job you already have costs nothing.
  const rateKey = user ? `gen:user:${user.id}` : `gen:ip:${ip}`;
  if (!user) await limit(deps.db, `gentry:ip:${ip}`, LIMITS.guestGenerateTriesPerHour);
  await limit(deps.db, rateKey, user ? LIMITS.userGeneratePerHour : LIMITS.guestGeneratePerHour);

  // A topic made in the last 24 hours is ready at once.
  const cached = await cachedFor(deps, topicKey(topic));
  const ins = await deps.db
    .from('generate_jobs')
    .insert({
      owner_key: owner,
      user_id: user?.id ?? null,
      topic,
      refund_key: user ? null : rateKey,
      ...(cached ? { state: 'done', game_code: cached.share_code } : {}),
    })
    .select(JOB_COLS)
    .single();
  if (ins.error) {
    // Two asks at the same moment: the other one made the job.
    const other = ins.error.code === '23505' ? await waiting() : null;
    if (!other) throw new HttpError(500, 'save_failed');
    return json(jobOut(other, nowOf(deps), timing(deps)));
  }
  return json(jobOut(ins.data as JobRow, nowOf(deps), timing(deps)), cached ? 200 : 202);
}

/** The job behind an id. A signed in player's job answers only to them; a guest's id is its own key. */
async function jobFor(req: Request, deps: Deps, id: string): Promise<JobRow> {
  const row = UUID_RE.test(id) ? await readJob(deps, id) : null;
  if (!row) throw new HttpError(404, 'unknown_job');
  if (row.user_id && (await currentUser(deps.db, req))?.id !== row.user_id) throw new HttpError(404, 'unknown_job');
  return settle(deps, row);
}

/** GET /api/generate/:id */
async function jobState(req: Request, deps: Deps, id: string) {
  return json(jobOut(await jobFor(req, deps, id), nowOf(deps), timing(deps)));
}

/**
 * GET or POST /api/generate/:id/run. Does the work if nobody else is, and answers when it is over. Safe to call
 * as often as you like: the claim in the database lets one runner in, everyone else gets the state back at once.
 */
async function jobRun(req: Request, deps: Deps, id: string) {
  if (!deps.ai) throw new HttpError(503, 'generate_off');
  const row = await jobFor(req, deps, id);
  const t = timing(deps);
  if (row.state !== 'waiting') return json(jobOut(row, nowOf(deps), t));
  await limit(deps.db, `genrun:ip:${clientIp(req)}`, LIMITS.generateRunsPerHour);

  const claimed = await deps.db.rpc('claim_generate_job', { p_id: row.id, p_stale_seconds: Math.ceil(t.staleMs / 1000), p_max_attempts: t.maxAttempts });
  if (claimed.error) throw new HttpError(500, 'save_failed');
  const claim = claimed.data as string | null;
  if (!claim) return json(jobOut((await readJob(deps, row.id)) ?? row, nowOf(deps), t));

  const work = finishJob(deps, row, claim, t);
  // If the player's connection drops just as the model answers, there is still time to save the puzzle.
  deps.waitUntil?.(work.catch(() => undefined));
  return json(jobOut(await work, nowOf(deps), t));
}

async function finishJob(deps: Deps, row: JobRow, claim: string, t: JobTiming): Promise<JobRow> {
  const mine = () => deps.db.from('generate_jobs').update({ claimed_at: new Date().toISOString() }).eq('id', row.id).eq('claim_id', claim).eq('state', 'waiting');
  try {
    const { game, cached } = await withHeartbeat(makeForTopic(deps, row.topic, row.user_id), async () => await mine(), t.heartbeatMs);
    const done = await deps.db
      .from('generate_jobs')
      .update({ state: 'done', game_code: game.share_code })
      .eq('id', row.id)
      .eq('claim_id', claim)
      .eq('state', 'waiting')
      .select(JOB_COLS)
      .maybeSingle();
    if (done.data) return done.data as JobRow;
    // The claim was lost while we worked (another runner took over, or the job was given up on). Do not leave
    // a second puzzle behind.
    if (!cached) await deps.db.from('games').delete().eq('id', game.id);
    return (await readJob(deps, row.id)) ?? row;
  } catch (e) {
    if (e instanceof HttpError && (e.code === 'generate_failed' || e.code === 'not_allowed' || e.code === 'generate_off')) {
      return failJob(deps, row, e.code, claim);
    }
    // The database or something unexpected: let go of the claim so the next run can try again.
    await deps.db.from('generate_jobs').update({ claimed_at: null }).eq('id', row.id).eq('claim_id', claim).eq('state', 'waiting');
    throw e;
  }
}

/** Hourly cron: jobs older than 2 days are deleted. */
export async function pruneJobs(deps: Deps): Promise<void> {
  await deps.db.rpc('prune_generate_jobs');
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

  // The safety check, before the puzzle gets a link. A fail saves nothing.
  const safety = await safetyCheck({ title, noun, paragraph: text }, dict, deps.safety ?? {});
  if (!allowsLink(safety)) throw new HttpError(422, 'not_allowed');

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = shareCode();
    const ins = await deps.db
      .from('games')
      .insert({ id: `c-${code.toLowerCase()}`, kind: 'custom', owner_id: user.id, share_code: code, category: 'Player made', title, noun, text, dict, safety })
      .select(GAME_COLS)
      .single();
    if (!ins.error) return json(gameOut(ins.data));
    if (ins.error.code !== '23505') throw new HttpError(500, 'save_failed');
  }
  throw new HttpError(500, 'save_failed');
}

// ---------------------------------------------------------------------------
// Reports, and the owner page behind them.
// ---------------------------------------------------------------------------

const CODE_RE = /^[A-Za-z2-7]{8}$/;

/**
 * POST /api/puzzles/:code/report. One per player per puzzle, never your own. The third report from different
 * players hides the puzzle, in the same transaction as the count. The answer never says whether it did.
 */
async function reportPuzzle(req: Request, deps: Deps, code: string) {
  const user = await currentUser(deps.db, req);
  if (!user) throw new HttpError(401, 'sign_in_required');
  await limit(deps.db, `report:user:${user.id}`, LIMITS.reportsPerHour);
  if (!CODE_RE.test(code)) throw new HttpError(404, 'unknown_puzzle');
  const r = await deps.db.rpc('report_puzzle', { p_code: code, p_user: user.id });
  if (r.error) throw new HttpError(500, 'save_failed');
  if (r.data === 'missing') throw new HttpError(404, 'unknown_puzzle');
  if (r.data === 'own') throw new HttpError(403, 'own_puzzle');
  return json({ ok: true, again: r.data === 'again' });
}

/** Owner power: a verified session whose user id is in OWNER_USER_IDS. Everyone else sees a 404, as if it were not there. */
async function requireOwner(req: Request, deps: Deps): Promise<User> {
  const user = await currentUser(deps.db, req);
  if (!user || !(deps.owners ?? []).includes(user.id)) throw new HttpError(404, 'not_found');
  return user;
}

/** GET /api/owner/puzzles. Hidden puzzles, newest first. */
async function ownerHidden(req: Request, deps: Deps) {
  await requireOwner(req, deps);
  const r = await deps.db.rpc('hidden_puzzles', { p_limit: 100 });
  if (r.error) throw new HttpError(500, 'server_error');
  return json({ puzzles: Array.isArray(r.data) ? r.data : [] });
}

/** POST /api/owner/puzzles/:code/restore and /remove. */
async function ownerAct(req: Request, deps: Deps, code: string, act: 'restore' | 'remove') {
  await requireOwner(req, deps);
  if (!CODE_RE.test(code)) throw new HttpError(404, 'unknown_puzzle');
  const r = await deps.db.rpc(act === 'restore' ? 'restore_puzzle' : 'remove_puzzle', { p_code: code });
  if (r.error) throw new HttpError(500, 'save_failed');
  if (!r.data) throw new HttpError(404, 'unknown_puzzle');
  return json({ ok: true });
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
    // A room play is never a clean read: a teammate may have found some of the words.
    return json({ verified: true, room: true, found: r.found, total: r.total, hints: r.hints, secs: r.secs, clean: false });
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
    // Clean read, from the replay. It adds nothing to the score.
    clean: r.clean,
  });
  if (ins.error) {
    if (ins.error.code === '23505') throw new HttpError(409, 'already_played');
    throw new HttpError(500, 'save_failed');
  }
  return json({ verified: true, found: r.found, total: r.total, hints: r.hints, misses: r.misses, secs: r.secs, score: r.score, clean: r.clean });
}

// ---------------------------------------------------------------------------
// POST /api/shares
// ---------------------------------------------------------------------------

export const ShareBody = z.object({ game: z.string().regex(/^[a-z0-9-]{2,40}$/) }).strict();

/**
 * One share of one puzzle, for the sponsor report. A count per puzzle per day and nothing else: guests count too,
 * and the session token is never read, so no player is on it.
 */
async function countShare(req: Request, deps: Deps) {
  await limit(deps.db, `share:ip:${clientIp(req)}`, LIMITS.sharesPerHour);
  const parsed = ShareBody.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'bad_request');
  const r = await deps.db.rpc('count_share', { p_game: parsed.data.game });
  if (r.error) throw new HttpError(500, 'save_failed');
  if (!r.data) throw new HttpError(404, 'unknown_game');
  return json({ ok: true });
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
  return json({ title: 'Gazecraft', body: reminderLine(ctx), url });
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
  let m: RegExpMatchArray | null;
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') res = json({ ok: true, generate: !!deps.ai, push: (deps.push && deps.pushKey) || null });
    else if (url.pathname === '/api/generate' && req.method === 'POST') res = await generate(req, deps);
    else if ((m = url.pathname.match(/^\/api\/generate\/([^/]+)$/)) && req.method === 'GET') res = await jobState(req, deps, m[1]!);
    else if ((m = url.pathname.match(/^\/api\/generate\/([^/]+)\/run$/)) && (req.method === 'GET' || req.method === 'POST')) res = await jobRun(req, deps, m[1]!);
    else if ((m = url.pathname.match(/^\/api\/puzzles\/([^/]+)\/report$/)) && req.method === 'POST') res = await reportPuzzle(req, deps, m[1]!);
    else if (url.pathname === '/api/owner/puzzles' && req.method === 'GET') res = await ownerHidden(req, deps);
    else if ((m = url.pathname.match(/^\/api\/owner\/puzzles\/([^/]+)\/(restore|remove)$/)) && req.method === 'POST')
      res = await ownerAct(req, deps, m[1]!, m[2] as 'restore' | 'remove');
    else if (url.pathname === '/api/plays' && req.method === 'POST') res = await plays(req, deps);
    else if (url.pathname === '/api/shares' && req.method === 'POST') res = await countShare(req, deps);
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
