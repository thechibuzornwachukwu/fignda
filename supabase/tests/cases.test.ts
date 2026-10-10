// Cases on the server (BUILD_PLAN 3e): clues kept from checked plays, a guest's progress moved to the account,
// points that count clues, ranks as a view over points, and badges for closed cases.

import { admin, anon, makeProfile, makeUser, shareCode, uniqueHandle, type TestUser } from './helpers';

const svc = admin();

const record = (u: TestUser, game: string, clue: number, stars: number, score: number, client = svc) =>
  client.rpc('record_clue', { p_user: u.id, p_game: game, p_clue: clue, p_stars: stars, p_score: score });
const progress = async (u: TestUser) => {
  const { data, error } = await u.client.rpc('my_progress');
  if (error) throw error;
  return Object.fromEntries((data as Array<{ clue_id: string; stars: number }>).map((r) => [r.clue_id, r.stars]));
};
const merge = (u: TestUser, items: unknown) => u.client.rpc('merge_guest_progress', { items });
const pointsOf = async (handle: string, client = anon()) => {
  const { data, error } = await client.rpc('points_of', { p_handle: handle });
  if (error) throw error;
  return (data as Array<{ points: number; rank: string }>)[0];
};
const play = async (u: TestUser, game: string, over: Record<string, unknown> = {}) => {
  const { error } = await svc.from('plays').insert({ user_id: u.id, game_id: game, found: 5, total: 10, secs: 60, score: 400, verified: true, source: 'worker', ...over });
  if (error) throw error;
};
const rowsOf = async (u: TestUser) => (await svc.from('clue_plays').select('game_id, clue, stars, score, verified').eq('user_id', u.id).order('game_id').order('clue')).data;

describe('record_clue (Worker only)', () => {
  it('keeps the best stars and the best score, so a replay can only raise them', async () => {
    const u = await makeUser('clue');
    expect((await record(u, 'bible', 2, 2, 300)).data).toBe(true);
    expect((await record(u, 'bible', 2, 1, 500)).data).toBe(true);
    expect((await record(u, 'bible', 2, 3, 100)).data).toBe(true);
    expect(await rowsOf(u)).toEqual([{ game_id: 'bible', clue: 2, stars: 3, score: 500, verified: true }]);
  });

  it('refuses what is not a clue: clue 0, out of range, bad stars, a negative score, an unknown puzzle', async () => {
    const u = await makeUser('clue');
    for (const [game, clue, stars, score] of [['bible', 0, 3, 10], ['bible', 41, 3, 10], ['bible', -1, 3, 10], ['bible', 1, 0, 10], ['bible', 1, 4, 10], ['bible', 1, 3, -5], ['no-such-game', 1, 3, 10]] as const) {
      expect((await record(u, game, clue, stars, score)).data).toBe(false);
    }
    expect(await rowsOf(u)).toEqual([]);
  });

  it('refuses a puzzle that is not in the catalogue', async () => {
    const u = await makeUser('clue');
    const id = `c-${uniqueHandle('g')}`;
    const made = await svc.from('games').insert({ id, kind: 'custom', owner_id: u.id, share_code: shareCode(), category: 'Custom', title: 'Mine', noun: 'words', text: 'Pat omitted a most odd note.', dict: ['atom'] });
    expect(made.error).toBeNull();
    expect((await record(u, id, 1, 3, 10)).data).toBe(false);
  });

  it('clients cannot call it, and cannot read or write the table', async () => {
    const u = await makeUser('clue');
    expect((await record(u, 'bible', 1, 3, 9999, u.client)).error).not.toBeNull();
    expect((await record(u, 'bible', 1, 3, 9999, anon())).error).not.toBeNull();
    await record(u, 'bible', 1, 2, 100);
    for (const client of [u.client, anon()]) {
      expect((await client.from('clue_plays').select('*')).data ?? []).toEqual([]);
      expect((await client.from('clue_plays').insert({ user_id: u.id, game_id: 'bible', clue: 3, stars: 3, score: 9999, verified: true })).error).not.toBeNull();
      expect((await client.from('clue_plays').update({ score: 9999 }).eq('user_id', u.id)).error).not.toBeNull();
      expect((await client.from('clue_plays').delete().eq('user_id', u.id)).error).not.toBeNull();
    }
    expect(await rowsOf(u)).toEqual([{ game_id: 'bible', clue: 1, stars: 2, score: 100, verified: true }]);
  });

  it('the table itself refuses a checked whole puzzle and a score on an unchecked row', async () => {
    const u = await makeUser('clue');
    expect((await svc.from('clue_plays').insert({ user_id: u.id, game_id: 'bible', clue: 0, stars: 3, score: 0, verified: true })).error).not.toBeNull();
    expect((await svc.from('clue_plays').insert({ user_id: u.id, game_id: 'bible', clue: 1, stars: 3, score: 50, verified: false })).error).not.toBeNull();
  });
});

