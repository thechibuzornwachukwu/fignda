// Background making against the local Supabase stack, with a fake AI (no network, no cost).

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getGameDef } from '../../src/games/catalog';
import { makeUser, type TestUser } from '../../supabase/tests/helpers';
import type { AiGenerate, WorkersAi } from '../src/ai';
import { handle, LIMITS, type Deps } from '../src/app';
import { JOB, type JobOut } from '../src/jobs';

const APP = 'http://localhost:5173';
const db = createClient(process.env.SB_URL!, process.env.SB_SERVICE!, { auth: { persistSession: false } });
const anon = createClient(process.env.SB_URL!, process.env.SB_ANON!, { auth: { persistSession: false } });

const science = getGameDef('science')!;
const GOOD = JSON.stringify({ title: 'Lab day', paragraph: science.text, words: science.dict.slice(0, 12) });

function fakeAi(reply: string | null = GOOD, ms = 0) {
  const calls: string[] = [];
  const ai: AiGenerate = async (topic) => {
    calls.push(topic);
    if (ms) await new Promise((r) => setTimeout(r, ms));
    return reply;
  };
  return { ai, calls };
}

const deps = (ai: AiGenerate | null, more: Partial<Deps> = {}): Deps => ({ db, ai, origins: [APP], ...more });
const topic = () => `jobs ${randomUUID().slice(0, 6)}`;

/** One guest: an address and the key their browser keeps. */
const guest = () => ({ ip: `203.0.113.${randomUUID()}`, key: randomUUID().replace(/-/g, '') });
type Who = { ip: string; key?: string; user?: TestUser };

