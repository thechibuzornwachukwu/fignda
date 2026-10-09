// Empty and missing things: a well-formed empty answer or a clean 404, never undefined and never a 500.
// The database here holds nothing at all.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiGenerate } from '../src/ai';
import { handle, type Deps } from '../src/app';
import { safetyCheck } from '../src/safety';

const APP = 'http://localhost:5173';
const ID = '11111111-2222-3333-4444-555555555555';

/** Every table is empty, every function answers `rpcData`. Tokens "t-<id>" are users. */
function emptyDb(rpcData: unknown = null, limited = false) {
  const chain: Record<string, unknown> = {};
  for (const k of ['select', 'eq', 'is', 'gte', 'order', 'limit', 'insert', 'update', 'delete', 'in']) chain[k] = () => chain;
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.single = async () => ({ data: null, error: { code: 'PGRST116' } });
  return {
    auth: { getUser: async (t: string) => (t.startsWith('t-') ? { data: { user: { id: t.slice(2) } }, error: null } : { data: { user: null }, error: new Error('bad') }) },
    from: () => chain,
    rpc: async (fn: string) => (fn === 'hit_rate_limit' ? { data: [{ allowed: !limited, retry_after: 90 }], error: null } : { data: rpcData, error: null }),
  } as unknown as SupabaseClient;
}

const ai: AiGenerate = async () => null;
const depsOf = (db: SupabaseClient, more: Partial<Deps> = {}): Deps => ({ db, ai, origins: [APP], ...more });
const call = (deps: Deps, method: string, path: string, user?: string, body?: unknown) =>
  handle(
    new Request(`http://api.test${path}`, {
      method,
      headers: { Origin: APP, ...(user ? { Authorization: `Bearer t-${user}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    deps,
  );

/** The usual error shape: one plain code, as JSON, with the CORS header so the page can read it. */
async function expectError(r: Response, status: number, error: string) {
  expect(r.status).toBe(status);
  expect(r.headers.get('Content-Type')).toContain('application/json');
  expect(r.headers.get('Access-Control-Allow-Origin')).toBe(APP);
  expect(await r.json()).toEqual({ error });
}

describe('no job', () => {
  it.each([
    ['an id nobody has', ID],
    ['an id of the wrong shape', 'nope'],
    ['an empty-looking id', '%20'],
  ])('%s: 404 unknown_job for the state and for the run', async (_, id) => {
    const deps = depsOf(emptyDb());
    await expectError(await call(deps, 'GET', `/api/generate/${id}`), 404, 'unknown_job');
    await expectError(await call(deps, 'GET', `/api/generate/${id}/run`), 404, 'unknown_job');
    await expectError(await call(deps, 'POST', `/api/generate/${id}/run`), 404, 'unknown_job');
  });

  it('no id at all is not a route', async () => {
    await expectError(await call(depsOf(emptyDb()), 'GET', '/api/generate/'), 404, 'not_found');
    await expectError(await call(depsOf(emptyDb()), 'GET', '/api/generate'), 404, 'not_found');
  });
});

describe('no puzzle', () => {
  it('reporting a code nobody has: 404 unknown_puzzle', async () => {
    await expectError(await call(depsOf(emptyDb('missing')), 'POST', '/api/puzzles/ABCDEFGH/report', 'ada'), 404, 'unknown_puzzle');
    await expectError(await call(depsOf(emptyDb('missing')), 'POST', '/api/puzzles/x/report', 'ada'), 404, 'unknown_puzzle');
  });

  it('a first report says plainly that it was not a repeat', async () => {
    const r = await call(depsOf(emptyDb('reported')), 'POST', '/api/puzzles/ABCDEFGH/report', 'ada');
    expect(await r.json()).toEqual({ ok: true, again: false });
  });

  it('restoring or removing a code nobody has: 404 unknown_puzzle', async () => {
    const deps = depsOf(emptyDb(false), { owners: ['boss'] });
    await expectError(await call(deps, 'POST', '/api/owner/puzzles/ABCDEFGH/restore', 'boss'), 404, 'unknown_puzzle');
    await expectError(await call(deps, 'POST', '/api/owner/puzzles/ABCDEFGH/remove', 'boss'), 404, 'unknown_puzzle');
    await expectError(await call(deps, 'POST', '/api/owner/puzzles/x/remove', 'boss'), 404, 'unknown_puzzle');
  });
});

describe('nothing hidden', () => {
  it.each([
    ['an empty list', []],
    ['null', null],
    ['nothing', undefined],
  ])('the database answers %s: the owner gets an empty array', async (_, data) => {
    const r = await call(depsOf(emptyDb(data), { owners: ['boss'] }), 'GET', '/api/owner/puzzles', 'boss');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ puzzles: [] });
  });
});

describe('no plays', () => {
  it('a play on a game that does not exist: 404 unknown_game', async () => {
    const body = { game: { type: 'game', id: 'nope' }, log: { events: [], hints: [], finish: 0 } };
    await expectError(await call(depsOf(emptyDb()), 'POST', '/api/plays', 'ada', body), 404, 'unknown_game');
  });
});

describe('nothing to check', () => {
  it('a puzzle with no hidden words and no noun is still checked without a throw', async () => {
    expect(await safetyCheck({ title: '', paragraph: '' }, [])).toBe('unchecked');
    expect(await safetyCheck({ title: '', paragraph: '' }, [], { ai: null, fallback: [] })).toBe('unchecked');
    expect(await safetyCheck({ title: 'T', paragraph: 'P' }, [], { ai: { run: async () => ({ response: 'safe' }) } })).toBe('passed');
  });
});

describe('429', () => {
  it('Retry-After is exposed, so the page can read when to try again', async () => {
    const r = await call(depsOf(emptyDb(null, true)), 'POST', '/api/puzzles/ABCDEFGH/report', 'ada');
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('90');
    expect(r.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
    expect(await r.json()).toEqual({ error: 'rate_limited' });
  });

  it('a request with no Origin (not a browser) gets no CORS headers at all', async () => {
    const r = await handle(new Request('http://api.test/api/health'), depsOf(emptyDb()));
    expect(r.headers.get('Access-Control-Expose-Headers')).toBeNull();
  });
});