describe('merge_guest_progress', () => {
  it('moves a guest’s clues and whole puzzles to the account, unverified and scoring nothing', async () => {
    const u = await makeUser('guest');
    const r = await merge(u, [{ id: 'bible~1', stars: 3 }, { id: 'bible~2', stars: 1 }, { id: 'science', stars: 2 }]);
    expect(r.error).toBeNull();
    expect(r.data).toBe(3);
    expect(await rowsOf(u)).toEqual([
      { game_id: 'bible', clue: 1, stars: 3, score: 0, verified: false },
      { game_id: 'bible', clue: 2, stars: 1, score: 0, verified: false },
      { game_id: 'science', clue: 0, stars: 2, score: 0, verified: false },
    ]);
    expect(await progress(u)).toEqual({ 'bible~1': 3, 'bible~2': 1, science: 2 });
  });

  it('sent again changes nothing, and stars only go up', async () => {
    const u = await makeUser('guest');
    await merge(u, [{ id: 'bible~1', stars: 2 }]);
    expect((await merge(u, [{ id: 'bible~1', stars: 2 }])).data).toBe(0);
    expect((await merge(u, [{ id: 'bible~1', stars: 1 }])).data).toBe(0);
    expect((await merge(u, [{ id: 'bible~1', stars: 3 }])).data).toBe(1);
    expect(await progress(u)).toEqual({ 'bible~1': 3 });
  });

  it('never touches what a checked play earned', async () => {
    const u = await makeUser('guest');
    await record(u, 'bible', 1, 1, 250);
    expect((await merge(u, [{ id: 'bible~1', stars: 3 }])).data).toBe(0);
    expect(await rowsOf(u)).toEqual([{ game_id: 'bible', clue: 1, stars: 1, score: 250, verified: true }]);
    // And a checked play afterwards takes an unchecked row over.
    await merge(u, [{ id: 'bible~2', stars: 3 }]);
    await record(u, 'bible', 2, 2, 300);
    expect((await rowsOf(u))![1]).toEqual({ game_id: 'bible', clue: 2, stars: 3, score: 300, verified: true });
  });

  it('skips anything that is not a clue of a catalogue puzzle', async () => {
    const u = await makeUser('guest');
    const r = await merge(u, [
      { id: 'no-such-game~1', stars: 3 },
      { id: 'bible~99', stars: 3 },
      { id: 'bible~1', stars: 4 },
      { id: 'bible~1', stars: 0 },
      { id: 'bible~1', stars: '3; drop table plays' },
      { id: "bible'; drop table plays;--", stars: 3 },
      { id: 'BIBLE~1', stars: 3 },
      { id: 'bible~', stars: 3 },
      { stars: 3 },
      'bible~1',
      null,
      7,
    ]);
    expect(r.error).toBeNull();
    expect(r.data).toBe(0);
    expect(await rowsOf(u)).toEqual([]);
  });

  it('refuses guests, bad input and a list that is too long', async () => {
    const u = await makeUser('guest');
    expect((await anon().rpc('merge_guest_progress', { items: [{ id: 'bible~1', stars: 3 }] })).error).not.toBeNull();
    expect((await merge(u, { id: 'bible~1', stars: 3 })).error).not.toBeNull();
    expect((await merge(u, null)).error).not.toBeNull();
    expect((await merge(u, Array.from({ length: 401 }, () => ({ id: 'bible~1', stars: 1 })))).error).not.toBeNull();
    expect(await rowsOf(u)).toEqual([]);
  });

  it('one player’s merge is never another’s', async () => {
    const a = await makeUser('guest');
    const b = await makeUser('guest');
    await merge(a, [{ id: 'bible~1', stars: 3 }]);
    expect(await progress(b)).toEqual({});
    expect((await anon().rpc('my_progress')).error).not.toBeNull();
  });
});

describe('my_progress', () => {
  it('a whole puzzle from plays closes its case, with stars by the game’s rule', async () => {
    const u = await makeUser('prog');
    await play(u, 'bnote', { found: 5, total: 10 }); // under 80%: 1
    await play(u, 'science', { found: 8, total: 10 }); // 80%: 2
    await play(u, 'ai', { found: 10, total: 10, clean: true }); // clean read: 3
    await play(u, 'history', { found: 10, total: 10 }); // every word, not clean: 2
    expect(await progress(u)).toEqual({ bnote: 1, science: 2, ai: 3, history: 2 });
  });

  it('a player with history from before cases existed has those cases closed', async () => {
    const u = await makeUser('prog');
    await play(u, 'bible', { created_at: '2026-09-27T10:00:00Z' });
    expect(await progress(u)).toEqual({ bible: 1 });
  });

  it('the best of several plays, and of a checked play and moved guest progress', async () => {
    const u = await makeUser('prog');
    await play(u, 'bnote', { found: 5, total: 10 });
    await play(u, 'bnote', { found: 10, total: 10, clean: true });
    await merge(u, [{ id: 'science', stars: 3 }]);
    await play(u, 'science', { found: 5, total: 10 });
    expect(await progress(u)).toEqual({ bnote: 3, science: 3 });
  });

  it('2 devices with different progress: the account holds both', async () => {
    const u = await makeUser('prog');
    // One device played clues 1 and 2 signed in. Another played clue 3 and a whole puzzle as a guest, then signed in.
    await record(u, 'bible', 1, 3, 200);
    await record(u, 'bible', 2, 2, 150);
    await merge(u, [{ id: 'bible~3', stars: 1 }, { id: 'bible~1', stars: 1 }, { id: 'science', stars: 2 }]);
    expect(await progress(u)).toEqual({ 'bible~1': 3, 'bible~2': 2, 'bible~3': 1, science: 2 });
  });

  it('leaves out dailies, unchecked plays and puzzles that are not in the catalogue', async () => {
    const u = await makeUser('prog');
    const day = (await svc.from('daily').select('day_no, game_id').order('day_no', { ascending: false }).limit(1).single()).data!;
    await play(u, day.game_id, { day_no: day.day_no });
    await play(u, 'ai', { verified: false, source: 'guest_merge' });
    const id = `c-${uniqueHandle('g')}`;
    await svc.from('games').insert({ id, kind: 'custom', owner_id: u.id, share_code: shareCode(), category: 'Custom', title: 'Mine', noun: 'words', text: 'Pat omitted a most odd note.', dict: ['atom'] });
    await play(u, id);
    expect(await progress(u)).toEqual({});
  });
});

