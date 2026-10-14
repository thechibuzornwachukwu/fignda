// Background making: the rules of a generate job, apart from the database and the network.
//
// A Worker may keep going for about 30 seconds after it has answered (`waitUntil`). A puzzle takes 1 to 2.5
// minutes, so the slow call cannot hang off the POST that created the job. Instead:
//   POST /api/generate {background: true}  writes the job and answers at once
//   GET  /api/generate/:id/run             an ordinary long request that does the work, one runner per job
//   GET  /api/generate/:id                 the state, asked every 5 seconds
// The runner renews its claim while it works. If the page dies the request dies with it, the claim stops being
// renewed, and the next visit sees `run: true` and opens /run again.

export type JobState = 'waiting' | 'done' | 'failed';

export type JobRow = {
  id: string;
  owner_key: string;
  user_id: string | null;
  topic: string;
  state: JobState;
  game_code: string | null;
  error: string | null;
  refund_key: string | null;
  claim_id: string | null;
  claimed_at: string | null;
  attempts: number;
  created_at: string;
};

export const JOB_COLS = 'id, owner_key, user_id, topic, state, game_code, error, refund_key, claim_id, claimed_at, attempts, created_at';

export const JOB = {
  /** A runner renews its claim this often. */
  heartbeatMs: 20_000,
  /** A claim not renewed for this long belongs to a runner that has gone. */
  staleMs: 60_000,
  /** A job still waiting after this long is given up on, so it cannot block its player for ever. */
  ttlMs: 15 * 60_000,
  /** How many runners may take one job in turn. */
  maxAttempts: 3,
} as const;

export type JobTiming = { heartbeatMs: number; staleMs: number; ttlMs: number; maxAttempts: number };

/**
 * What a client sees. Every field is always there: `code` is null until done, `error` is null unless failed,
 * and `run` is true only while the job waits with nobody working on it (open /run).
 */
export type JobOut = { id: string; state: JobState; code: string | null; error: string | null; run: boolean };

/** Who a job belongs to. A signed in player by id; a guest by address and the key their browser keeps. */
export function ownerKey(userId: string | null, ip: string, guest?: string): string {
  return userId ? `user:${userId}` : `ip:${ip}:${guest ?? ''}`.slice(0, 200);
}

export const GUEST_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function claimIsLive(row: Pick<JobRow, 'claimed_at'>, now: Date, t: JobTiming = JOB): boolean {
  return row.claimed_at != null && now.getTime() - Date.parse(row.claimed_at) < t.staleMs;
}

/** The same rule as claim_generate_job() in the database, which is the one that decides. */
export function canClaim(row: Pick<JobRow, 'state' | 'claimed_at' | 'attempts'>, now: Date, t: JobTiming = JOB): boolean {
  return row.state === 'waiting' && row.attempts < t.maxAttempts && !claimIsLive(row, now, t);
}

/**
 * A waiting job that will never finish: too old, or every attempt used and the last runner gone.
 * It is marked failed the next time anyone looks at it.
 */
export function isDead(row: Pick<JobRow, 'state' | 'claimed_at' | 'attempts' | 'created_at'>, now: Date, t: JobTiming = JOB): boolean {
  if (row.state !== 'waiting') return false;
  if (now.getTime() - Date.parse(row.created_at) >= t.ttlMs) return true;
  return row.attempts >= t.maxAttempts && !claimIsLive(row, now, t);
}

export function jobOut(row: JobRow, now: Date, t: JobTiming = JOB): JobOut {
  if (row.state === 'done') return { id: row.id, state: 'done', code: row.game_code, error: null, run: false };
  if (row.state === 'failed') return { id: row.id, state: 'failed', code: null, error: row.error ?? 'generate_failed', run: false };
  return { id: row.id, state: 'waiting', code: null, error: null, run: canClaim(row, now, t) };
}

/**
 * Whether a failure hands the request back. Guests only (their jobs carry the counter they were counted on),
 * and only when the making itself failed. A puzzle refused by the safety check stays counted.
 */
export function refunds(row: Pick<JobRow, 'refund_key'>, error: string): boolean {
  return row.refund_key != null && error === 'generate_failed';
}

/** Runs `beat` every `everyMs` until `work` settles. A beat that fails is ignored: the work matters more. */
export async function withHeartbeat<T>(work: Promise<T>, beat: () => Promise<unknown>, everyMs: number): Promise<T> {
  let over = false;
  const settled = work.then(
    () => {
      over = true;
    },
    () => {
      over = true;
    },
  );
  while (!over) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, everyMs);
    });
    await Promise.race([settled, tick]);
    clearTimeout(timer);
    if (!over) await beat().catch(() => undefined);
  }
  return work;
}
