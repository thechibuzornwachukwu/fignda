import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const T = today();
const svc = admin();
const P: Record<string, { u: TestUser; h: string }> = {};
const h = (n: string) => P[n]!.h;
const id = (n: string) => P[n]!.u.id;
const as = (n: string) => P[n]!.u.client;
let code = '';

beforeAll(async () => {
  for (const n of ['ann', 'ben', 'cy', 'dee']) {
    const u = await makeUser(n);
    const handle = uniqueHandle(`${n}c`);
    await makeProfile(u, n.toUpperCase(), handle);
    P[n] = { u, h: handle };
  }
  const { data: daily } = await svc.from('daily').select('game_id').eq('day_no', T).single();
  for (const [n, score] of [['ann', 900], ['ben', 1200]] as const) {
    const r = await svc.from('plays').insert({ user_id: id(n), game_id: daily!.game_id, day_no: T, found: 5, total: 10, secs: 60, score, verified: true, source: 'worker' });
    expect(r.error).toBeNull();
  }
});

describe('circles', () => {
  it('a signed in player starts a circle and is its first member', async () => {
    const { data, error } = await as('ann').rpc('create_circle', { p_name: '  Obi   family ' });
    expect(error).toBeNull();
    expect(data).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    code = data;
    const info = (await as('ann').rpc('circle_info', { p_code: code })).data[0];
    expect(info).toMatchObject({ name: 'Obi family', members: 1, is_member: true, is_owner: true });
  });

  it('anon and players without a profile cannot create or join', async () => {
    expect((await anon().rpc('create_circle', { p_name: 'Nope' })).error).not.toBeNull();
    expect((await anon().rpc('join_circle', { p_code: code })).error).not.toBeNull();
    const ghost = await makeUser('ghost');
    expect((await ghost.client.rpc('create_circle', { p_name: 'Ghosts' })).error).not.toBeNull();
    expect((await ghost.client.rpc('join_circle', { p_code: code })).error).not.toBeNull();
  });

  it('bad names are refused: too short, too long, markup', async () => {
    for (const name of ['a', 'x'.repeat(41), '<script>alert(1)</script>', '   ']) {
      expect((await as('ann').rpc('create_circle', { p_name: name })).error, name).not.toBeNull();
    }
  });

  it('an invite shows the name and size only; the tables are for members', async () => {
    const info = (await anon().rpc('circle_info', { p_code: code })).data[0];
    expect(Object.keys(info).sort()).toEqual(['code', 'is_member', 'is_owner', 'members', 'name']);
    expect(info.is_member).toBe(false);
    expect((await anon().rpc('circle_board', { p_code: code, p_day: T })).error).not.toBeNull();
    expect((await as('cy').rpc('circle_board', { p_code: code, p_day: T })).data).toEqual([]);
    expect((await as('cy').rpc('circle_week', { p_code: code })).data).toEqual([]);
  });

  it('the tables cannot be read around the functions', async () => {
    for (const c of [anon(), as('ann'), as('cy')]) {
      expect((await c.from('circles').select('*')).data ?? []).toEqual([]);
      expect((await c.from('circle_members').select('*')).data ?? []).toEqual([]);
    }
    expect((await as('cy').from('circle_members').insert({ circle_id: '00000000-0000-0000-0000-000000000000', user_id: id('cy') })).error).not.toBeNull();
    expect((await as('ann').from('circles').update({ name: 'Hacked' }).eq('code', code)).data ?? []).toEqual([]);
    expect((await svc.from('circles').select('name').eq('code', code).single()).data!.name).toBe('Obi family');
  });

  it('joining is idempotent, and members see the day ranked with those still to play last', async () => {
    expect((await as('ben').rpc('join_circle', { p_code: code })).data).toBe(true);
    expect((await as('ben').rpc('join_circle', { p_code: code })).data).toBe(true);
    expect((await as('cy').rpc('join_circle', { p_code: code })).data).toBe(true);
    expect((await as('cy').rpc('join_circle', { p_code: 'ZZZZZZ' })).data).toBe(false);
    const { data } = await as('cy').rpc('circle_board', { p_code: code, p_day: T });
    expect(data.map((r: { handle: string }) => r.handle)).toEqual([h('ben'), h('ann'), h('cy')]);
    expect(data.map((r: { rank: number | null }) => r.rank)).toEqual([1, 2, null]);
    expect(data[2].score).toBeNull();
    // Today's total stays masked, like everywhere else.
    expect(data[0].total).toBeNull();
    expect(Object.keys(data[0]).sort()).toEqual(['found', 'handle', 'name', 'rank', 'score', 'secs', 'total']);
  });

  it('a future day shows nobody as played', async () => {
    const { data } = await as('ann').rpc('circle_board', { p_code: code, p_day: T + 1 });
    expect(data.every((r: { score: number | null }) => r.score === null)).toBe(true);
  });

  it('the 7 day table adds verified dailies only', async () => {
    const { data } = await as('ann').rpc('circle_week', { p_code: code });
    expect(data.map((r: { handle: string; score: number; days: number }) => [r.handle, Number(r.score), Number(r.days)])).toEqual([
      [h('ben'), 1200, 1],
      [h('ann'), 900, 1],
      [h('cy'), 0, 0],
    ]);
  });

  it('only the owner removes members, and never themselves', async () => {
    expect((await as('ben').rpc('remove_circle_member', { p_code: code, p_handle: h('cy') })).data).toBe(false);
    expect((await as('ann').rpc('remove_circle_member', { p_code: code, p_handle: h('ann') })).data).toBe(false);
    expect((await as('ann').rpc('remove_circle_member', { p_code: code, p_handle: h('cy') })).data).toBe(true);
    expect((await as('cy').rpc('circle_board', { p_code: code, p_day: T })).data).toEqual([]);
  });

  it('my_circles lists only your own', async () => {
    expect((await as('ben').rpc('my_circles')).data.map((c: { code: string }) => c.code)).toEqual([code]);
    expect((await as('dee').rpc('my_circles')).data).toEqual([]);
    expect((await anon().rpc('my_circles')).error).not.toBeNull();
  });

  it('an owner who leaves hands the circle on; the last one out closes it', async () => {
    await as('ann').rpc('leave_circle', { p_code: code });
    expect((await as('ben').rpc('circle_info', { p_code: code })).data[0]).toMatchObject({ members: 1, is_owner: true });
    await as('dee').rpc('leave_circle', { p_code: code }); // a stranger leaving changes nothing
    expect((await as('ben').rpc('circle_info', { p_code: code })).data[0].members).toBe(1);
    await as('ben').rpc('leave_circle', { p_code: code });
    expect((await anon().rpc('circle_info', { p_code: code })).data).toEqual([]);
  });
});

