// The generate job state machine, apart from the database.

import { GUEST_KEY_RE, JOB, canClaim, claimIsLive, isDead, jobOut, ownerKey, refunds, withHeartbeat, type JobRow } from '../src/jobs';

const NOW = new Date('2026-10-09T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const job = (over: Partial<JobRow> = {}): JobRow => ({
  id: '11111111-2222-3333-4444-555555555555',
  owner_key: 'ip:203.0.113.9:abcdefgh',
  user_id: null,
  topic: 'space',
  state: 'waiting',
  game_code: null,
  error: null,
  refund_key: 'gen:ip:203.0.113.9',
  claim_id: null,
  claimed_at: null,
  attempts: 0,
  created_at: ago(1000),
  ...over,
});

describe('who a job belongs to', () => {
  it('a signed in player by id, wherever they are', () => {
    expect(ownerKey('u-1', '203.0.113.9', 'abcdefgh')).toBe('user:u-1');
    expect(ownerKey('u-1', '198.51.100.1')).toBe('user:u-1');
  });

  it('a guest by address and browser key, so two guests behind one address do not share a job', () => {
    expect(ownerKey(null, '203.0.113.9', 'abcdefgh')).toBe('ip:203.0.113.9:abcdefgh');
    expect(ownerKey(null, '203.0.113.9', 'zzzzzzzz')).not.toBe(ownerKey(null, '203.0.113.9', 'abcdefgh'));
    expect(ownerKey(null, '203.0.113.9')).toBe('ip:203.0.113.9:');
    expect(ownerKey(null, 'x'.repeat(400)).length).toBeLessThanOrEqual(200);
  });

  it('the browser key has one shape', () => {
    expect(GUEST_KEY_RE.test('abcdefgh')).toBe(true);
    expect(GUEST_KEY_RE.test('short')).toBe(false);
    expect(GUEST_KEY_RE.test("abcdefgh'; drop")).toBe(false);
    expect(GUEST_KEY_RE.test('a'.repeat(65))).toBe(false);
  });
});

describe('one runner per job', () => {
  it('a new job can be claimed', () => {
    expect(canClaim(job(), NOW)).toBe(true);
    expect(jobOut(job(), NOW)).toEqual({ id: job().id, state: 'waiting', code: null, error: null, run: true });
  });

  it('a job with a live claim cannot: its runner is still renewing it', () => {
    const j = job({ claim_id: 'c', claimed_at: ago(JOB.staleMs - 1), attempts: 1 });
    expect(claimIsLive(j, NOW)).toBe(true);
    expect(canClaim(j, NOW)).toBe(false);
    expect(jobOut(j, NOW)).toEqual({ id: j.id, state: 'waiting', code: null, error: null, run: false });
  });

  it('a claim that stopped being renewed is stale: the page died, the next visit runs it again', () => {
    const j = job({ claim_id: 'c', claimed_at: ago(JOB.staleMs), attempts: 1 });
    expect(claimIsLive(j, NOW)).toBe(false);
    expect(canClaim(j, NOW)).toBe(true);
    expect(jobOut(j, NOW).run).toBe(true);
  });

  it('a heartbeat keeps a long run alive well inside the stale time', () => {
    expect(JOB.heartbeatMs * 2).toBeLessThan(JOB.staleMs);
  });

  it('a finished job is never claimed', () => {
    expect(canClaim(job({ state: 'done', game_code: 'ABCDEFGH' }), NOW)).toBe(false);
    expect(canClaim(job({ state: 'failed', error: 'generate_failed' }), NOW)).toBe(false);
  });

  it('after 3 attempts nobody may try again', () => {
    expect(canClaim(job({ attempts: JOB.maxAttempts - 1 }), NOW)).toBe(true);
    expect(canClaim(job({ attempts: JOB.maxAttempts }), NOW)).toBe(false);
  });
});

