import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const T = today();
const svc = admin();
const P: Record<string, { u: TestUser; h: string }> = {};
const h = (n: string) => P[n]!.h;
const id = (n: string) => P[n]!.u.id;
const as = (n: string) => P[n]!.u.client;
const ep = (tag: string) => `https://fcm.googleapis.com/fcm/send/${tag}-${Math.random().toString(36).slice(2)}`;

async function played(name: string, day: number, verified = true) {
  const game = (await svc.from('daily').select('game_id').eq('day_no', day).single()).data!.game_id;
  const { error } = await svc.from('plays').insert({
    user_id: id(name), game_id: game, day_no: day, found: 3, total: 10, secs: 60, score: 300,
    verified, source: verified ? 'worker' : 'guest_merge',
  });
  if (error) throw error;
}

beforeAll(async () => {
  for (const n of ['amy', 'bo', 'cat', 'dan']) {
    const u = await makeUser(n);
    const handle = uniqueHandle(`${n}s`);
    await makeProfile(u, n, handle);
    P[n] = { u, h: handle };
  }
});

describe('push_subs', () => {
  it('a player saves their own browser, with a real push service and a real time zone', async () => {
    const mine = ep('amy');
    expect((await as('amy').from('push_subs').insert({ endpoint: mine, tz: 'Africa/Lagos', hour: 19 })).error).toBeNull();
    expect((await as('amy').from('push_subs').select('endpoint, tz, hour')).data).toEqual([{ endpoint: mine, tz: 'Africa/Lagos', hour: 19 }]);
    expect((await as('amy').from('push_subs').update({ hour: 8 }).eq('endpoint', mine)).error).toBeNull();

    expect((await as('amy').from('push_subs').insert({ endpoint: 'https://evil.example/hook', tz: 'Africa/Lagos' })).error).not.toBeNull();
    expect((await as('amy').from('push_subs').insert({ endpoint: 'http://127.0.0.1:54321/x-internal-service', tz: 'Africa/Lagos' })).error).not.toBeNull();
    expect((await as('amy').from('push_subs').insert({ endpoint: ep('tz'), tz: 'Mars/Olympus' })).error).not.toBeNull();
    expect((await as('amy').from('push_subs').insert({ endpoint: ep('hr'), tz: 'UTC', hour: 24 })).error).not.toBeNull();
  });

  it('nobody reads, changes or takes over another player\'s browser', async () => {
    const mine = ep('bo');
    await as('bo').from('push_subs').insert({ endpoint: mine, tz: 'UTC', hour: 7 });
    expect((await as('cat').from('push_subs').select('endpoint').eq('endpoint', mine)).data).toEqual([]);
    expect((await anon().from('push_subs').select('endpoint')).data ?? []).toEqual([]);
    await as('cat').from('push_subs').update({ hour: 3 }).eq('endpoint', mine);
    await as('cat').from('push_subs').delete().eq('endpoint', mine);
    expect((await svc.from('push_subs').select('hour, user_id').eq('endpoint', mine)).data).toEqual([{ hour: 7, user_id: id('bo') }]);
    // Not as someone else, and not columns the server owns.
    expect((await as('cat').from('push_subs').insert({ endpoint: ep('x'), tz: 'UTC', user_id: id('bo') })).error).not.toBeNull();
    expect((await as('bo').from('push_subs').update({ last_day: 0 }).eq('endpoint', mine)).error).not.toBeNull();
    expect((await anon().from('push_subs').insert({ endpoint: ep('anon'), tz: 'UTC' })).error).not.toBeNull();
  });

  it('five browsers per player', async () => {
    for (let i = 0; i < 5; i++) expect((await as('dan').from('push_subs').insert({ endpoint: ep(`d${i}`), tz: 'UTC' })).error).toBeNull();
    expect((await as('dan').from('push_subs').insert({ endpoint: ep('d6'), tz: 'UTC' })).error).not.toBeNull();
  });

  it('clients cannot run the cron or read reminder context', async () => {
    expect((await as('amy').rpc('claim_due_reminders')).error).not.toBeNull();
    expect((await as('amy').rpc('reminder_context', { p_endpoint: ep('z') })).error).not.toBeNull();
    expect((await anon().rpc('claim_due_reminders')).error).not.toBeNull();
  });
});

