// The Worker's edges: origins, sign in, the rate limit, bodies that are broken, too big or not a case.

import type { SupabaseClient } from '@supabase/supabase-js';
import { stepPuzzle, type Chapter } from '../../src/engine/chapter';
import { buildMirror } from '../../src/engine/mirror';
import { handle } from '../src/app';
import { CHAPTERS } from '../src/caseStep';

const SITE = 'https://lantern-row.pages.dev';
const spoon = CHAPTERS['the-long-spoon'] as Chapter;

type Fake = { user?: boolean; limit?: 'ok' | 'full' | 'down'; saved?: boolean };
function db(f: Fake = {}): SupabaseClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    auth: { getUser: async () => (f.user === false ? { data: { user: null }, error: { message: 'bad' } } : { data: { user: { id: 'u1' } }, error: null }) },
    rpc: async (name: string) => {
      calls.push(name);
      if (name === 'hit_rate_limit') {
        if (f.limit === 'down') return { data: null, error: { message: 'down' } };
        return { data: [{ allowed: f.limit !== 'full', retry_after: 42 }], error: null };
      }
      return f.saved === false ? { data: null, error: { message: 'no' } } : { data: true, error: null };
    },
  } as unknown as SupabaseClient & { calls: string[] };
}

const board = buildMirror(stepPuzzle(spoon, 1)!);
const goodBody = () => ({
  game: { type: 'case', id: 'the-long-spoon', step: 1 },
  log: { events: board.answers.map((a, i) => ({ a: a.spans[0]![0], b: a.spans[0]![1], t: (i + 1) * 2000 })), hints: [], finish: 9000 },
});

function post(body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('https://api.test/api/plays', { method: 'POST', body: text, headers: { Origin: SITE, Authorization: 'Bearer t', 'Content-Type': 'application/json', ...headers } });
}
const run = (req: Request, d = db()) => handle(req, { db: d, origins: [SITE] });
const code = async (res: Response) => ((await res.json()) as { error?: string }).error;

describe('origins', () => {
  it('a site that is not ours is refused, preflight or not', async () => {
    expect((await run(new Request('https://api.test/api/health', { headers: { Origin: 'https://evil.test' } }))).status).toBe(403);
    expect((await run(new Request('https://api.test/api/plays', { method: 'OPTIONS', headers: { Origin: 'https://evil.test' } }))).status).toBe(403);
    expect((await run(new Request('https://api.test/api/plays', { method: 'OPTIONS' }))).status).toBe(403);
  });

  it('our site gets its preflight and its CORS headers, a server call gets none', async () => {
    const pre = await run(new Request('https://api.test/api/plays', { method: 'OPTIONS', headers: { Origin: SITE } }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    const ours = await run(new Request('https://api.test/api/health', { headers: { Origin: SITE } }));
    expect(ours.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    const bare = await run(new Request('https://api.test/api/health'));
    expect(bare.status).toBe(200);
    expect(bare.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('a path or a method that is not there is 404', async () => {
    expect((await run(new Request('https://api.test/api/generate', { method: 'POST', headers: { Origin: SITE } }))).status).toBe(404);
    expect((await run(new Request('https://api.test/api/plays', { headers: { Origin: SITE } }))).status).toBe(404);
    expect((await run(new Request('https://api.test/api/og'))).status).toBe(404);
  });
});

describe('POST /api/plays', () => {
  it('a guest, a token that is not Bearer, and a token that does not verify are all 401', async () => {
    expect(await code(await run(new Request('https://api.test/api/plays', { method: 'POST', body: '{}', headers: { Origin: SITE } })))).toBe('sign_in_required');
    expect(await code(await run(post(goodBody(), { Authorization: 'Basic abc' })))).toBe('bad_token');
    expect(await code(await run(post(goodBody(), { Authorization: 'Bearer ' })))).toBe('bad_token');
    expect(await code(await run(post(goodBody()), db({ user: false })))).toBe('bad_token');
  });

  it('the rate limit: full is 429 with when to try again, down is 503, and nothing is kept either way', async () => {
    const full = db({ limit: 'full' });
    const res = await run(post(goodBody()), full);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    expect(res.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
    expect(full.calls).not.toContain('record_step');
    expect((await run(post(goodBody()), db({ limit: 'down' }))).status).toBe(503);
  });

  it('broken, too big, or shaped wrong is 400 or 413', async () => {
    expect(await code(await run(post('{not json')))).toBe('bad_json');
    expect(await code(await run(post('x'.repeat(70 * 1024))))).toBe('body_too_large');
    expect(await code(await run(post('{}', { 'Content-Length': String(1 << 20) })))).toBe('body_too_large');
    const extra = { ...goodBody(), score: 9999 };
    expect(await code(await run(post(extra)))).toBe('bad_request');
    const puzzle = { ...goodBody(), game: { type: 'hidden-words', id: 'the-long-spoon', step: 1 } };
    expect(await code(await run(post(puzzle)))).toBe('bad_request');
    for (const step of [0, 13, 1.5, '1']) expect(await code(await run(post({ ...goodBody(), game: { type: 'case', id: 'the-long-spoon', step } })))).toBe('bad_request');
    for (const id of ['A', '../x', 'a'.repeat(41)]) expect(await code(await run(post({ ...goodBody(), game: { type: 'case', id, step: 1 } })))).toBe('bad_request');
    const late = goodBody();
    late.log.finish = -1;
    expect(await code(await run(post(late)))).toBe('bad_request');
  });

  it('a case that is not written is 404, and a step past its end is 404', async () => {
    expect(await code(await run(post({ ...goodBody(), game: { type: 'case', id: 'no-such-case', step: 1 } })))).toBe('unknown_game');
    expect((await run(post({ ...goodBody(), game: { type: 'case', id: 'the-long-spoon', step: 12 } }))).status).toBe(404);
  });

  it('a good step is checked and kept; when keeping fails it says so', async () => {
    const ok = db();
    const res = await run(post(goodBody()), ok);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verified: true, step: 1, found: 4, total: 4, stars: 3 });
    expect(ok.calls).toEqual(['hit_rate_limit', 'record_step']);
    expect(await code(await run(post(goodBody()), db({ saved: false })))).toBe('save_failed');
  });
});