describe('jobs that will never finish', () => {
  it('too old', () => {
    expect(isDead(job({ created_at: ago(JOB.ttlMs - 1) }), NOW)).toBe(false);
    expect(isDead(job({ created_at: ago(JOB.ttlMs) }), NOW)).toBe(true);
    // Even with a runner still on it: 15 minutes is longer than any run.
    expect(isDead(job({ created_at: ago(JOB.ttlMs), claimed_at: ago(10), attempts: 1 }), NOW)).toBe(true);
  });

  it('every attempt used and the last runner gone', () => {
    expect(isDead(job({ attempts: JOB.maxAttempts, claimed_at: ago(JOB.staleMs) }), NOW)).toBe(true);
    // The third runner is still working: leave it be.
    expect(isDead(job({ attempts: JOB.maxAttempts, claimed_at: ago(1000) }), NOW)).toBe(false);
  });

  it('a finished job is not dead, however old', () => {
    expect(isDead(job({ state: 'done', game_code: 'ABCDEFGH', created_at: ago(JOB.ttlMs * 9) }), NOW)).toBe(false);
  });
});

describe('what the client sees', () => {
  it('done carries the puzzle code; failed carries a plain error code; nothing else leaks', () => {
    expect(jobOut(job({ state: 'done', game_code: 'ABCDEFGH' }), NOW)).toEqual({ id: job().id, state: 'done', code: 'ABCDEFGH', error: null, run: false });
    expect(jobOut(job({ state: 'failed', error: 'not_allowed' }), NOW)).toEqual({ id: job().id, state: 'failed', code: null, error: 'not_allowed', run: false });
    for (const j of [job(), job({ state: 'done', game_code: 'ABCDEFGH' }), job({ state: 'failed', error: 'generate_failed' })]) {
      const out = jobOut(j, NOW) as Record<string, unknown>;
      for (const secret of ['owner_key', 'user_id', 'refund_key', 'claim_id', 'topic']) expect(out).not.toHaveProperty(secret);
    }
  });
});

describe('empty states', () => {
  it('every field is always present: null or false, never missing', () => {
    for (const j of [job(), job({ state: 'done', game_code: 'ABCDEFGH' }), job({ state: 'failed', error: 'generate_failed' })]) {
      const out = jobOut(j, NOW);
      expect(Object.keys(out).sort()).toEqual(['code', 'error', 'id', 'run', 'state']);
      expect(JSON.parse(JSON.stringify(out))).toEqual(out);
    }
  });

  it('a failed row with no error recorded still names one', () => {
    expect(jobOut(job({ state: 'failed', error: null }), NOW).error).toBe('generate_failed');
  });

  it('a job that has never been claimed has no live claim', () => {
    expect(claimIsLive(job({ claimed_at: null }), NOW)).toBe(false);
  });
});

describe('giving the request back', () => {
  it('a guest gets it back when the making failed', () => {
    expect(refunds(job(), 'generate_failed')).toBe(true);
  });

  it('not when the safety check refused the puzzle', () => {
    expect(refunds(job(), 'not_allowed')).toBe(false);
  });

  it('a signed in player has no counter on the job', () => {
    expect(refunds(job({ refund_key: null, user_id: 'u-1' }), 'generate_failed')).toBe(false);
  });
});

describe('withHeartbeat', () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('beats while the work runs, stops when it ends, and returns its result', async () => {
    let beats = 0;
    const out = await withHeartbeat(sleep(400).then(() => 'puzzle'), async () => void beats++, 20);
    expect(out).toBe('puzzle');
    expect(beats).toBeGreaterThanOrEqual(2);
    const then = beats;
    await sleep(60);
    expect(beats).toBe(then);
  });

  it('work that is quick never beats', async () => {
    let beats = 0;
    expect(await withHeartbeat(Promise.resolve(7), async () => void beats++, 1000)).toBe(7);
    expect(beats).toBe(0);
  });

  it('a failed beat does not stop the work, and failed work still throws', async () => {
    const out = await withHeartbeat(sleep(50).then(() => 'ok'), () => Promise.reject(new Error('db down')), 10);
    expect(out).toBe('ok');
    const boom = sleep(30).then(() => {
      throw new Error('model failed');
    });
    await expect(withHeartbeat(boom, async () => undefined, 10)).rejects.toThrow('model failed');
  });
});