describe('friend streaks', () => {
  type Row = { handle: string; state: string; streak: number; you_today: boolean; them_today: boolean };
  const list = async (n: string) => (await as(n).rpc('my_friend_streaks')).data as Row[];
  const row = async (n: string, other: string) => (await list(n)).find((r) => r.handle === h(other));

  it('one asks, the other sees it, and asking back starts it', async () => {
    expect((await as('amy').rpc('friend_streak_ask', { p_handle: h('bo') })).data).toBe('asked');
    expect((await as('amy').rpc('friend_streak_ask', { p_handle: h('bo') })).data).toBe('exists');
    expect((await row('amy', 'bo'))!.state).toBe('outgoing');
    expect((await row('bo', 'amy'))!.state).toBe('incoming');
    // A third player sees nothing of it.
    expect(await row('cat', 'amy')).toBeUndefined();
    expect((await as('bo').rpc('friend_streak_ask', { p_handle: h('amy') })).data).toBe('started');
    expect(await row('amy', 'bo')).toMatchObject({ state: 'active', streak: 0, you_today: false, them_today: false });
  });

  it('grows only on days both have a verified daily, from the day it started', async () => {
    // Both played yesterday, but the streak started today: yesterday does not count.
    await svc.from('plays').delete().in('user_id', [id('amy'), id('bo')]);
    await played('amy', T - 1);
    await played('bo', T - 1);
    expect((await row('amy', 'bo'))!.streak).toBe(0);

    // Pretend it started 3 days ago. Day T-3: both. T-2: both. T-1: both. Today: only Amy so far.
    await svc.from('friend_streaks').update({ start_day: T - 3 }).or(`low.eq.${id('amy')},high.eq.${id('amy')}`);
    await played('amy', T - 3);
    await played('bo', T - 3);
    await played('amy', T - 2);
    await played('bo', T - 2, false); // unverified: does not count
    await played('amy', T);
    // T-2 broke it, so the run is T-1 only, still alive until today ends.
    expect(await row('amy', 'bo')).toMatchObject({ streak: 1, you_today: true, them_today: false });
    expect(await row('bo', 'amy')).toMatchObject({ streak: 1, you_today: false, them_today: true });
    await played('bo', T);
    expect((await row('amy', 'bo'))!.streak).toBe(2);
  });

  it('either player can end it; nobody else can', async () => {
    expect((await as('cat').rpc('friend_streak_end', { p_handle: h('amy') })).data).toBe(false);
    expect((await row('amy', 'bo'))!.state).toBe('active');
    expect((await as('bo').rpc('friend_streak_end', { p_handle: h('amy') })).data).toBe(true);
    expect(await row('amy', 'bo')).toBeUndefined();
  });

  it('not with yourself, a stranger to the game, or as a guest; the table itself is closed', async () => {
    expect((await as('amy').rpc('friend_streak_ask', { p_handle: h('amy') })).error).not.toBeNull();
    expect((await as('amy').rpc('friend_streak_ask', { p_handle: 'nobody.here' })).error).not.toBeNull();
    expect((await anon().rpc('friend_streak_ask', { p_handle: h('amy') })).error).not.toBeNull();
    expect((await anon().rpc('my_friend_streaks')).error).not.toBeNull();
    expect((await as('amy').from('friend_streaks').select('*')).data ?? []).toEqual([]);
    expect((await as('amy').from('friend_streaks').insert({ low: id('amy'), high: id('bo'), asked_by: id('amy'), start_day: 1 })).error).not.toBeNull();
    expect((await as('amy').rpc('pair_streak', { a: id('amy'), b: id('bo'), p_start: 1 })).error).not.toBeNull();
  });

  it('five running streaks at most', async () => {
    for (let i = 0; i < 6; i++) {
      const u = await makeUser(`f${i}`);
      const handle = uniqueHandle(`f${i}`);
      await makeProfile(u, `f${i}`, handle);
      await u.client.rpc('friend_streak_ask', { p_handle: h('cat') });
      const r = await as('cat').rpc('friend_streak_ask', { p_handle: handle });
      if (i < 5) expect(r.data).toBe('started');
      else expect(r.error?.message).toContain('streak limit');
    }
    expect((await list('cat')).filter((r) => r.state === 'active')).toHaveLength(5);
  });
});
