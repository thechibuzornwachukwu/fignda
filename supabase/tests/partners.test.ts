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
    expect(await mine(u)).toEqual({ current: 'dog', owned: ['dog'], points: 0, slots: 1 });
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
    expect(await mine(u)).toEqual({ current: 'dog', owned: ['cat', 'dino', 'dog'], points: 9000, slots: 3 });
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
    for (const who of ['robot', 'CAT', '', null, "cat'; drop table plays;--", 7]) expect((await choose(u, who)).error).not.toBeNull();
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
    expect((await svc.from('player_partners').insert({ user_id: u.id, current: 'robot', owned: ['robot'] })).error).not.toBeNull();
  });

  it('slots follow points', async () => {
    const slots = async (n: number | null) => (await svc.rpc('partner_slots', { p_points: n })).data;
    expect(await Promise.all([null, -1, 0, 2999, 3000, 8999, 9000, 10_000_000].map(slots))).toEqual([1, 1, 1, 1, 2, 2, 3, 3]);
  });
});