// Partners (BUILD_PLAN 3g): which partners a player holds and which is beside them, decided on the server.

import { admin, anon, makeUser, type TestUser } from './helpers';

const svc = admin();
type Row = { current: string; owned: string[] };
const choose = async (u: TestUser, who: unknown) => u.client.rpc('choose_partner', { p_who: who });
const held = async (u: TestUser) => ((await choose(u, (await mine(u))?.current ?? 'cat')).data as Row[])[0]!;
const mine = async (u: TestUser) => ((await u.client.rpc('my_partner')).data as Array<Row & { points: number; slots: number }>)[0];
const score = async (u: TestUser, points: number) => {
  const { error } = await svc.from('plays').insert({ user_id: u.id, game_id: 'bnote', found: 5, total: 10, secs: 60, score: points, verified: true, source: 'worker' });
  if (error) throw error;
};

describe('choose_partner', () => {
  it('the first partner is free, whichever it is, and there is no row before it', async () => {
    const u = await makeUser('partner');
    expect(await mine(u)).toBeUndefined();
    const r = await choose(u, 'dog');
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ current: 'dog', owned: ['dog'] }]);
    expect(await mine(u)).toEqual({ current: 'dog', owned: ['dog'], points: 0, slots: 1, bonds: {} });
  });

  it('a second partner is refused without the points, and nothing changes', async () => {
    const u = await makeUser('partner');
    await choose(u, 'cat');
    expect((await choose(u, 'dino')).data).toEqual([{ current: 'cat', owned: ['cat'] }]);
    await score(u, 2999);
    expect((await choose(u, 'dino')).data).toEqual([{ current: 'cat', owned: ['cat'] }]);
  });

  it('points open the second and the third, and are never spent', async () => {
    const u = await makeUser('partner');
    await choose(u, 'cat');
    await score(u, 3000);
    expect((await choose(u, 'dino')).data).toEqual([{ current: 'dino', owned: ['cat', 'dino'] }]);
    expect((await choose(u, 'dog')).data).toEqual([{ current: 'dino', owned: ['cat', 'dino'] }]);
    await svc.from('plays').insert({ user_id: u.id, game_id: 'science', found: 5, total: 10, secs: 60, score: 6000, verified: true, source: 'worker' });
    expect((await choose(u, 'dog')).data).toEqual([{ current: 'dog', owned: ['cat', 'dino', 'dog'] }]);
    expect(await mine(u)).toMatchObject({ current: 'dog', owned: ['cat', 'dino', 'dog'], points: 9000, slots: 3 });
  });

  it('switching among the held is always allowed and takes nothing', async () => {
    const u = await makeUser('partner');
    await choose(u, 'cat');
    await score(u, 3000);
    await choose(u, 'dino');
    expect((await choose(u, 'cat')).data).toEqual([{ current: 'cat', owned: ['cat', 'dino'] }]);
    expect((await choose(u, 'cat')).data).toEqual([{ current: 'cat', owned: ['cat', 'dino'] }]);
    expect(await held(u)).toEqual({ current: 'cat', owned: ['cat', 'dino'] });
  });

  it('unchecked points open nothing', async () => {
    const u = await makeUser('partner');
    await choose(u, 'cat');
    await svc.from('plays').insert({ user_id: u.id, game_id: 'bnote', found: 5, total: 10, secs: 60, score: 9000, verified: false, source: 'guest_merge' });
    expect((await choose(u, 'dino')).data).toEqual([{ current: 'cat', owned: ['cat'] }]);
  });

  it('refuses a partner that is not in the game, bad input and guests', async () => {
    const u = await makeUser('partner');
    for (const who of ['ghost', 'CAT', '', null, "cat'; drop table plays;--", 7]) expect((await choose(u, who)).error).not.toBeNull();
    expect((await anon().rpc('choose_partner', { p_who: 'cat' })).error).not.toBeNull();
    expect((await anon().rpc('my_partner')).error).not.toBeNull();
    expect(await mine(u)).toBeUndefined();
  });

  it('clients cannot read or write the table, or count slots for themselves', async () => {
    const u = await makeUser('partner');
    await choose(u, 'cat');
    for (const client of [u.client, anon()]) {
      expect((await client.from('player_partners').select('*')).data ?? []).toEqual([]);
      expect((await client.from('player_partners').update({ owned: ['cat', 'dino', 'dog'], current: 'dog' }).eq('user_id', u.id)).error).not.toBeNull();
      expect((await client.from('player_partners').insert({ user_id: u.id, current: 'dog', owned: ['dog'] })).error).not.toBeNull();
      expect((await client.rpc('partner_slots', { p_points: 0 })).error).not.toBeNull();
    }
    expect(await mine(u)).toMatchObject({ current: 'cat', owned: ['cat'] });
  });

  it('one player’s partners are never another’s, and an account deleted takes them with it', async () => {
    const a = await makeUser('partner');
    const b = await makeUser('partner');
    await choose(a, 'dog');
    expect(await mine(b)).toBeUndefined();
    expect((await svc.auth.admin.deleteUser(a.id)).error).toBeNull();
    expect((await svc.from('player_partners').select('user_id').eq('user_id', a.id)).data).toEqual([]);
  });

  it('the table refuses a current partner that is not held, and an unknown one', async () => {
    const u = await makeUser('partner');
    expect((await svc.from('player_partners').insert({ user_id: u.id, current: 'dog', owned: ['cat'] })).error).not.toBeNull();
    expect((await svc.from('player_partners').insert({ user_id: u.id, current: 'ghost', owned: ['ghost'] })).error).not.toBeNull();
  });

  it('slots follow points', async () => {
    const slots = async (n: number | null) => (await svc.rpc('partner_slots', { p_points: n })).data;
    expect(await Promise.all([null, -1, 0, 2999, 3000, 8999, 9000, 19999, 20000, 10_000_000].map(slots))).toEqual([1, 1, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('Agent 404 can be the first partner, and the 4th opens at 20,000 points', async () => {
    const first = await makeUser('partner');
    expect((await choose(first, 'robot')).data).toEqual([{ current: 'robot', owned: ['robot'] }]);
    const u = await makeUser('partner');
    await choose(u, 'cat');
    await score(u, 9000);
    await choose(u, 'dino');
    await choose(u, 'dog');
    expect((await choose(u, 'robot')).data).toEqual([{ current: 'dog', owned: ['cat', 'dino', 'dog'] }]);
    await svc.from('plays').insert({ user_id: u.id, game_id: 'science', found: 5, total: 10, secs: 60, score: 11000, verified: true, source: 'worker' });
    expect((await choose(u, 'robot')).data).toEqual([{ current: 'robot', owned: ['cat', 'dino', 'dog', 'robot'] }]);
  });
});
describe('the bond', () => {
  const close = async (u: TestUser, game: string, over: Record<string, unknown> = {}) => {
    const { error } = await svc.from('plays').insert({ user_id: u.id, game_id: game, found: 5, total: 10, secs: 60, score: 100, verified: true, source: 'worker', ...over });
    if (error) throw error;
  };
  const bonds = async (u: TestUser) => ((await u.client.rpc('my_partner')).data as Array<{ bonds: Record<string, number> }>)[0]?.bonds;

  it('a case closed counts once, for the partner who was there the first time', async () => {
    const u = await makeUser('bond');
    await choose(u, 'dog');
    expect(await bonds(u)).toEqual({});
    await close(u, 'bnote');
    await close(u, 'bnote');
    await close(u, 'science');
    expect(await bonds(u)).toEqual({ dog: 2 });
  });

  it('each case stays with the partner who closed it, whoever is beside the player now', async () => {
    const u = await makeUser('bond');
    await choose(u, 'cat');
    await close(u, 'bnote', { score: 3000 });
    await choose(u, 'dino');
    await close(u, 'science');
    await close(u, 'bnote');
    expect(await bonds(u)).toEqual({ cat: 1, dino: 1 });
  });

  it('a daily, an unchecked play and a puzzle that is not in the catalogue close nothing', async () => {
    const u = await makeUser('bond');
    await choose(u, 'cat');
    await close(u, 'ai', { verified: false, source: 'guest_merge' });
    const day = (await svc.from('daily').select('day_no, game_id').order('day_no', { ascending: false }).limit(1).single()).data!;
    await close(u, day.game_id, { day_no: day.day_no });
    expect(await bonds(u)).toEqual({});
  });

  it('a player who never chose a partner closes cases with the first one', async () => {
    const u = await makeUser('bond');
    await close(u, 'bnote');
    expect((await svc.from('partner_cases').select('partner').eq('user_id', u.id)).data).toEqual([{ partner: 'cat' }]);
  });

  it('clients cannot read or write the table', async () => {
    const u = await makeUser('bond');
    await choose(u, 'cat');
    await close(u, 'bnote');
    for (const client of [u.client, anon()]) {
      expect((await client.from('partner_cases').select('*')).data ?? []).toEqual([]);
      expect((await client.from('partner_cases').insert({ user_id: u.id, game_id: 'science', partner: 'cat' })).error).not.toBeNull();
    }
    expect(await bonds(u)).toEqual({ cat: 1 });
  });
});