describe('points and ranks', () => {
  it('points count a clue’s best checked score once, and nothing unchecked', async () => {
    const u = await makeUser('pts');
    const handle = uniqueHandle('pt');
    await makeProfile(u, 'Points', handle);
    expect(await pointsOf(handle)).toEqual({ points: 0, rank: 'Rookie' });
    await play(u, 'bnote', { score: 400 });
    await record(u, 'bible', 1, 2, 300);
    await record(u, 'bible', 1, 3, 250); // a worse replay adds nothing
    await record(u, 'bible', 2, 1, 100);
    await merge(u, [{ id: 'bible~3', stars: 3 }, { id: 'science', stars: 3 }]);
    expect(await pointsOf(handle)).toEqual({ points: 800, rank: 'Rookie' });
  });

  it('a rank is worked out from points and never stored', async () => {
    const rank = async (n: number | null) => (await svc.rpc('rank_of', { p_points: n })).data;
    expect(await Promise.all([null, -5, 0, 3719, 3720, 12969, 12970, 36019, 36020, 10_000_000].map(rank))).toEqual([
      'Rookie', 'Rookie', 'Rookie', 'Rookie', 'Detective', 'Detective', 'Inspector', 'Inspector', 'Chief', 'Chief',
    ]);
    const u = await makeUser('pts');
    const handle = uniqueHandle('pt');
    await makeProfile(u, 'Ranked', handle);
    await play(u, 'bnote', { score: 3000 });
    await record(u, 'bible', 1, 3, 720);
    expect(await pointsOf(handle)).toEqual({ points: 3720, rank: 'Detective' });
  });

  it('an unknown handle has no points row, and the answer names no one', async () => {
    expect(await pointsOf(uniqueHandle('nobody'))).toBeUndefined();
    const u = await makeUser('pts');
    const handle = uniqueHandle('pt');
    await makeProfile(u, 'Shape', handle);
    expect(Object.keys((await pointsOf(handle))!).sort()).toEqual(['points', 'rank']);
  });
});

describe('case badges', () => {
  const badges = async (u: TestUser) => ((await svc.from('badges').select('code').eq('user_id', u.id)).data ?? []).map((b) => b.code as string);

  it('closing a case earns the first case badge, once, and 5 cases earn the next', async () => {
    const u = await makeUser('badge');
    await play(u, 'bnote');
    expect(await badges(u)).toEqual(expect.arrayContaining(['first_game', 'cases_1']));
    await play(u, 'bnote');
    expect((await badges(u)).filter((c) => c === 'cases_1')).toHaveLength(1);
    for (const g of ['science', 'ai', 'history']) await play(u, g);
    expect(await badges(u)).not.toContain('cases_5');
    await play(u, 'general');
    expect(await badges(u)).toContain('cases_5');
    expect(await badges(u)).not.toContain('cases_10');
  });

  it('a daily, an unchecked play, a clue and moved guest progress close no case', async () => {
    const u = await makeUser('badge');
    await play(u, 'ai', { verified: false, source: 'guest_merge' });
    await record(u, 'bible', 1, 3, 100);
    await merge(u, [{ id: 'science', stars: 3 }]);
    const day = (await svc.from('daily').select('day_no, game_id').order('day_no', { ascending: false }).limit(1).single()).data!;
    await play(u, day.game_id, { day_no: day.day_no });
    expect((await badges(u)).some((c) => c.startsWith('cases_'))).toBe(false);
  });

  it('points badges count clue scores', async () => {
    const u = await makeUser('badge');
    await record(u, 'bible', 1, 3, 700);
    await play(u, 'bnote', { score: 400 });
    expect(await badges(u)).toContain('points_1000');
  });
});

describe('deleting an account', () => {
  it('takes its clues with it', async () => {
    const u = await makeUser('gone');
    await record(u, 'bible', 1, 3, 100);
    const { error } = await svc.auth.admin.deleteUser(u.id);
    expect(error).toBeNull();
    expect(await rowsOf(u)).toEqual([]);
  });
});