function req(method: string, path: string, who: Who, body?: unknown) {
  const headers: Record<string, string> = { Origin: APP, 'CF-Connecting-IP': who.ip };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (who.user) headers.Authorization = `Bearer ${who.user.token}`;
  return new Request(`http://api.test${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

const start = (d: Deps, who: Who, t = topic()) => handle(req('POST', '/api/generate', who, { topic: t, background: true, ...(who.key ? { guest: who.key } : {}) }), d);
const state = async (d: Deps, who: Who, id: string) => (await (await handle(req('GET', `/api/generate/${id}`, who), d)).json()) as JobOut;
const run = async (d: Deps, who: Who, id: string) => (await (await handle(req('GET', `/api/generate/${id}/run`, who), d)).json()) as JobOut;
const counted = async (key: string) => ((await db.from('rate_limits').select('count').eq('key', key)).data ?? []).reduce((n, r) => n + (r.count as number), 0);
const rowOf = async (id: string) => (await db.from('generate_jobs').select('*').eq('id', id).single()).data as Record<string, unknown>;

describe('POST /api/generate, background', () => {
  it('answers at once with a job and does not call the model', async () => {
    const { ai, calls } = fakeAi();
    const who = guest();
    const r = await start(deps(ai), who);
    expect(r.status).toBe(202);
    const job = (await r.json()) as JobOut;
    expect(job).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), state: 'waiting', code: null, error: null, run: true });
    expect(calls).toEqual([]);
    expect(await state(deps(ai), who, job.id)).toEqual(job);
  });

  it('the same checks as before: off without a provider, bad topics refused', async () => {
    const who = guest();
    expect((await start(deps(null), who)).status).toBe(503);
    expect((await start(deps(fakeAi().ai), who, '')).status).toBe(400);
    expect((await start(deps(fakeAi().ai), who, 'x'.repeat(61))).status).toBe(400);
    expect((await start(deps(fakeAi().ai), who, 'shit jokes')).status).toBe(422);
    expect((await db.from('generate_jobs').select('id').eq('owner_key', `ip:${who.ip}:${who.key}`)).data).toEqual([]);
  });

  it('without the flag the request still waits and returns the puzzle, as it always has', async () => {
    const { ai } = fakeAi();
    const r = await handle(req('POST', '/api/generate', guest(), { topic: topic() }), deps(ai));
    expect(r.status).toBe(200);
    expect(((await r.json()) as { code: string }).code).toMatch(/^[A-Z2-7]{8}$/);
  });

  it('one job per player at a time: a second ask returns the first and is not counted', async () => {
    const { ai } = fakeAi();
    const who = guest();
    const first = (await (await start(deps(ai), who, 'first topic')).json()) as JobOut;
    const again = await start(deps(ai), who, 'another topic');
    expect(again.status).toBe(200);
    expect(((await again.json()) as JobOut).id).toBe(first.id);
    expect((await rowOf(first.id)).topic).toBe('first topic');
    expect(await counted(`gen:ip:${who.ip}`)).toBe(1);

    // Another browser behind the same address has its own job.
    const other = (await (await start(deps(ai), { ip: who.ip, key: randomUUID().replace(/-/g, '') })).json()) as JobOut;
    expect(other.id).not.toBe(first.id);

    // Two asks at the very same moment still make one job.
    const twin = guest();
    const both = await Promise.all([start(deps(ai), twin), start(deps(ai), twin)]);
    const ids = await Promise.all(both.map(async (r) => ((await r.json()) as JobOut).id));
    expect(ids[0]).toBe(ids[1]);
  });

  it('a signed in player is one player on any address', async () => {
    const { ai } = fakeAi();
    const u = await makeUser('job');
    const a = (await (await start(deps(ai), { ip: '198.51.100.1', user: u })).json()) as JobOut;
    const b = (await (await start(deps(ai), { ip: '198.51.100.2', user: u })).json()) as JobOut;
    expect(b.id).toBe(a.id);
    expect((await rowOf(a.id)).refund_key).toBeNull();
  });

  it('a topic made in the last 24 hours is ready at once', async () => {
    const { ai, calls } = fakeAi();
    const t = topic();
    const who = guest();
    const made = await run(deps(ai), who, ((await (await start(deps(ai), who, t)).json()) as JobOut).id);
    expect(calls).toHaveLength(1);
    const r = await start(deps(ai), guest(), ` ${t.toUpperCase()}! `);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ state: 'done', code: made.code });
    expect(calls).toHaveLength(1);
  });
});

describe('GET /api/generate/:id/run', () => {
  it('does the work, saves the puzzle on the job, and is safe to call again', async () => {
    const { ai, calls } = fakeAi();
    const who = guest();
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    const done = await run(deps(ai), who, id);
    expect(done).toEqual({ id, state: 'done', code: expect.stringMatching(/^[A-Z2-7]{8}$/), error: null, run: false });
    expect(calls).toHaveLength(1);
    expect((await anon.rpc('get_game_by_code', { p_code: done.code })).data).toHaveLength(1);

    expect(await state(deps(ai), who, id)).toEqual(done);
    expect(await run(deps(ai), who, id)).toEqual(done);
    expect(calls).toHaveLength(1);
    // The job is over, so the next ask is a new one.
    expect(((await (await start(deps(ai), who)).json()) as JobOut).id).not.toBe(id);
  });

  it('a signed in player owns the puzzle, and only they can see or run the job', async () => {
    const { ai, calls } = fakeAi();
    const [u, other] = [await makeUser('jown'), await makeUser('joth')];
    const who = { ip: '198.51.100.7', user: u };
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    for (const stranger of [{ ip: who.ip }, { ip: who.ip, user: other }]) {
      expect((await handle(req('GET', `/api/generate/${id}`, stranger), deps(ai))).status).toBe(404);
      expect((await handle(req('GET', `/api/generate/${id}/run`, stranger), deps(ai))).status).toBe(404);
    }
    expect(calls).toEqual([]);
    const done = await run(deps(ai), who, id);
    expect((await db.from('games').select('owner_id, safety').eq('share_code', done.code!).single()).data).toEqual({ owner_id: u.id, safety: 'unchecked' });
  });

  it('two runs at once: one runner, one model call, one puzzle', async () => {
    const { ai, calls } = fakeAi(GOOD, 300);
    const who = guest();
    const t = topic();
    const { id } = (await (await start(deps(ai), who, t)).json()) as JobOut;
    const [a, b] = await Promise.all([run(deps(ai), who, id), run(deps(ai), who, id)]);
    expect([a.state, b.state].sort()).toEqual(['done', 'waiting']);
    expect([a, b].find((j) => j.state === 'waiting')).toMatchObject({ run: false });
    expect(calls).toHaveLength(1);
    expect((await db.from('games').select('id').eq('topic_key', t)).data).toHaveLength(1);
    expect((await rowOf(id)).attempts).toBe(1);
  });

  it('the runner renews its claim while the model thinks', async () => {
    const { ai } = fakeAi(GOOD, 3000);
    const who = guest();
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    const going = run(deps(ai, { job: { heartbeatMs: 100 } }), who, id);
    /** The claim time once it is no longer `not`, or null if it never changes while the model thinks. */
    const claimAfter = async (not: string | null) => {
      for (let i = 0; i < 40; i++) {
        const at = (await rowOf(id)).claimed_at as string | null;
        if (at && at !== not) return at;
        await new Promise((r) => setTimeout(r, 50));
      }
      return null;
    };
    const early = await claimAfter(null);
    expect(early).not.toBeNull();
    const later = await claimAfter(early);
    expect(later).not.toBeNull();
    expect(Date.parse(later!)).toBeGreaterThan(Date.parse(early!));
    expect((await going).state).toBe('done');
  });

  it('the page died mid run: the claim goes stale and the next visit runs the job again', async () => {
    const { ai, calls } = fakeAi();
    const who = guest();
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    // A runner took the job and was cut off: the claim stays, nothing renews it.
    const claim = await db.rpc('claim_generate_job', { p_id: id, p_stale_seconds: 60, p_max_attempts: JOB.maxAttempts });
    expect(claim.data).toMatch(/^[0-9a-f-]{36}$/);
    // While the claim looks alive nobody else gets in.
    expect(await run(deps(ai), who, id)).toMatchObject({ state: 'waiting' });
    expect(calls).toEqual([]);

    await db.from('generate_jobs').update({ claimed_at: new Date(Date.now() - 5 * 60_000).toISOString() }).eq('id', id);
    expect(await state(deps(ai), who, id)).toEqual({ id, state: 'waiting', code: null, error: null, run: true });
    expect(await run(deps(ai), who, id)).toMatchObject({ state: 'done' });
    expect(calls).toHaveLength(1);
    expect((await rowOf(id)).attempts).toBe(2);
  });

  it('a runner that lost its claim does not leave a second puzzle behind', async () => {
    const who = guest();
    const t = topic();
    let id = '';
    // While this runner waits for the model, its claim is taken away (as if it had gone stale and another run took over).
    const ai: AiGenerate = async () => {
      await db.from('generate_jobs').update({ claim_id: randomUUID() }).eq('id', id);
      return GOOD;
    };
    id = ((await (await start(deps(ai), who, t)).json()) as JobOut).id;
    expect(await run(deps(ai), who, id)).toMatchObject({ state: 'waiting' });
    expect((await db.from('games').select('id').eq('topic_key', t)).data).toEqual([]);
  });

  it('unknown and malformed ids are 404', async () => {
    const { ai } = fakeAi();
    for (const id of [randomUUID(), 'nope', "1'; drop table generate_jobs;--"]) {
      expect((await handle(req('GET', `/api/generate/${encodeURIComponent(id)}`, guest()), deps(ai))).status).toBe(404);
      expect((await handle(req('GET', `/api/generate/${encodeURIComponent(id)}/run`, guest()), deps(ai))).status).toBe(404);
    }
  });
});

describe('failed jobs', () => {
  it('a failed attempt gives the guest the request back, so failures do not use up the 5', async () => {
    const { ai, calls } = fakeAi(null);
    const who = guest();
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    expect(await counted(`gen:ip:${who.ip}`)).toBe(1);
    expect(await run(deps(ai), who, id)).toEqual({ id, state: 'failed', code: null, error: 'generate_failed', run: false });
    expect(calls).toHaveLength(2);
    expect(await counted(`gen:ip:${who.ip}`)).toBe(0);
    // Looking again does not give it back twice.
    await state(deps(ai), who, id);
    await run(deps(ai), who, id);
    expect(await counted(`gen:ip:${who.ip}`)).toBe(0);
    expect(calls).toHaveLength(2);

    // More failures than the hourly 5 are all accepted...
    for (let i = 1; i < LIMITS.guestGenerateTriesPerHour; i++) {
      const r = await start(deps(ai), who);
      expect(r.status, `ask ${i + 1}`).toBe(202);
      await run(deps(ai), who, ((await r.json()) as JobOut).id);
    }
    // ...but not for ever: every ask is also counted on a limit that is never handed back.
    const over = await start(deps(ai), who);
    expect(over.status).toBe(429);
    expect(Number(over.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('5 puzzles made is still the limit: the 6th ask in an hour is 429', async () => {
    const { ai } = fakeAi();
    const who = guest();
    for (let i = 0; i < LIMITS.guestGeneratePerHour; i++) {
      const r = await start(deps(ai), who);
      expect(r.status, `ask ${i + 1}`).toBe(202);
      expect((await run(deps(ai), who, ((await r.json()) as JobOut).id)).state).toBe('done');
    }
    expect((await start(deps(ai), who)).status).toBe(429);
  });

  it('a puzzle the safety check refuses fails the job, saves nothing, and stays counted', async () => {
    const { ai } = fakeAi();
    const unsafe: WorkersAi = { run: async () => ({ response: 'unsafe\nS10' }) };
    const d = deps(ai, { safety: { ai: unsafe } });
    const who = guest();
    const t = topic();
    const { id } = (await (await start(d, who, t)).json()) as JobOut;
    expect(await run(d, who, id)).toEqual({ id, state: 'failed', code: null, error: 'not_allowed', run: false });
    expect((await db.from('games').select('id').eq('topic_key', t)).data).toEqual([]);
    expect(await counted(`gen:ip:${who.ip}`)).toBe(1);
  });

  it('a signed in player gets nothing back: their limit is 20', async () => {
    const { ai } = fakeAi(null);
    const u = await makeUser('jfail');
    const who = { ip: '198.51.100.9', user: u };
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    expect((await run(deps(ai), who, id)).state).toBe('failed');
    expect(await counted(`gen:user:${u.id}`)).toBe(1);
  });

  it('a job nobody finished is given up on: after 3 runners, or after 15 minutes', async () => {
    const { ai, calls } = fakeAi();
    const who = guest();
    const spent = ((await (await start(deps(ai), who)).json()) as JobOut).id;
    await db.from('generate_jobs').update({ attempts: JOB.maxAttempts, claim_id: randomUUID(), claimed_at: new Date(Date.now() - 5 * 60_000).toISOString() }).eq('id', spent);
    expect(await state(deps(ai), who, spent)).toEqual({ id: spent, state: 'failed', code: null, error: 'generate_failed', run: false });
    expect(await counted(`gen:ip:${who.ip}`)).toBe(0);

    const old = ((await (await start(deps(ai), who)).json()) as JobOut).id;
    expect(old).not.toBe(spent);
    await db.from('generate_jobs').update({ created_at: new Date(Date.now() - JOB.ttlMs - 60_000).toISOString() }).eq('id', old);
    expect(await run(deps(ai), who, old)).toEqual({ id: old, state: 'failed', code: null, error: 'generate_failed', run: false });
    expect(calls).toEqual([]);
    // A dead job never blocks the next ask.
    expect((await start(deps(ai), who)).status).toBe(202);
  });
});

describe('generate_jobs is the Worker\'s alone', () => {
  it('clients cannot read or write jobs, claim one, or hand themselves requests back', async () => {
    const { ai } = fakeAi();
    const who = guest();
    const { id } = (await (await start(deps(ai), who)).json()) as JobOut;
    const u = await makeUser('jrls');
    for (const client of [anon, u.client]) {
      expect((await client.from('generate_jobs').select('*')).data ?? []).toEqual([]);
      expect((await client.from('generate_jobs').insert({ owner_key: 'x', topic: 'x' })).error).not.toBeNull();
      expect((await client.rpc('claim_generate_job', { p_id: id, p_stale_seconds: 0, p_max_attempts: 99 })).error).not.toBeNull();
      expect((await client.rpc('refund_rate_limit', { p_key: `gen:ip:${who.ip}`, p_window_seconds: 3600, p_at: new Date().toISOString() })).error).not.toBeNull();
      expect((await client.rpc('prune_generate_jobs')).error).not.toBeNull();
    }
    expect((await rowOf(id)).attempts).toBe(0);
    expect(await counted(`gen:ip:${who.ip}`)).toBe(1);
  });

  it('the hourly prune removes jobs older than 2 days and nothing newer', async () => {
    const { ai } = fakeAi();
    const [a, b] = [guest(), guest()];
    const old = ((await (await start(deps(ai), a)).json()) as JobOut).id;
    const fresh = ((await (await start(deps(ai), b)).json()) as JobOut).id;
    await db.from('generate_jobs').update({ created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() }).eq('id', old);
    expect((await db.rpc('prune_generate_jobs')).error).toBeNull();
    expect((await db.from('generate_jobs').select('id').in('id', [old, fresh])).data).toEqual([{ id: fresh }]);
  });
});
