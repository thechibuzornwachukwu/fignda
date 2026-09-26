import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const T = today();
// A day no other test writes to.
const DAY = T - 50;
const svc = admin();
let game: string;
const users: Record<string, { u: TestUser; h: string }> = {};

async function play(name: string, over: Record<string, unknown>) {
  const { error } = await svc.from('plays').insert({
    user_id: users[name]!.u.id,
    game_id: game,
    found: 5,
    total: 10,
    secs: 60,
    score: 500,
    verified: true,
    source: 'worker',
    ...over,
  });
  if (error) throw error;
}

beforeAll(async () => {
  game = (await svc.from('daily').select('game_id').eq('day_no', DAY).single()).data!.game_id;
  for (const n of ['ada', 'bola', 'chi', 'dele', 'emeka']) {
    const u = await makeUser(n);
    const h = uniqueHandle(n);
    await makeProfile(u, n, h);
    users[n] = { u, h };
  }
  await play('ada', { day_no: DAY, score: 500, secs: 60, created_at: '2026-01-01T10:00:00Z' });
  await play('bola', { day_no: DAY, score: 500, secs: 40, created_at: '2026-01-01T10:05:00Z' });
  await play('chi', { day_no: DAY, score: 700, secs: 100, created_at: '2026-01-01T10:10:00Z' });
  await play('dele', { day_no: DAY, score: 900, secs: 10, verified: false, source: 'guest_merge' });
  await play('emeka', { day_no: DAY, score: 500, secs: 40, created_at: '2026-01-01T10:20:00Z' });
});

const h = (n: string) => users[n]!.h;

describe('daily board', () => {
  it('ranks by score, then faster time, then earlier finish; unverified never ranked', async () => {
    const { data, error } = await anon().rpc('daily_board', { p_day: DAY, p_limit: 20 });
    expect(error).toBeNull();
    const ours = data.filter((r: { handle: string }) => Object.values(users).some((x) => x.h === r.handle));
    expect(ours.map((r: { handle: string }) => r.handle)).toEqual([h('chi'), h('bola'), h('emeka'), h('ada')]);
    expect(ours.some((r: { handle: string }) => r.handle === h('dele'))).toBe(false);
    expect(Object.keys(data[0]).sort()).toEqual(['found', 'handle', 'rank', 'score', 'secs', 'total']);
  });

  it('gives a player their own rank and the field size', async () => {
    const { data } = await anon().rpc('daily_rank', { p_day: DAY, p_handle: h('ada') });
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ handle: h('ada'), score: 500 });
    // Ada is behind this run's three better players; earlier test runs may add more on the same day.
    expect(data[0].rank).toBeGreaterThanOrEqual(4);
    expect(data[0].rank).toBeLessThanOrEqual(data[0].players);
    const none = await anon().rpc('daily_rank', { p_day: DAY, p_handle: h('dele') });
    expect(none.data).toEqual([]);
  });

  it('caps the limit and refuses future days', async () => {
    const big = await anon().rpc('daily_board', { p_day: DAY, p_limit: 100000 });
    expect(big.error).toBeNull();
    expect(big.data.length).toBeLessThanOrEqual(100);
    expect((await anon().rpc('daily_board', { p_day: T + 1 })).data).toEqual([]);
    expect((await anon().rpc('daily_rank', { p_day: T + 1, p_handle: h('ada') })).data).toEqual([]);
  });

  it("today's board shows found counts but never the total", async () => {
    const gToday = (await svc.from('daily').select('game_id').eq('day_no', T).single()).data!.game_id;
    await svc.from('plays').insert({
      user_id: users.chi!.u.id,
      game_id: gToday,
      day_no: T,
      found: 4,
      total: 12,
      secs: 30,
      score: 400,
      verified: true,
      source: 'worker',
    });
    const { data } = await anon().rpc('daily_board', { p_day: T });
    const row = data.find((r: { handle: string }) => r.handle === h('chi'));
    expect(row).toMatchObject({ found: 4, total: null });
  });
});

describe('puzzle board', () => {
  it("counts each player's best play once", async () => {
    await play('ada', { game_id: 'bnote', score: 300, secs: 50 });
    await play('ada', { game_id: 'bnote', score: 650, secs: 70 });
    await play('bola', { game_id: 'bnote', score: 650, secs: 20 });
    const { data, error } = await anon().rpc('game_board', { p_game: 'bnote' });
    expect(error).toBeNull();
    const ours = data.filter((r: { handle: string }) => [h('ada'), h('bola')].includes(r.handle));
    expect(ours.map((r: { handle: string; score: number }) => [r.handle, r.score])).toEqual([
      [h('bola'), 650],
      [h('ada'), 650],
    ]);
  });
});

describe('no writes', () => {
  it('board functions are read only and internal helpers stay hidden', async () => {
    const r = await anon().rpc('hit_rate_limit', { p_key: 'x', p_max: 1, p_window_seconds: 60 });
    expect(r.error).not.toBeNull();
  });
});
