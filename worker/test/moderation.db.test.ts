// Clean reads, the safety state, reports, the owner page and the daily candidate rule, against the local Supabase stack.

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { dayNo } from '../../src/engine/daily';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { dailyIdFor, getGameDef } from '../../src/games/catalog';
import { makeProfile, makeUser, shareCode, uniqueHandle, type TestUser } from '../../supabase/tests/helpers';
import type { AiGenerate, WorkersAi } from '../src/ai';
import { handle, type Deps } from '../src/app';

const APP = 'http://localhost:5173';
const db = createClient(process.env.SB_URL!, process.env.SB_SERVICE!, { auth: { persistSession: false } });
const anon = createClient(process.env.SB_URL!, process.env.SB_ANON!, { auth: { persistSession: false } });
const base: Deps = { db, ai: null, origins: [APP] };

const call = (deps: Deps, method: string, path: string, u?: TestUser, body?: unknown) =>
  handle(
    new Request(`http://api.test${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: APP, 'CF-Connecting-IP': `10.${Math.random()}`, ...(u ? { Authorization: `Bearer ${u.token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    deps,
  );

const TEXT = 'It was a most ordinary day until Pat omitted the big old key from each drawer in the house.';
const good = { title: 'House keys', noun: 'short words', text: TEXT, words: ['Amos', 'Atom', 'Gold', 'Rome'] };

/** A Workers AI binding whose Llama Guard always says the same thing. */
const guard = (reply: string | Error): WorkersAi => ({
  async run() {
    if (reply instanceof Error) throw reply;
    return { response: reply };
  },
});

async function player(tag: string) {
  const u = await makeUser(tag);
  const h = uniqueHandle(tag);
  await makeProfile(u, tag, h);
  return { u, h };
}

const publish = async (u: TestUser, deps: Deps = base) => ((await (await call(deps, 'POST', '/api/puzzles', u, good)).json()) as { code: string }).code;
const opens = async (client: typeof anon, code: string) => ((await client.rpc('get_game_by_code', { p_code: code })).data as unknown[]).length === 1;

describe('clean read, recorded by the replay', () => {
  const bnote = buildHiddenWords(getGameDef('bnote')!);
  const log = (p = bnote, hints: number[] = []) => {
    const events = p.answers.map((a, i) => ({ a: a.spans[0]![0], b: a.spans[0]![1], t: (i + 1) * 3000 }));
    return { events, hints, finish: events.at(-1)!.t + 1000 };
  };
  const play = (u: TestUser, game: unknown, l: unknown) => call(base, 'POST', '/api/plays', u, { game, log: l });

  it('is stored on the play, shown on the public row and counted once per puzzle', async () => {
    const ada = await player('cada');
    const first = await play(ada.u, { type: 'game', id: 'bnote' }, log());
    expect(await first.json()).toMatchObject({ verified: true, clean: true });
    // The same puzzle read cleanly again, and once with a hint.
    await play(ada.u, { type: 'game', id: 'bnote' }, log());
    const hinted = await play(ada.u, { type: 'game', id: 'bnote' }, log(bnote, [500]));
    expect(await hinted.json()).toMatchObject({ clean: false });

    const rows = await db.from('plays').select('clean, hints').eq('user_id', ada.u.id).order('created_at');
    expect(rows.data).toEqual([{ clean: true, hints: 0 }, { clean: true, hints: 0 }, { clean: false, hints: 1 }]);
    const pub = await anon.from('plays_public').select('clean').eq('handle', ada.h);
    expect((pub.data ?? []).map((r) => r.clean).sort()).toEqual([false, true, true]);
    expect((await anon.rpc('clean_reads_of', { p_handle: ada.h })).data).toBe(1);
    expect((await anon.rpc('clean_reads_of', { p_handle: 'nobody.here' })).data).toBe(0);
    // A player with no plays at all: 0, not null.
    expect((await anon.rpc('clean_reads_of', { p_handle: (await player('cnone')).h })).data).toBe(0);
    // Leave the shared puzzle board as it was for the other suites.
    await db.from('plays').delete().eq('user_id', ada.u.id);
  });

  it("today's daily: kept on the play, masked in public until the day ends (it would give the count away)", async () => {
    const ada = await player('cday');
    const today = dayNo();
    const daily = buildHiddenWords(getGameDef(dailyIdFor(today))!);
    const r = await play(ada.u, { type: 'daily', day_no: today }, log(daily));
    expect(await r.json()).toMatchObject({ clean: true });
    expect((await ada.u.client.from('plays').select('clean').eq('day_no', today)).data).toEqual([{ clean: true }]);
    expect((await anon.from('plays_public').select('clean, total').eq('handle', ada.h)).data).toEqual([{ clean: null, total: null }]);
    expect((await anon.rpc('clean_reads_of', { p_handle: ada.h })).data).toBe(0);
  });

  it('a room play never writes one, and the database refuses a clean play that is not a full, unhinted, verified one', async () => {
    const ada = await player('croom');
    const r = await call(base, 'POST', '/api/plays', ada.u, { game: { type: 'game', id: 'bnote' }, log: log(), room: 'ABCDEF' });
    expect(await r.json()).toMatchObject({ room: true, clean: false });
    const row = { user_id: ada.u.id, game_id: 'bnote', total: 5, misses: 0, secs: 9, score: 0, source: 'worker', clean: true };
    expect((await db.from('plays').insert({ ...row, found: 4, hints: 0, verified: true })).error).not.toBeNull();
    expect((await db.from('plays').insert({ ...row, found: 5, hints: 1, verified: true })).error).not.toBeNull();
    expect((await db.from('plays').insert({ ...row, found: 5, hints: 0, verified: false, source: 'guest_merge' })).error).not.toBeNull();
  });
});

describe('the safety state on a published puzzle', () => {
  const stateOf = async (code: string) => (await db.from('games').select('safety').eq('share_code', code).single()).data?.safety;

  it('passed when the model says safe, unchecked when no model can be reached; both get a link', async () => {
    const ada = await player('sada');
    const passed = await publish(ada.u, { ...base, safety: { ai: guard('safe') } });
    expect(await stateOf(passed)).toBe('passed');
    const down = await publish(ada.u, { ...base, safety: { ai: guard(new Error('allowance used up')) } });
    expect(await stateOf(down)).toBe('unchecked');
    const none = await publish(ada.u);
    expect(await stateOf(none)).toBe('unchecked');
    for (const code of [passed, down, none]) expect(await opens(anon, code)).toBe(true);
  });

  it('a fail gives a plain error and saves nothing', async () => {
    const ada = await player('sbad');
    const r = await call({ ...base, safety: { ai: guard('unsafe\nS10') } }, 'POST', '/api/puzzles', ada.u, good);
    expect(r.status).toBe(422);
    expect(await r.json()).toEqual({ error: 'not_allowed' });
    expect((await db.from('games').select('id').eq('owner_id', ada.u.id)).data).toEqual([]);
  });

  it('machine-made puzzles go through the same check', async () => {
    const science = getGameDef('science')!;
    const ai: AiGenerate = async () => JSON.stringify({ title: 'Lab day', paragraph: science.text, words: science.dict.slice(0, 12) });
    const topic = () => `safety ${randomUUID().slice(0, 6)}`;
    const t1 = topic();
    const bad = await call({ ...base, ai, safety: { ai: guard('unsafe') } }, 'POST', '/api/generate', undefined, { topic: t1 });
    expect(bad.status).toBe(422);
    expect(await bad.json()).toEqual({ error: 'not_allowed' });
    expect((await db.from('games').select('id').eq('topic_key', t1)).data).toEqual([]);

    const ok = await call({ ...base, ai, safety: { ai: guard('safe') } }, 'POST', '/api/generate', undefined, { topic: topic() });
    expect(ok.status).toBe(200);
    expect(await stateOf(((await ok.json()) as { code: string }).code)).toBe('passed');
  });

  it('clients cannot set or change the state', async () => {
    const ada = await player('sset');
    const code = await publish(ada.u);
    await ada.u.client.from('games').update({ safety: 'passed' }).eq('share_code', code);
    expect(await stateOf(code)).toBe('unchecked');
  });
});

describe('reports', () => {
  const report = (code: string, u?: TestUser) => call(base, 'POST', `/api/puzzles/${code}/report`, u);
  const hiddenAt = async (code: string) => (await db.from('games').select('hidden_at').eq('share_code', code).single()).data?.hidden_at as string | null;

  it('3 reports from different players hide a puzzle at once; fewer do not', async () => {
    const [ada, b, c, d] = [await player('rpa'), await player('rpb'), await player('rpc'), await player('rpd')];
    const code = await publish(ada.u);

    expect((await report(code)).status).toBe(401);
    expect((await report(code, ada.u)).status).toBe(403);
    expect((await report('ZZZZZZZZ', b.u)).status).toBe(404);

    expect(await (await report(code, b.u)).json()).toEqual({ ok: true, again: false });
    // The same player again is not a second report, however often.
    for (let i = 0; i < 3; i++) expect(await (await report(code, b.u)).json()).toEqual({ ok: true, again: true });
    expect(await (await report(code.toLowerCase(), c.u)).json()).toEqual({ ok: true, again: false });
    expect(await hiddenAt(code)).toBeNull();
    expect(await opens(anon, code)).toBe(true);

    expect(await (await report(code, d.u)).json()).toEqual({ ok: true, again: false });
    expect(await hiddenAt(code)).not.toBeNull();
    // Hidden: the link is dead for everyone but its maker.
    expect(await opens(anon, code)).toBe(false);
    expect(await opens(b.u.client, code)).toBe(false);
    expect(await opens(ada.u.client, code)).toBe(true);
    expect((await db.from('puzzle_reports').select('user_id').eq('game_id', `c-${code.toLowerCase()}`)).data).toHaveLength(3);
  });

  it('our own puzzles cannot be reported', async () => {
    const b = await player('rpo');
    // Curated puzzles have no share code, so there is nothing to report them by.
    expect((await report('bnote', b.u)).status).toBe(404);
    expect((await db.rpc('report_puzzle', { p_code: 'bnote', p_user: b.u.id })).data).toBe('missing');
  });

  it('a hidden any-topic puzzle is not handed out again from the cache', async () => {
    const science = getGameDef('science')!;
    let calls = 0;
    const ai: AiGenerate = async () => {
      calls++;
      return JSON.stringify({ title: 'Lab day', paragraph: science.text, words: science.dict.slice(0, 12) });
    };
    const topic = `hidden ${randomUUID().slice(0, 6)}`;
    const gen = async () => ((await (await call({ ...base, ai }, 'POST', '/api/generate', undefined, { topic })).json()) as { code: string }).code;
    const first = await gen();
    expect(await gen()).toBe(first);
    expect(calls).toBe(1);
    for (const tag of ['ca', 'cb', 'cc']) await report(first, (await player(tag)).u);
    expect(await opens(anon, first)).toBe(false);
    expect(await gen()).not.toBe(first);
    expect(calls).toBe(2);
  });

  it('clients cannot read or write reports, or call the functions behind them', async () => {
    const [ada, b] = [await player('rpx'), await player('rpy')];
    const code = await publish(ada.u);
    const id = `c-${code.toLowerCase()}`;
    await report(code, b.u);
    for (const client of [anon, ada.u.client, b.u.client]) {
      expect((await client.from('puzzle_reports').select('*')).data ?? []).toEqual([]);
      expect((await client.rpc('report_puzzle', { p_code: code, p_user: randomUUID() })).error).not.toBeNull();
      expect((await client.rpc('hidden_puzzles')).error).not.toBeNull();
      expect((await client.rpc('restore_puzzle', { p_code: code })).error).not.toBeNull();
      expect((await client.rpc('remove_puzzle', { p_code: code })).error).not.toBeNull();
    }
    expect((await b.u.client.from('puzzle_reports').insert({ game_id: id, user_id: b.u.id })).error).not.toBeNull();
    // The maker cannot unhide their own puzzle.
    await db.from('games').update({ hidden_at: new Date().toISOString() }).eq('id', id);
    await ada.u.client.from('games').update({ hidden_at: null }).eq('id', id);
    expect(await hiddenAt(code)).not.toBeNull();
  });
});

describe('the owner page', () => {
  const report = (code: string, u: TestUser) => call(base, 'POST', `/api/puzzles/${code}/report`, u);
  const hide = async (code: string, tag: string) => {
    for (const t of ['x', 'y', 'z']) await report(code, (await player(`${tag}${t}`)).u);
  };
  type Hidden = { code: string; title: string; maker: string | null; reports: number; hidden_at: string; safety: string; text: string };

  it('lists hidden puzzles newest first, to owners only', async () => {
    const [ada, boss] = [await player('oada'), await player('oboss')];
    const owner: Deps = { ...base, owners: [boss.u.id] };
    const [one, two, open] = [await publish(ada.u), await publish(ada.u), await publish(ada.u)];
    await hide(one, 'h1');
    await hide(two, 'h2');

    expect((await call(owner, 'GET', '/api/owner/puzzles')).status).toBe(404);
    expect((await call(owner, 'GET', '/api/owner/puzzles', ada.u)).status).toBe(404);
    // No owner configured: nobody gets in, not even the would-be owner.
    expect((await call(base, 'GET', '/api/owner/puzzles', boss.u)).status).toBe(404);

    const r = await call(owner, 'GET', '/api/owner/puzzles', boss.u);
    expect(r.status).toBe(200);
    const { puzzles } = (await r.json()) as { puzzles: Hidden[] };
    const codes = puzzles.map((p) => p.code);
    expect(codes).not.toContain(open);
    expect(codes.indexOf(two)).toBeGreaterThanOrEqual(0);
    expect(codes.indexOf(two)).toBeLessThan(codes.indexOf(one));
    expect(puzzles.map((p) => p.hidden_at)).toEqual([...puzzles.map((p) => p.hidden_at)].sort().reverse());
    expect(puzzles.find((p) => p.code === one)).toMatchObject({ title: 'House keys', maker: ada.h, reports: 3, safety: 'unchecked', text: TEXT });
  });

  it('restore opens it again, and old reports stop counting toward hiding it', async () => {
    const [ada, boss] = [await player('orada'), await player('orboss')];
    const owner: Deps = { ...base, owners: [boss.u.id] };
    const code = await publish(ada.u);
    const act = (what: string, u?: TestUser, deps = owner) => call(deps, 'POST', `/api/owner/puzzles/${code}/${what}`, u);

    // Not hidden yet: nothing to restore or remove.
    expect((await act('restore', boss.u)).status).toBe(404);
    expect((await act('remove', boss.u)).status).toBe(404);
    await hide(code, 'r1');
    expect((await act('restore', ada.u)).status).toBe(404);
    expect((await act('restore')).status).toBe(404);
    expect(await opens(anon, code)).toBe(false);

    expect(await (await act('restore', boss.u)).json()).toEqual({ ok: true });
    expect(await opens(anon, code)).toBe(true);
    // One new report is the first of 3, not the fourth.
    await report(code, (await player('r2a')).u);
    await report(code, (await player('r2b')).u);
    expect(await opens(anon, code)).toBe(true);
    await report(code, (await player('r2c')).u);
    expect(await opens(anon, code)).toBe(false);
  });

  it('remove deletes it for good', async () => {
    const [ada, boss] = [await player('odada'), await player('odboss')];
    const owner: Deps = { ...base, owners: [boss.u.id] };
    const code = await publish(ada.u);
    await hide(code, 'd1');
    expect((await call(owner, 'POST', `/api/owner/puzzles/${code}/remove`, ada.u)).status).toBe(404);
    expect(await (await call(owner, 'POST', `/api/owner/puzzles/${code}/remove`, boss.u)).json()).toEqual({ ok: true });
    expect((await db.from('games').select('id').eq('share_code', code)).data).toEqual([]);
    expect((await db.from('puzzle_reports').select('user_id').eq('game_id', `c-${code.toLowerCase()}`)).data).toEqual([]);
    expect((await call(owner, 'POST', `/api/owner/puzzles/${code}/remove`, boss.u)).status).toBe(404);
  });
});

describe('daily candidates', () => {
  it('safety passed, 20 verified players, 80% Good one, never reported, not hidden, has a maker', async () => {
    const maker = await makeUser('dcm');
    const code = shareCode();
    const id = `c-${code.toLowerCase()}`;
    const game = { id, kind: 'custom', owner_id: maker.id, share_code: code, category: 'Player made', title: 'Candidate', noun: 'short words', text: TEXT, dict: good.words };
    expect((await db.from('games').insert({ ...game, safety: 'passed' })).error).toBeNull();

    const users: string[] = [];
    for (let i = 0; i < 20; i++) {
      const { data, error } = await db.auth.admin.createUser({ email: `dc-${randomUUID().slice(0, 8)}@test.gazecraft.local`, password: `pw-${randomUUID()}`, email_confirm: true });
      if (error) throw error;
      users.push(data.user.id);
    }
    const playOf = (user_id: string, verified = true) => ({ user_id, game_id: id, found: 4, total: 4, hints: 0, misses: 0, secs: 30, score: 970, verified, source: verified ? 'worker' : 'guest_merge' });
    const isCandidate = async () => ((await db.from('daily_candidates').select('id, players, ups, downs').eq('id', id)).data ?? []).length === 1;

    // 19 players, and the maker's own plays and a player's replays, do not make 20.
    expect((await db.from('plays').insert(users.slice(0, 19).map((u) => playOf(u)))).error).toBeNull();
    await db.from('plays').insert([playOf(maker.id), playOf(users[0]!), playOf(users[1]!)]);
    await db.from('puzzle_ratings').insert(users.slice(0, 4).map((u) => ({ game_id: id, user_id: u, up: true })));
    expect(await isCandidate()).toBe(false);
    // An unverified play does not count either.
    await db.from('plays').insert(playOf(users[19]!, false));
    expect(await isCandidate()).toBe(false);
    await db.from('plays').delete().eq('game_id', id).eq('user_id', users[19]!);
    await db.from('plays').insert(playOf(users[19]!));
    expect(await isCandidate()).toBe(true);
    expect((await db.from('daily_candidates').select('code, players, ups, downs').eq('id', id)).data).toEqual([{ code, players: 20, ups: 4, downs: 0 }]);

    // 4 of 5 is 80%: still in. 4 of 6 is not.
    await db.from('puzzle_ratings').insert({ game_id: id, user_id: users[4]!, up: false });
    expect(await isCandidate()).toBe(true);
    await db.from('puzzle_ratings').insert({ game_id: id, user_id: users[5]!, up: false });
    expect(await isCandidate()).toBe(false);
    await db.from('puzzle_ratings').delete().eq('game_id', id).eq('user_id', users[5]!);
    expect(await isCandidate()).toBe(true);

    // No thumbs at all is not "players liked it".
    const kept = (await db.from('puzzle_ratings').select('user_id, up').eq('game_id', id)).data!;
    await db.from('puzzle_ratings').delete().eq('game_id', id);
    expect(await isCandidate()).toBe(false);
    await db.from('puzzle_ratings').insert(kept.map((r) => ({ ...r, game_id: id })));
    expect(await isCandidate()).toBe(true);

    // Safety: unchecked is not passed.
    for (const safety of ['unchecked', 'failed']) {
      await db.from('games').update({ safety }).eq('id', id);
      expect(await isCandidate()).toBe(false);
    }
    await db.from('games').update({ safety: 'passed' }).eq('id', id);
    expect(await isCandidate()).toBe(true);

    // Hidden.
    await db.from('games').update({ hidden_at: new Date().toISOString() }).eq('id', id);
    expect(await isCandidate()).toBe(false);
    await db.from('games').update({ hidden_at: null }).eq('id', id);
    expect(await isCandidate()).toBe(true);

    // One report, ever, takes it out for good, even after a restore.
    expect((await db.rpc('report_puzzle', { p_code: code, p_user: users[6]! })).data).toBe('reported');
    expect(await isCandidate()).toBe(false);
    await db.from('games').update({ restored_at: new Date().toISOString() }).eq('id', id);
    expect(await isCandidate()).toBe(false);
    await db.from('puzzle_reports').delete().eq('game_id', id);
    expect(await isCandidate()).toBe(true);

    // No maker (an old guest any-topic puzzle).
    await db.from('games').update({ owner_id: null }).eq('id', id);
    expect(await isCandidate()).toBe(false);
  }, 120_000);

  it('clients cannot read the queue', async () => {
    const u = await makeUser('dcx');
    for (const client of [anon, u.client]) {
      const r = await client.from('daily_candidates').select('*');
      expect(r.data ?? []).toEqual([]);
      expect(r.error).not.toBeNull();
    }
  });
});
