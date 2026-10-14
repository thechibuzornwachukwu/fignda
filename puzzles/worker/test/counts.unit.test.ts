// POST /api/counts, with a database that only records what it was asked.
// The count itself lives in the database (count_event); supabase/tests/sponsorReport.test.ts covers it.

import type { SupabaseClient } from '@supabase/supabase-js';
import { COUNT_KINDS, handle, LIMITS, type Deps } from '../src/app';

const APP = 'http://localhost:5173';

/** A stand-in for the service client. `getUser` throws: this endpoint must never look at a session. */
function fakeDb(counted: boolean | null = true, limited = false) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db = {
    auth: {
      getUser: async () => {
        throw new Error('a count must not read the session');
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'hit_rate_limit') return { data: [{ allowed: !limited, retry_after: 90 }], error: null };
      return counted === null ? { data: null, error: new Error('down') } : { data: counted, error: null };
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

const depsOf = (db: SupabaseClient): Deps => ({ db, ai: null, origins: [APP] });

const post = (deps: Deps, body: unknown, headers: Record<string, string> = {}, path = '/api/counts') =>
  handle(
    new Request(`http://api.test${path}`, {
      method: 'POST',
      headers: { Origin: APP, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    deps,
  );

describe('POST /api/counts', () => {
  it.each(COUNT_KINDS)('counts a %s for a guest, with the puzzle and the kind and nothing else', async (kind) => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible', kind });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(calls).toEqual([
      { fn: 'hit_rate_limit', args: { p_key: 'count:ip:203.0.113.7', p_max: LIMITS.countsPerHour, p_window_seconds: 3600 } },
      { fn: 'count_event', args: { p_game: 'bible', p_kind: kind } },
    ]);
  });

  it('never reads a session, so no player is on the count', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible', kind: 'end' }, { Authorization: 'Bearer t-ada' });
    expect(r.status).toBe(200);
    expect(calls.at(-1)).toEqual({ fn: 'count_event', args: { p_game: 'bible', p_kind: 'end' } });
  });

  it('is limited per address, before anything is counted', async () => {
    const { db, calls } = fakeDb(true, true);
    const r = await post(depsOf(db), { game: 'bible', kind: 'start' });
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('90');
    expect(calls.some((c) => c.fn === 'count_event')).toBe(false);
  });

  it('a puzzle that does not exist is 404', async () => {
    const { db } = fakeDb(false);
    const r = await post(depsOf(db), { game: 'no-such-game', kind: 'start' });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'unknown_game' });
  });

  it.each([
    ['no game', { kind: 'start' }],
    ['no kind', { game: 'bible' }],
    ['a kind that is not one', { game: 'bible', kind: 'open' }],
    ['an id of the wrong shape', { game: 'Bible!', kind: 'start' }],
    ['an id that is too long', { game: 'a'.repeat(41), kind: 'start' }],
    ['a number', { game: 7, kind: 'start' }],
    ['an extra field', { game: 'bible', kind: 'start', n: 500 }],
    ['a list', [{ game: 'bible', kind: 'start' }]],
  ])('%s never reaches the count', async (_name, body) => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), body);
    expect(r.status).toBe(400);
    expect(calls.some((c) => c.fn === 'count_event')).toBe(false);
  });

  it('a body that is not JSON is refused', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), 'game=bible');
    expect(r.status).toBe(400);
    expect(calls.some((c) => c.fn === 'count_event')).toBe(false);
  });

  it('says so when the count could not be saved', async () => {
    const { db } = fakeDb(null);
    const r = await post(depsOf(db), { game: 'bible', kind: 'share' });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: 'save_failed' });
  });

  it('another site cannot add to a count', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible', kind: 'start' }, { Origin: 'https://elsewhere.example' });
    expect(r.status).toBe(403);
    expect(calls).toEqual([]);
  });
});

describe('POST /api/shares, for a page loaded before /api/counts existed', () => {
  it('counts a share', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible' }, {}, '/api/shares');
    expect(r.status).toBe(200);
    expect(calls.at(-1)).toEqual({ fn: 'count_event', args: { p_game: 'bible', p_kind: 'share' } });
  });

  it('cannot be used to count anything else', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible', kind: 'start' }, {}, '/api/shares');
    expect(r.status).toBe(400);
    expect(calls.some((c) => c.fn === 'count_event')).toBe(false);
  });
});
