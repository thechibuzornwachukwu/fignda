import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const T = today();
const svc = admin();
const P: Record<string, { u: TestUser; h: string }> = {};
const h = (n: string) => P[n]!.h;
const id = (n: string) => P[n]!.u.id;
const as = (n: string) => P[n]!.u.client;

beforeAll(async () => {
  for (const n of ['ann', 'ben', 'cy', 'dee']) {
    const u = await makeUser(n);
    const handle = uniqueHandle(`${n}x`);
    await makeProfile(u, n.toUpperCase(), handle);
    P[n] = { u, h: handle };
  }
});

describe('follows RLS', () => {
  it('you follow as yourself only', async () => {
    expect((await as('ann').from('follows').insert({ follower_id: id('ann'), followee_id: id('ben') })).error).toBeNull();
    const forged = await as('ann').from('follows').insert({ follower_id: id('cy'), followee_id: id('ben') });
    expect(forged.error).not.toBeNull();
  });

  it('no self follow, no duplicates, no following a non-player', async () => {
    expect((await as('ann').from('follows').insert({ follower_id: id('ann'), followee_id: id('ann') })).error).not.toBeNull();
    expect((await as('ann').from('follows').insert({ follower_id: id('ann'), followee_id: id('ben') })).error).not.toBeNull();
    const ghost = await makeUser('ghost'); // no profile
    expect((await as('ann').from('follows').insert({ follower_id: id('ann'), followee_id: ghost.id })).error).not.toBeNull();
  });

  it('anon cannot follow', async () => {
    expect((await anon().from('follows').insert({ follower_id: id('ann'), followee_id: id('cy') })).error).not.toBeNull();
  });

  it('only the two people in a follow can end it', async () => {
    await as('cy').from('follows').insert({ follower_id: id('cy'), followee_id: id('ben') });
    // A stranger cannot delete it.
    await as('dee').from('follows').delete().eq('follower_id', id('cy')).eq('followee_id', id('ben'));
    expect((await svc.from('follows').select('*').eq('follower_id', id('cy'))).data).toHaveLength(1);
    // The followee removes a follower.
    await as('ben').from('follows').delete().eq('follower_id', id('cy')).eq('followee_id', id('ben'));
    expect((await svc.from('follows').select('*').eq('follower_id', id('cy'))).data).toHaveLength(0);
  });

  it('follows cannot be edited in place', async () => {
    const r = await as('ann').from('follows').update({ followee_id: id('dee') }).eq('follower_id', id('ann'));
    expect(r.error).not.toBeNull();
  });
});

describe('public community functions', () => {
  it('profile_summary counts followers and never returns ids or emails', async () => {
    const { data, error } = await anon().rpc('profile_summary', { p_handle: h('ben') });
    expect(error).toBeNull();
    expect(data[0]).toMatchObject({ handle: h('ben'), followers: 1, following: 0 });
    expect(Object.keys(data[0]).sort()).toEqual(
      ['best_streak', 'created_at', 'current_streak', 'dailies', 'followers', 'following', 'handle', 'name', 'perfect'].sort(),
    );
    expect(JSON.stringify(data)).not.toMatch(/@test\.fignda\.local|[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it('follower and following lists by handle', async () => {
    expect((await anon().rpc('followers_of', { p_handle: h('ben') })).data).toEqual([{ handle: h('ann'), name: 'ANN' }]);
    expect((await anon().rpc('following_of', { p_handle: h('ann') })).data).toEqual([{ handle: h('ben'), name: 'BEN' }]);
  });

  it('search is prefix only and ignores wildcards', async () => {
    const pre = h('ann').slice(0, 6);
    const hit = await anon().rpc('players_search', { p_prefix: pre });
    expect(hit.data.map((r: { handle: string }) => r.handle)).toContain(h('ann'));
    for (const bad of ['%', '_%', "' or 1=1", '']) {
      expect((await anon().rpc('players_search', { p_prefix: bad })).data).toEqual([]);
    }
  });

  it('the following board shows you and people you follow, verified plays only', async () => {
    const g = (await svc.from('daily').select('game_id').eq('day_no', T - 60).single()).data!.game_id;
    const base = { game_id: g, day_no: T - 60, found: 5, total: 9, secs: 50, verified: true, source: 'worker' };
    await svc.from('plays').insert([
      { ...base, user_id: id('ann'), score: 500 },
      { ...base, user_id: id('ben'), score: 700 },
      { ...base, user_id: id('dee'), score: 900 }, // not followed by ann
    ]);
    const { data, error } = await as('ann').rpc('following_board', { p_day: T - 60 });
    expect(error).toBeNull();
    expect(data.map((r: { handle: string }) => r.handle)).toEqual([h('ben'), h('ann')]);
    expect((await anon().rpc('following_board', { p_day: T - 60 })).error).not.toBeNull();
  });

  it('internal streak helper is not callable by clients', async () => {
    expect((await anon().rpc('verified_streaks')).error).not.toBeNull();
    expect((await as('ann').rpc('verified_streaks')).error).not.toBeNull();
  });

  it('deleting an account removes its follows both ways', async () => {
    const e = await makeUser('eve');
    await makeProfile(e, 'Eve', uniqueHandle('evex'));
    await e.client.from('follows').insert({ follower_id: e.id, followee_id: id('ann') });
    await as('ann').from('follows').insert({ follower_id: id('ann'), followee_id: e.id });
    await e.client.rpc('delete_account');
    const left = await svc.from('follows').select('*').or(`follower_id.eq.${e.id},followee_id.eq.${e.id}`);
    expect(left.data).toEqual([]);
  });
});
