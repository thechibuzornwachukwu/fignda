// POST /api/shares, with a database that only records what it was asked.
// The count itself lives in the database (count_share); supabase/tests/sponsorReport.test.ts covers it.

import type { SupabaseClient } from '@supabase/supabase-js';
import { handle, LIMITS, type Deps } from '../src/app';

const APP = 'http://localhost:5173';

/** A stand-in for the service client. `getUser` throws: this endpoint must never look at a session. */
function fakeDb(counted: boolean | null = true, limited = false) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db = {
    auth: {
      getUser: async () => {
        throw new Error('a share must not read the session');
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

const post = (deps: Deps, body: unknown, headers: Record<string, string> = {}) =>
  handle(
    new Request('http://api.test/api/shares', {
      method: 'POST',
      headers: { Origin: APP, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    deps,
  );

describe('POST /api/shares', () => {
  it('counts a share for a guest, with the puzzle and nothing else', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(calls).toEqual([
      { fn: 'hit_rate_limit', args: { p_key: 'share:ip:203.0.113.7', p_max: LIMITS.sharesPerHour, p_window_seconds: 3600 } },
      { fn: 'count_share', args: { p_game: 'bible' } },
    ]);
  });

  it('never reads a session, so no player is on the count', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible' }, { Authorization: 'Bearer t-ada' });
    expect(r.status).toBe(200);
    expect(calls.at(-1)).toEqual({ fn: 'count_share', args: { p_game: 'bible' } });
  });

  it('is limited per address, before anything is counted', async () => {
    const { db, calls } = fakeDb(true, true);
    const r = await post(depsOf(db), { game: 'bible' });
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('90');
    expect(calls.some((c) => c.fn === 'count_share')).toBe(false);
  });

  it('a puzzle that does not exist is 404', async () => {
    const { db } = fakeDb(false);
    const r = await post(depsOf(db), { game: 'no-such-game' });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'unknown_game' });
  });

  it.each([
    ['no game', {}],
    ['an id of the wrong shape', { game: 'Bible!' }],
    ['an id that is too long', { game: 'a'.repeat(41) }],
    ['a number', { game: 7 }],
    ['an extra field', { game: 'bible', n: 500 }],
    ['a list', [{ game: 'bible' }]],
  ])('%s never reaches the count', async (_name, body) => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), body);
    expect(r.status).toBe(400);
    expect(calls.some((c) => c.fn === 'count_share')).toBe(false);
  });

  it('a body that is not JSON is refused', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), 'game=bible');
    expect(r.status).toBe(400);
    expect(calls.some((c) => c.fn === 'count_share')).toBe(false);
  });

  it('says so when the count could not be saved', async () => {
    const { db } = fakeDb(null);
    const r = await post(depsOf(db), { game: 'bible' });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: 'save_failed' });
  });

  it('another site cannot count a share', async () => {
    const { db, calls } = fakeDb();
    const r = await post(depsOf(db), { game: 'bible' }, { Origin: 'https://elsewhere.example' });
    expect(r.status).toBe(403);
    expect(calls).toEqual([]);
  });
});