describe('avatars', () => {
  it('you set your own, in the part code alphabet only', async () => {
    expect((await as('ann').from('profiles').update({ avatar: 'b0s3h1c0e0m0f0x0k0t0a0o1' }).eq('id', id('ann'))).error).toBeNull();
    for (const bad of ['<svg onload=alert(1)>', 'javascript:alert(1)', 'b0 s3', 'Z9', 'b0'.repeat(25), 'b123', 'b', '9b', 'b0;drop']) {
      expect((await as('ann').from('profiles').update({ avatar: bad }).eq('id', id('ann'))).error, bad).not.toBeNull();
    }
    expect((await svc.from('profiles').select('avatar').eq('id', id('ann')).single()).data!.avatar).toBe('b0s3h1c0e0m0f0x0k0t0a0o1');
    // A part added later (festive is z) saves without a migration, and so does a longer code.
    expect((await as('ben').from('profiles').update({ avatar: 'b0s3h1c0e4m0f0x0k0t0a0o1z11' }).eq('id', id('ben'))).error).toBeNull();
  });

  it('nobody sets someone else’s, and anon sets none', async () => {
    await as('ben').from('profiles').update({ avatar: 'b1' }).eq('id', id('ann'));
    await anon().from('profiles').update({ avatar: 'b2' }).eq('id', id('ann'));
    expect((await svc.from('profiles').select('avatar').eq('id', id('ann')).single()).data!.avatar).toBe('b0s3h1c0e0m0f0x0k0t0a0o1');
  });

  it('anyone can read it, like a name', async () => {
    const { data } = await anon().from('profiles').select('handle, avatar').eq('handle', h('ann'));
    expect(data).toEqual([{ handle: h('ann'), avatar: 'b0s3h1c0e0m0f0x0k0t0a0o1' }]);
  });
});
