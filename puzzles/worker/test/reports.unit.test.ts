// POST /api/puzzles/:code/report and the owner gate, with a database that only records what it was asked.
// The count that hides a puzzle at 3 lives in the database (report_puzzle); moderation.db.test.ts covers it.

import type { SupabaseClient } from '@supabase/supabase-js';
import { handle, LIMITS, type Deps } from '../src/app';

const APP = 'http://localhost:5173';
const CODE = 'ABCDEFGH';

/** A stand-in for the service client: tokens "t-<id>" are users, rpc answers come from `answers`. */
function fakeDb(answers: Record<string, unknown> = {}, limited = false) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db = {
    auth: {
      getUser: async (token: string) => (token.startsWith('t-') ? { data: { user: { id: token.slice(2) } }, error: null } : { data: { user: null }, error: new Error('bad') }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'hit_rate_limit') return { data: [{ allowed: !limited, retry_after: 120 }], error: null };
      return { data: answers[fn] ?? null, error: null };
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

const call = (deps: Deps, method: string, path: string, user?: string) =>
  handle(new Request(`http://api.test${path}`, { method, headers: { Origin: APP, ...(user ? { Authorization: `Bearer t-${user}` } : {}) } }), deps);

const depsOf = (db: SupabaseClient, owners: string[] = []): Deps => ({ db, ai: null, origins: [APP], owners });

describe('POST /api/puzzles/:code/report', () => {
  it('guests are refused before anything is counted', async () => {
    const { db, calls } = fakeDb();
    const r = await call(depsOf(db), 'POST', `/api/puzzles/${CODE}/report`);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: 'sign_in_required' });
    expect(calls).toEqual([]);
  });

  it('a forged token is refused', async () => {
    const { db } = fakeDb();
    const r = await handle(new Request(`http://api.test/api/puzzles/${CODE}/report`, { method: 'POST', headers: { Authorization: 'Bearer nope' } }), depsOf(db));
    expect(r.status).toBe(401);
  });

  it('is rate limited per player, like the other endpoints', async () => {
    const { db, calls } = fakeDb({}, true);
    const r = await call(depsOf(db), 'POST', `/api/puzzles/${CODE}/report`, 'ada');
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('120');
    expect(calls).toEqual([{ fn: 'hit_rate_limit', args: { p_key: 'report:user:ada', p_max: LIMITS.reportsPerHour, p_window_seconds: 3600 } }]);
  });

  it('the reporter is the verified user, never a value from the request', async () => {
    const { db, calls } = fakeDb({ report_puzzle: 'reported' });
    const r = await call(depsOf(db), 'POST', `/api/puzzles/${CODE}/report?user=someone-else`, 'ada');
    expect(r.status).toBe(200);
    expect(calls.at(-1)).toEqual({ fn: 'report_puzzle', args: { p_code: CODE, p_user: 'ada' } });
  });

  it.each([
    ['reported', 200, { ok: true, again: false }],
    // The third report hides the puzzle. The reporter is not told: the answer is the same.
    ['hidden', 200, { ok: true, again: false }],
    ['again', 200, { ok: true, again: true }],
    ['own', 403, { error: 'own_puzzle' }],
    ['missing', 404, { error: 'unknown_puzzle' }],
  ])('database says %s', async (answer, status, body) => {
    const { db } = fakeDb({ report_puzzle: answer });
    const r = await call(depsOf(db), 'POST', `/api/puzzles/${CODE}/report`, 'ada');
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual(body);
  });

  it('a code of the wrong shape never reaches the database', async () => {
    const { db, calls } = fakeDb({ report_puzzle: 'reported' });
    const r = await call(depsOf(db), 'POST', '/api/puzzles/not-a-code/report', 'ada');
    expect(r.status).toBe(404);
    expect(calls.some((c) => c.fn === 'report_puzzle')).toBe(false);
  });
});

describe('owner endpoints', () => {
  const paths: Array<[string, string]> = [
    ['GET', '/api/owner/puzzles'],
    ['POST', `/api/owner/puzzles/${CODE}/restore`],
    ['POST', `/api/owner/puzzles/${CODE}/remove`],
  ];

  it.each(paths)('%s %s: 404 for guests, for players, and for everyone when no owner is set', async (method, path) => {
    const { db, calls } = fakeDb({ hidden_puzzles: [], restore_puzzle: true, remove_puzzle: true });
    expect((await call(depsOf(db, ['boss']), method, path)).status).toBe(404);
    expect((await call(depsOf(db, ['boss']), method, path, 'ada')).status).toBe(404);
    expect((await call(depsOf(db, []), method, path, 'boss')).status).toBe(404);
    expect((await call({ db, ai: null, origins: [APP] }, method, path, 'boss')).status).toBe(404);
    expect(calls).toEqual([]);
  });

  it('an owner lists, restores and removes', async () => {
    const row = { code: CODE, title: 'T', hidden_at: '2026-10-09T10:00:00Z' };
    const { db, calls } = fakeDb({ hidden_puzzles: [row], restore_puzzle: true, remove_puzzle: true });
    const list = await call(depsOf(db, ['boss']), 'GET', '/api/owner/puzzles', 'boss');
    expect(await list.json()).toEqual({ puzzles: [row] });
    expect(await (await call(depsOf(db, ['boss']), 'POST', `/api/owner/puzzles/${CODE}/restore`, 'boss')).json()).toEqual({ ok: true });
    expect(await (await call(depsOf(db, ['boss']), 'POST', `/api/owner/puzzles/${CODE}/remove`, 'boss')).json()).toEqual({ ok: true });
    expect(calls.map((c) => c.fn)).toEqual(['hidden_puzzles', 'restore_puzzle', 'remove_puzzle']);
  });

  it('a puzzle that is not hidden cannot be restored or removed', async () => {
    const { db } = fakeDb({ restore_puzzle: false, remove_puzzle: false });
    for (const act of ['restore', 'remove']) {
      const r = await call(depsOf(db, ['boss']), 'POST', `/api/owner/puzzles/${CODE}/${act}`, 'boss');
      expect(r.status).toBe(404);
      expect(await r.json()).toEqual({ error: 'unknown_puzzle' });
    }
  });
});
