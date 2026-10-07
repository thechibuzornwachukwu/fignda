// Streak links, nudges, room invites, points and word stats against the local Supabase stack.

import { createClient } from '@supabase/supabase-js';
import pools from '../../data/copy.json';
import { dayNo } from '../../src/engine/daily';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { dailyIdFor, getGameDef } from '../../src/games/catalog';
import { makeProfile, makeUser, uniqueHandle, type TestUser } from '../../supabase/tests/helpers';
import { handle, type Deps } from '../src/app';

const APP = 'http://localhost:5173';
const db = createClient(process.env.SB_URL!, process.env.SB_SERVICE!, { auth: { persistSession: false } });
const anon = createClient(process.env.SB_URL!, process.env.SB_ANON!, { auth: { persistSession: false } });
const ep = (tag: string) => `https://fcm.googleapis.com/fcm/send/${tag}-${Math.random().toString(36).slice(2)}`;
const roomCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

function api() {
  const pushed: string[] = [];
  const deps: Deps = { db, ai: null, origins: [APP], pushKey: 'PUBLIC', push: async (e) => (pushed.push(e), 201) };
  const post = (path: string, body: unknown, u?: TestUser) =>
    handle(
      new Request(`http://api.test${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: APP, 'CF-Connecting-IP': `10.${Math.random()}`, ...(u ? { Authorization: `Bearer ${u.token}` } : {}) },
        body: JSON.stringify(body),
      }),
      deps,
    );
  return { post, pushed };
}

type P = { u: TestUser; h: string; name: string };
async function player(tag: string): Promise<P> {
  const u = await makeUser(tag);
  const h = uniqueHandle(tag);
  await makeProfile(u, tag, h);
  return { u, h, name: tag };
}

async function play(userId: string, over: Record<string, unknown>) {
  const { error } = await db
    .from('plays')
    .insert({ user_id: userId, game_id: 'bnote', found: 1, total: 10, secs: 5, score: 100, verified: true, source: 'worker', ...over });
  if (error) throw error;
}
const todayGame = () => dailyIdFor(dayNo());

describe('streak links', () => {
  it('a link starts the streak at once, for a player who was never asked', async () => {
    const [ada, bisi, chidi] = [await player('lada'), await player('lbisi'), await player('lchidi')];
    const code = (await ada.u.client.rpc('my_streak_link')).data as string;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    // The same link every time.
    expect((await ada.u.client.rpc('my_streak_link')).data).toBe(code);
    // Anyone can see who it is from, and nothing else.
    expect((await anon.rpc('streak_link_info', { p_code: code })).data).toEqual([{ handle: ada.h, name: 'lada' }]);
    expect((await anon.rpc('streak_link_info', { p_code: 'ZZZZZZZZ' })).data).toEqual([]);

    expect((await anon.rpc('friend_streak_join', { p_code: code })).error).not.toBeNull();
    expect((await ada.u.client.rpc('friend_streak_join', { p_code: code })).data).toBe('self');
    expect((await bisi.u.client.rpc('friend_streak_join', { p_code: code })).data).toBe('started');
    expect((await bisi.u.client.rpc('friend_streak_join', { p_code: code })).data).toBe('exists');
    // One link, many friends.
    expect((await chidi.u.client.rpc('friend_streak_join', { p_code: code })).data).toBe('started');
    const mine = (await ada.u.client.rpc('my_friend_streaks')).data as Array<{ handle: string; state: string }>;
    expect(mine.map((r) => [r.handle, r.state]).sort()).toEqual([[bisi.h, 'active'], [chidi.h, 'active']].sort());

    expect((await bisi.u.client.from('streak_links').select('*')).data ?? []).toEqual([]);
  });
});

describe('POST /api/nudge', () => {
  it('only after you have played, only to a streak friend who has not, once a day', async () => {
    const [ada, bisi, stranger] = [await player('nada'), await player('nbisi'), await player('nstr')];
    const mine = ep('bisi');
    await bisi.u.client.from('push_subs').insert({ endpoint: mine, tz: 'UTC', hour: 9 });
    await bisi.u.client.rpc('friend_streak_join', { p_code: (await ada.u.client.rpc('my_streak_link')).data });
    const { post, pushed } = api();

    expect((await post('/api/nudge', { handle: bisi.h })).status).toBe(401);
    expect(await (await post('/api/nudge', { handle: bisi.h }, ada.u)).json()).toEqual({ error: 'play_first' });
    await play(ada.u.id, { game_id: todayGame(), day_no: dayNo() });
    expect(await (await post('/api/nudge', { handle: stranger.h }, ada.u)).json()).toEqual({ error: 'no_streak' });
    expect(pushed).toEqual([]);

    expect(await (await post('/api/nudge', { handle: bisi.h }, ada.u)).json()).toEqual({ ok: true, pushed: 1 });
    expect(pushed).toEqual([mine]);
    expect(await (await post('/api/nudge', { handle: bisi.h }, ada.u)).json()).toEqual({ error: 'already_nudged' });
    expect(pushed).toHaveLength(1);

    // What the nudged browser shows: the friend who has played.
    const line = (await (await post('/api/push/line', { endpoint: mine })).json()) as { body: string };
    expect(pools.remindFriend.map((t) => t.replace('{name}', 'nada'))).toContain(line.body);

    // Once the friend has played there is nobody to nudge.
    await play(bisi.u.id, { game_id: todayGame(), day_no: dayNo() });
    await db.from('friend_streaks').update({ low_nudged: 0, high_nudged: 0 }).or(`low.eq.${ada.u.id},high.eq.${ada.u.id}`);
    expect(await (await post('/api/nudge', { handle: bisi.h }, ada.u)).json()).toEqual({ error: 'already_played' });
    expect((await ada.u.client.rpc('claim_nudge', { p_user: ada.u.id, p_handle: bisi.h })).error).not.toBeNull();
  });
});

describe('POST /api/invite', () => {
  it('you invite people you follow; a push goes out only when they follow you back', async () => {
    const [ada, bisi, chidi] = [await player('iada'), await player('ibisi'), await player('ichidi')];
    const [eb, ec] = [ep('ibisi'), ep('ichidi')];
    await bisi.u.client.from('push_subs').insert({ endpoint: eb, tz: 'UTC', hour: 9 });
    await chidi.u.client.from('push_subs').insert({ endpoint: ec, tz: 'UTC', hour: 9 });
    const { post, pushed } = api();
    const room = roomCode();
    const body = (h: string) => ({ handle: h, game: 'bnote', room });

    expect((await post('/api/invite', body(bisi.h))).status).toBe(401);
    // Not following: refused, nothing stored.
    expect((await post('/api/invite', body(bisi.h), ada.u)).status).toBe(403);
    await ada.u.client.from('follows').insert({ follower_id: ada.u.id, followee_id: bisi.u.id });
    await ada.u.client.from('follows').insert({ follower_id: ada.u.id, followee_id: chidi.u.id });
    await bisi.u.client.from('follows').insert({ follower_id: bisi.u.id, followee_id: ada.u.id });

    // Bisi follows back: stored and pushed. Chidi does not: stored, no push.
    expect(await (await post('/api/invite', body(bisi.h), ada.u)).json()).toEqual({ ok: true, pushed: 1 });
    expect(await (await post('/api/invite', body(chidi.h), ada.u)).json()).toEqual({ ok: true, pushed: 0 });
    expect(pushed).toEqual([eb]);
    // The same invite again does not buzz twice.
    expect(await (await post('/api/invite', body(bisi.h), ada.u)).json()).toMatchObject({ ok: true, pushed: 0 });
    expect(pushed).toHaveLength(1);

    for (const who of [bisi, chidi]) {
      const got = (await who.u.client.rpc('my_game_invites')).data as Array<Record<string, unknown>>;
      expect(got).toHaveLength(1);
      expect(got[0]).toMatchObject({ handle: ada.h, name: 'iada', game_id: 'bnote', title: getGameDef('bnote')!.title, room_code: room });
    }
    expect((await ada.u.client.rpc('my_game_invites')).data).toEqual([]);

    // The pushed browser is told who is waiting and sent straight to the room.
    const line = (await (await post('/api/push/line', { endpoint: eb })).json()) as { body: string; url: string };
    expect(pools.inviteGame.map((t) => t.replace('{name}', 'iada'))).toContain(line.body);
    expect(line.url).toBe(`/play/bnote?room=${room}`);

    expect((await post('/api/invite', { handle: bisi.h, game: 'nope-nope', room }, ada.u)).status).toBe(404);
    expect((await post('/api/invite', { handle: bisi.h, game: 'bnote', room: 'bad' }, ada.u)).status).toBe(400);
    expect((await bisi.u.client.from('game_invites').select('*')).data ?? []).toEqual([]);
    expect((await ada.u.client.rpc('claim_invite', { p_user: ada.u.id, p_handle: bisi.h, p_game: 'bnote', p_room: roomCode() })).error).not.toBeNull();
  });
});

describe('points', () => {
  it('every daily counts, a replayed puzzle counts its best, unverified counts nothing', async () => {
    const ada = await player('pada');
    const d = dayNo();
    await play(ada.u.id, { game_id: dailyIdFor(d - 2), day_no: d - 2, score: 400 });
    await play(ada.u.id, { game_id: dailyIdFor(d - 3), day_no: d - 3, score: 5000, verified: false, source: 'guest_merge' });
    await play(ada.u.id, { game_id: 'space', score: 300 });
    await play(ada.u.id, { game_id: 'space', score: 900 });
    await play(ada.u.id, { game_id: 'bnote', score: 175 });
    const { data, error } = await anon.rpc('players_points', { p_limit: 50 });
    expect(error).toBeNull();
    const row = (data as Array<{ handle: string; name: string; value: number }>).find((r) => r.handle === ada.h);
    expect(row).toEqual({ handle: ada.h, name: 'pada', value: 400 + 900 + 175 });
    expect((await anon.rpc('player_points')).error).not.toBeNull();
  });
});

describe('daily word stats', () => {
  const today = dayNo();
  const puzzle = buildHiddenWords(getGameDef(dailyIdFor(today))!);
  const logOf = (n: number) => {
    const events = puzzle.answers.slice(0, n).map((a, i) => ({ a: a.spans[0]![0], b: a.spans[0]![1], t: (i + 1) * 3000 }));
    return { events, hints: [], finish: events.at(-1)!.t + 1000 };
  };
  type Stat = { key: string; found: number; players: number };

  it("today's words are only for players who have finished; the count comes from replayed plays", async () => {
    const [ada, bisi, late] = [await player('wada'), await player('wbisi'), await player('wlate')];
    const { post } = api();
    expect((await post('/api/plays', { game: { type: 'daily', day_no: today }, log: logOf(3) }, ada.u)).status).toBe(200);
    expect((await post('/api/plays', { game: { type: 'daily', day_no: today }, log: logOf(1) }, bisi.u)).status).toBe(200);
    expect((await db.from('plays').select('found_keys').eq('user_id', ada.u.id).single()).data!.found_keys).toEqual(
      puzzle.answers.slice(0, 3).map((a) => a.key),
    );

    // Not played yet, or not signed in: nothing, so today's answers do not leak.
    expect((await late.u.client.rpc('daily_word_stats', { p_day: today })).data).toEqual([]);
    expect((await anon.rpc('daily_word_stats', { p_day: today })).data).toEqual([]);
    expect((await ada.u.client.rpc('daily_word_stats', { p_day: today + 1 })).data).toEqual([]);

    const stats = (await ada.u.client.rpc('daily_word_stats', { p_day: today })).data as Stat[];
    expect(stats.map((s) => s.key)).toEqual(puzzle.answers.map((a) => a.key));
    const of = (i: number) => stats.find((s) => s.key === puzzle.answers[i]!.key)!;
    // Other tests may have played today too, so compare the two words rather than exact totals.
    expect(of(0).players).toBeGreaterThanOrEqual(2);
    expect(of(0).found - of(2).found).toBeGreaterThanOrEqual(1);
    expect(of(0).found).toBeLessThanOrEqual(of(0).players);
  });

  it('past days are open to everyone', async () => {
    const r = await anon.rpc('daily_word_stats', { p_day: today - 1 });
    expect(r.error).toBeNull();
    expect((r.data as Stat[]).length).toBe(buildHiddenWords(getGameDef(dailyIdFor(today - 1))!).answers.length);
  });
});
