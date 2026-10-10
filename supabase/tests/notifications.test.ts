import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const T = today();
const svc = admin();
type P = { u: TestUser; h: string };

async function player(tag: string): Promise<P> {
  const u = await makeUser(tag);
  const h = uniqueHandle(tag);
  await makeProfile(u, tag, h);
  return { u, h };
}

type Row = { id: number; kind: string; handle: string | null; name: string | null; data: Record<string, unknown>; unread: boolean };
const inbox = async (p: P) => (await p.u.client.rpc('my_notifications', { p_limit: 50 })).data as Row[];
const unread = async (p: P) => (await p.u.client.rpc('unread_notifications')).data as number;

async function play(p: P, over: Record<string, unknown>) {
  const { error } = await svc
    .from('plays')
    .insert({ user_id: p.u.id, game_id: 'bnote', found: 1, total: 10, secs: 5, score: 100, verified: true, source: 'worker', ...over });
  if (error) throw error;
}
const dailyGame = async (d: number) => (await svc.from('daily').select('game_id').eq('day_no', d).single()).data!.game_id as string;

describe('notifications', () => {
  it('a follow tells the followed player, once, and never the follower', async () => {
    const [ada, bisi] = [await player('nfa'), await player('nfb')];
    const follow = () => ada.u.client.from('follows').insert({ follower_id: ada.u.id, followee_id: bisi.u.id });
    await follow();
    expect(await inbox(bisi)).toMatchObject([{ kind: 'follow', handle: ada.h, name: 'nfa', unread: true }]);
    expect(await inbox(ada)).toEqual([]);
    expect(await unread(bisi)).toBe(1);

    // Unfollow and follow again the same day: no second ping.
    await ada.u.client.from('follows').delete().eq('follower_id', ada.u.id).eq('followee_id', bisi.u.id);
    await follow();
    expect(await inbox(bisi)).toHaveLength(1);

    await bisi.u.client.rpc('read_notifications');
    expect(await unread(bisi)).toBe(0);
    expect((await inbox(bisi))[0]!.unread).toBe(false);
  });

  it('streak ask, start by yes, start by link, and a nudge each tell the right player', async () => {
    const [ada, bisi, chidi] = [await player('nsa'), await player('nsb'), await player('nsc')];
    await ada.u.client.rpc('friend_streak_ask', { p_handle: bisi.h });
    expect(await inbox(bisi)).toMatchObject([{ kind: 'streak_ask', handle: ada.h }]);
    expect(await inbox(ada)).toEqual([]);

    await bisi.u.client.rpc('friend_streak_ask', { p_handle: ada.h });
    expect((await inbox(ada)).map((n) => [n.kind, n.handle])).toEqual([['streak_start', bisi.h]]);

    // A link: the owner hears when a friend takes it up.
    const code = (await ada.u.client.rpc('my_streak_link')).data as string;
    await chidi.u.client.rpc('friend_streak_join', { p_code: code });
    expect((await inbox(ada)).map((n) => [n.kind, n.handle])).toEqual([
      ['streak_start', chidi.h],
      ['streak_start', bisi.h],
    ]);
    expect(await inbox(chidi)).toEqual([]);

    // Ada plays, then nudges Bisi.
    await play(ada, { game_id: await dailyGame(T), day_no: T });
    const nudge = await svc.rpc('claim_nudge', { p_user: ada.u.id, p_handle: bisi.h });
    expect(nudge.error).toBeNull();
    expect((await inbox(bisi)).map((n) => [n.kind, n.handle])).toEqual([
      ['nudge', ada.h],
      ['streak_ask', ada.h],
    ]);
  });

  it('a room invite carries the puzzle and the room', async () => {
    const [ada, bisi] = [await player('nia'), await player('nib')];
    await ada.u.client.from('follows').insert({ follower_id: ada.u.id, followee_id: bisi.u.id });
    await bisi.u.client.rpc('read_notifications');
    const r = await svc.rpc('claim_invite', { p_user: ada.u.id, p_handle: bisi.h, p_game: 'bnote', p_room: 'ABCDEF' });
    expect(r.error).toBeNull();
    const first = (await inbox(bisi))[0]!;
    expect(first).toMatchObject({ kind: 'room_invite', handle: ada.h, unread: true, data: { game: 'bnote', room: 'ABCDEF', title: 'Short note' } });
    expect(await unread(bisi)).toBe(1);
  });

  it('nobody reads or writes another player’s notifications, and no client can invent one', async () => {
    const [ada, bisi] = [await player('nxa'), await player('nxb')];
    await ada.u.client.from('follows').insert({ follower_id: ada.u.id, followee_id: bisi.u.id });
    expect((await ada.u.client.from('notifications').select('*')).data ?? []).toEqual([]);
    expect((await bisi.u.client.from('notifications').select('*')).data ?? []).toEqual([]);
    expect((await ada.u.client.from('notifications').insert({ user_id: bisi.u.id, kind: 'badge', data: { code: 'points_100000' } })).error).not.toBeNull();
    expect((await ada.u.client.rpc('notify', { p_user: bisi.u.id, p_kind: 'badge', p_actor: null, p_data: {} })).error).not.toBeNull();
    expect((await ada.u.client.from('badges').insert({ user_id: ada.u.id, code: 'points_100000' })).error).not.toBeNull();
    expect((await anon().rpc('my_notifications', { p_limit: 5 })).error).not.toBeNull();
    expect((await anon().rpc('unread_notifications')).error).not.toBeNull();
    // Reading yours does not clear theirs.
    await ada.u.client.rpc('read_notifications');
    expect(await unread(bisi)).toBe(1);
  });
});

describe('badges', () => {
  const codes = async (p: P) => ((await anon().rpc('badges_of', { p_handle: p.h })).data as Array<{ code: string }>).map((b) => b.code);

  it('first game, then points milestones, each announced once', async () => {
    const ada = await player('bga');
    await play(ada, { score: 300 });
    // A whole catalogue puzzle is a case closed.
    expect((await codes(ada)).sort()).toEqual(['cases_1', 'first_game']);
    await play(ada, { game_id: 'space', score: 900 });
    expect((await codes(ada)).sort()).toEqual(['cases_1', 'first_game', 'points_1000']);
    // Replaying a puzzle for a lower score earns nothing new.
    await play(ada, { game_id: 'space', score: 200 });
    await play(ada, { game_id: 'lagos', score: 4000 });
    expect((await codes(ada)).sort()).toEqual(['cases_1', 'first_game', 'points_1000', 'points_5000']);
    const got = (await inbox(ada)).filter((n) => n.kind === 'badge').map((n) => n.data.code);
    expect(got.sort()).toEqual(['cases_1', 'first_game', 'points_1000', 'points_5000']);
    expect((await inbox(ada)).every((n) => n.handle === null)).toBe(true);
  });

  it('a perfect daily and a 7 day streak; unverified plays earn nothing', async () => {
    const ada = await player('bgs');
    await svc.from('plays').insert({
      user_id: ada.u.id, game_id: await dailyGame(T - 20), day_no: T - 20, found: 10, total: 10, secs: 5, score: 9000, verified: false, source: 'guest_merge',
    });
    expect(await codes(ada)).toEqual([]);
    for (let d = T - 6; d <= T; d++) await play(ada, { game_id: await dailyGame(d), day_no: d, found: d === T ? 10 : 3, total: 10 });
    expect((await codes(ada)).sort()).toEqual(['first_game', 'perfect_daily', 'streak_7']);
  });
});
