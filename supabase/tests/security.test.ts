// Database security suite. Every check goes through the public API the app uses,
// as anon, as signed-in users, and with tokens the server never issued.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ANON,
  URL,
  admin,
  anon,
  forgedJwt,
  makeProfile,
  makeUser,
  rest,
  shareCode,
  today,
  uniqueHandle,
  type TestUser,
} from './helpers';

let a: TestUser;
let b: TestUser;
let aHandle: string;
let customCode: string;
let shareA: string;
const T = today();

/** Denied means an error, or nothing came back. */
function expectNoRows(res: { data: unknown; error: unknown }) {
  if (res.error) return;
  expect(res.data ?? []).toEqual([]);
}

async function playsOf(c: SupabaseClient) {
  const { data, error } = await c.from('plays').select('*');
  expect(error).toBeNull();
  return data!;
}

beforeAll(async () => {
  a = await makeUser('a');
  b = await makeUser('b');
  aHandle = uniqueHandle('a');
  await makeProfile(a, 'Ada Obi', aHandle);
  await makeProfile(b, 'Bola', uniqueHandle('b'));

  // Worker-side fixtures (service role).
  const svc = admin();
  customCode = shareCode();
  const custom = await svc.from('games').insert({
    id: `custom-${customCode.toLowerCase()}`,
    kind: 'custom',
    owner_id: a.id,
    share_code: customCode,
    category: 'Custom',
    title: 'Secret topic',
    noun: 'secret words',
    text: 'Pat omitted nothing.',
    dict: ['Atom'],
  });
  expect(custom.error).toBeNull();

  shareA = shareCode();
  const share = await svc.from('shares').insert({ code: shareA, user_id: a.id, game_id: 'bible', kind: 'result', payload: { score: 1 } });
  expect(share.error).toBeNull();

  const plays = await svc.from('plays').insert([
    { user_id: a.id, game_id: 'bible', found: 3, total: 30, secs: 60, score: 300, verified: true, source: 'worker' },
    { user_id: a.id, game_id: 'science', found: 1, total: 14, secs: 60, score: 100, verified: false, source: 'worker' },
    { user_id: b.id, game_id: 'bible', found: 5, total: 30, secs: 90, score: 500, verified: true, source: 'worker' },
  ]);
  expect(plays.error).toBeNull();
});

describe('emails stay in auth.users', () => {
  it('anon cannot reach the auth schema', async () => {
    const r = await anon().schema('auth').from('users').select('email');
    expect(r.error).not.toBeNull();
  });

  it('a signed-in user cannot reach the auth schema', async () => {
    const r = await a.client.schema('auth').from('users').select('email');
    expect(r.error).not.toBeNull();
  });

  it('admin endpoints refuse the anon key and user tokens', async () => {
    for (const token of [ANON, a.token]) {
      const res = await fetch(`${URL}/auth/v1/admin/users`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
      expect([401, 403]).toContain(res.status);
    }
  });

  it('profiles expose name and handle only', async () => {
    const { data, error } = await anon().from('profiles').select('*').eq('id', a.id).single();
    expect(error).toBeNull();
    expect(Object.keys(data!).sort()).toEqual(['created_at', 'handle', 'id', 'name', 'updated_at']);
    expect(JSON.stringify(data)).not.toContain('@test.fignda.local');
  });

  it('no public function or view returns an email', async () => {
    const pub = await anon().from('plays_public').select('*');
    expect(JSON.stringify(pub.data)).not.toContain('@');
    const g = await anon().rpc('get_game_by_code', { p_code: customCode });
    expect(JSON.stringify(g.data)).not.toContain('@test');
  });

  it('GraphQL cannot select an email field', async () => {
    const res = await fetch(`${URL}/graphql/v1`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ profilesCollection { edges { node { email } } } }' }),
    });
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('@test.fignda.local');
    expect(body.errors ?? body.data == null).toBeTruthy();
  });
});

describe('daily_answers stay hidden until the day ends', () => {
  it.each([
    ['anon', () => anon()],
    ['signed in', () => a.client],
  ])('%s: today and future are hidden, past is readable', async (_, c) => {
    const client = c();
    expectNoRows(await client.from('daily_answers').select('*').eq('day_no', T));
    expectNoRows(await client.from('daily_answers').select('*').gt('day_no', T).limit(5));
    const all = await client.from('daily_answers').select('day_no');
    expect(all.error).toBeNull();
    expect(all.data!.every((r) => r.day_no < T)).toBe(true);
    const past = await client.from('daily_answers').select('answers,total').eq('day_no', T - 1).single();
    expect(past.error).toBeNull();
    expect(past.data!.total).toBeGreaterThan(0);
  });

  it('future days are not even scheduled publicly', async () => {
    expectNoRows(await anon().from('daily').select('*').gt('day_no', T));
    const t = await anon().from('daily').select('game_id').eq('day_no', T).single();
    expect(t.error).toBeNull();
  });

  it('nobody but the Worker writes dailies', async () => {
    for (const c of [anon(), a.client]) {
      expect((await c.from('daily_answers').insert({ day_no: 99999, answers: ['x'] })).error).not.toBeNull();
      await c.from('daily_answers').update({ answers: ['hacked'] }).eq('day_no', T - 1);
      await c.from('daily_answers').delete().eq('day_no', T - 1);
      expect((await c.from('daily').insert({ day_no: 99999, game_id: 'bible' })).error).not.toBeNull();
      await c.from('daily').update({ game_id: 'bnote' }).eq('day_no', T);
    }
    const past = await admin().from('daily_answers').select('answers').eq('day_no', T - 1).single();
    expect(past.data!.answers).not.toContain('hacked');
    const day = await admin().from('daily').select('game_id').eq('day_no', T).single();
    expect(day.data!.game_id).not.toBe('bnote');
  });

  it('a forged token cannot read today', async () => {
    const res = await rest(`daily_answers?day_no=eq.${T}`, forgedJwt(a.id));
    expect(res.status).toBe(401);
  });
});

describe('profiles', () => {
  it('anon cannot write', async () => {
    const c = anon();
    expect((await c.from('profiles').insert({ id: a.id, name: 'x', handle: uniqueHandle() })).error).not.toBeNull();
    await c.from('profiles').update({ name: 'pwned' }).eq('id', a.id);
    await c.from('profiles').delete().eq('id', a.id);
    const r = await admin().from('profiles').select('name').eq('id', a.id).single();
    expect(r.data!.name).toBe('Ada Obi');
  });

  it("a user cannot create a profile for someone else", async () => {
    const c = await makeUser('c');
    const r = await c.client.from('profiles').insert({ id: b.id, name: 'Not Bola', handle: uniqueHandle() });
    expect(r.error).not.toBeNull();
  });

  it("a user cannot edit or delete someone else's profile", async () => {
    await b.client.from('profiles').update({ name: 'pwned', handle: uniqueHandle() }).eq('id', a.id);
    await b.client.from('profiles').delete().eq('id', a.id);
    const r = await admin().from('profiles').select('name, handle').eq('id', a.id).single();
    expect(r.data).toEqual({ name: 'Ada Obi', handle: aHandle });
  });

  it('a user cannot move their row to another id or delete it', async () => {
    const r = await a.client.from('profiles').update({ id: b.id }).eq('id', a.id);
    expect(r.error).not.toBeNull();
    const d = await a.client.from('profiles').delete().eq('id', a.id);
    expect(d.error).not.toBeNull();
  });

  it('mass assignment of server columns is refused', async () => {
    const c = await makeUser('m');
    const r = await c.client
      .from('profiles')
      .insert({ id: c.id, name: 'M', handle: uniqueHandle(), created_at: '2000-01-01T00:00:00Z' });
    expect(r.error).not.toBeNull();
  });

  it('can edit own name and handle', async () => {
    const c = await makeUser('e');
    await makeProfile(c, 'Eve', uniqueHandle('e'));
    const h = uniqueHandle('ev');
    const r = await c.client.from('profiles').update({ name: 'Eve Obi', handle: h }).eq('id', c.id).select().single();
    expect(r.error).toBeNull();
    expect(r.data).toMatchObject({ name: 'Eve Obi', handle: h });
  });

  // A fresh user per case, so each one fails for its own reason only.
  describe('handle rules', () => {
    let c: TestUser;
    beforeEach(async () => {
      c = await makeUser('h');
    });
    it.each([
      ['too short', 'a'],
      ['too long', 'a'.repeat(21)],
      ['uppercase', 'Ada'],
      ['space', 'ada obi'],
      ['at sign', '@ada'],
      ['hyphen', 'ada-obi'],
      ['accent', 'adé'],
      ['emoji', 'ada😀'],
      ['sql', "a'); drop table profiles;--"],
      ['reserved admin', 'admin'],
      ['reserved fignda', 'fignda'],
      ['reserved support', 'support'],
      ['reserved root', 'root'],
      ['reserved help', 'help'],
      ['empty', ''],
    ])('rejects %s', async (_, handle) => {
      const r = await c.client.from('profiles').insert({ id: c.id, name: 'Hal', handle });
      expect(r.error).not.toBeNull();
    });

    it('rejects a taken handle', async () => {
      const r = await c.client.from('profiles').insert({ id: c.id, name: 'Hal', handle: aHandle });
      expect(r.error).not.toBeNull();
    });

    it('accepts the allowed alphabet at the edges', async () => {
      const edge = `a.${uniqueHandle('_')}`.slice(0, 20);
      const r = await c.client.from('profiles').insert({ id: c.id, name: 'Hal', handle: edge });
      expect(r.error).toBeNull();
    });
  });

  describe('name rules', () => {
    let c: TestUser;
    beforeEach(async () => {
      c = await makeUser('n');
    });
    it.each([
      ['empty', ''],
      ['only spaces', '   '],
      ['padded', ' Ada '],
      ['too long', 'x'.repeat(41)],
      ['control char', 'Ada\u0007'],
      ['newline', 'Ada\nObi'],
    ])('rejects %s', async (_, name) => {
      const r = await c.client.from('profiles').insert({ id: c.id, name, handle: uniqueHandle() });
      expect(r.error).not.toBeNull();
    });

    it('stores markup as plain text, unchanged', async () => {
      const name = `<img src=x onerror=alert(1)>"'`;
      const r = await c.client.from('profiles').insert({ id: c.id, name, handle: uniqueHandle() }).select('name').single();
      expect(r.error).toBeNull();
      expect(r.data!.name).toBe(name);
    });
  });
});

describe('games', () => {
  it('anon lists curated games only', async () => {
    const { data, error } = await anon().from('games').select('id, kind');
    expect(error).toBeNull();
    expect(data!.length).toBe(21);
    expect(data!.every((g) => g.kind === 'curated')).toBe(true);
  });

  it("another user cannot list someone's custom game; the owner can", async () => {
    const other = await b.client.from('games').select('id').eq('kind', 'custom');
    expect(other.data).toEqual([]);
    const own = await a.client.from('games').select('id, share_code').eq('kind', 'custom');
    expect(own.data).toEqual([{ id: `custom-${customCode.toLowerCase()}`, share_code: customCode }]);
  });

  it('the share code opens a custom game, in any case', async () => {
    for (const code of [customCode, customCode.toLowerCase()]) {
      const r = await anon().rpc('get_game_by_code', { p_code: code });
      expect(r.error).toBeNull();
      expect(r.data).toHaveLength(1);
      expect(r.data[0].title).toBe('Secret topic');
      expect(Object.keys(r.data[0])).not.toContain('owner_id');
    }
  });

  it.each([
    ['wrong code', 'AAAAAAAA'],
    ['sql', "' OR '1'='1"],
    ['wildcard', '%'],
    ['too long', 'A'.repeat(64)],
    ['empty', ''],
  ])('get_game_by_code returns nothing for %s', async (_, code) => {
    const r = await anon().rpc('get_game_by_code', { p_code: code });
    expect(r.error).toBeNull();
    expect(r.data).toEqual([]);
  });

  it('clients cannot write games', async () => {
    for (const c of [anon(), a.client]) {
      const r = await c.from('games').insert({
        id: 'evil',
        kind: 'curated',
        category: 'x',
        title: 'x',
        noun: 'x',
        text: 'x',
        dict: [],
      });
      expect(r.error).not.toBeNull();
      await c.from('games').update({ title: 'pwned' }).eq('id', 'bible');
      await c.from('games').delete().eq('id', 'bible');
    }
    const g = await admin().from('games').select('title').eq('id', 'bible').single();
    expect(g.data!.title).toBe('The classic');
  });
});

describe('plays', () => {
  it('anon sees no plays', async () => {
    expectNoRows(await anon().from('plays').select('*'));
  });

  it('a user sees only their own plays', async () => {
    const mine = await playsOf(a.client);
    expect(mine.length).toBe(2);
    expect(mine.every((p) => p.user_id === a.id)).toBe(true);
    const theirs = await b.client.from('plays').select('*').eq('user_id', a.id);
    expect(theirs.data).toEqual([]);
  });

  it('clients cannot insert, update or delete plays', async () => {
    const ins = await a.client.from('plays').insert({
      user_id: a.id,
      game_id: 'bible',
      found: 30,
      total: 30,
      secs: 1,
      score: 999999,
      verified: true,
      source: 'worker',
    });
    expect(ins.error).not.toBeNull();
    await a.client.from('plays').update({ score: 999999, verified: true }).eq('user_id', a.id);
    await a.client.from('plays').delete().eq('user_id', a.id);
    const rows = await admin().from('plays').select('score').eq('user_id', a.id);
    expect(rows.data!.map((r) => r.score).sort()).toEqual([100, 300]);
  });

  it('the public view shows handle, score and time for verified plays only', async () => {
    const { data, error } = await anon().from('plays_public').select('*');
    expect(error).toBeNull();
    expect(Object.keys(data![0]!).sort()).toEqual(['created_at', 'day_no', 'game_id', 'handle', 'id', 'score', 'secs']);
    const aRows = data!.filter((r) => r.handle === aHandle);
    expect(aRows.map((r) => r.score)).toEqual([300]); // the unverified 100 is not ranked
  });

  it('clients cannot write through the public view', async () => {
    const r = await a.client.from('plays_public').update({ score: 1 }).eq('handle', aHandle);
    expect(r.error).not.toBeNull();
  });
});

describe('shares', () => {
  it('cannot be listed', async () => {
    for (const c of [anon(), a.client]) expectNoRows(await c.from('shares').select('*'));
  });

  it('opens by code only', async () => {
    const r = await anon().rpc('get_share', { p_code: shareA });
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(1);
    expect(Object.keys(r.data[0])).not.toContain('user_id');
    expect((await anon().rpc('get_share', { p_code: "' or 1=1 --" })).data).toEqual([]);
  });

  it('clients cannot write shares', async () => {
    const r = await a.client.from('shares').insert({ code: shareCode(), user_id: a.id, game_id: 'bible', kind: 'result', payload: {} });
    expect(r.error).not.toBeNull();
  });
});

describe('functions', () => {
  it('internal helpers are not callable', async () => {
    const r = await anon().rpc('fignda_score', { found: 1, total: 1, hints: 0, misses: 0, secs: 0 });
    expect(r.error).not.toBeNull();
    const t = await a.client.rpc('touch_updated_at');
    expect(t.error).not.toBeNull();
  });

  it('anon cannot call account functions', async () => {
    expect((await anon().rpc('delete_account')).error).not.toBeNull();
    expect((await anon().rpc('merge_guest_plays', { items: [] })).error).not.toBeNull();
  });
});

describe('guest merge', () => {
  let g: TestUser;
  beforeEach(async () => {
    g = await makeUser('g');
  });

  it('stores unverified plays and recomputes the score on the server', async () => {
    const day = T - 1;
    const r = await g.client.rpc('merge_guest_plays', {
      items: [{ day_no: day, found: 999, hints: 0, misses: 0, secs: 5, score: 1e9, total: 1, verified: true, user_id: b.id }],
    });
    expect(r.error).toBeNull();
    expect(r.data).toBe(1);
    const [p] = await playsOf(g.client);
    const expected = await admin().from('daily_answers').select('total').eq('day_no', day).single();
    const total = expected.data!.total as number;
    expect(p).toMatchObject({ user_id: g.id, day_no: day, found: total, total, verified: false, source: 'guest_merge' });
    expect(p.score).toBe(total * 100 + 595);
    expect((await playsOf(b.client)).some((x) => x.source === 'guest_merge')).toBe(false);
  });

  it('skips future days, bad numbers and unknown days', async () => {
    const r = await g.client.rpc('merge_guest_plays', {
      items: [
        { day_no: T + 1, found: 1, hints: 0, misses: 0, secs: 1 },
        { day_no: 0, found: 1, hints: 0, misses: 0, secs: 1 },
        { day_no: -3, found: 1, hints: 0, misses: 0, secs: 1 },
        { day_no: 1.5, found: 1, hints: 0, misses: 0, secs: 1 },
        { day_no: '2; drop table plays', found: 1, hints: 0, misses: 0, secs: 1 },
        { day_no: 99999999, found: 1, hints: 0, misses: 0, secs: 1 },
        { day_no: T - 2, found: -1, hints: 0, misses: 0, secs: 1 },
        { day_no: T - 2, found: 1, hints: 0, misses: 0, secs: 1e12 },
        { day_no: T - 2 },
        'not an object',
        null,
      ],
    });
    expect(r.error).toBeNull();
    expect(r.data).toBe(0);
    expect(await playsOf(g.client)).toEqual([]);
  });

  it('one play per daily, however often it is sent', async () => {
    const item = { day_no: T - 3, found: 1, hints: 0, misses: 0, secs: 10 };
    expect((await g.client.rpc('merge_guest_plays', { items: [item, item, { ...item, found: 2 }] })).data).toBe(1);
    expect((await g.client.rpc('merge_guest_plays', { items: [{ ...item, found: 5 }] })).data).toBe(0);
    const rows = await playsOf(g.client);
    expect(rows).toHaveLength(1);
    expect(rows[0].found).toBe(1);
  });

  it('rejects non-arrays and oversized batches', async () => {
    expect((await g.client.rpc('merge_guest_plays', { items: { day_no: 1 } })).error).not.toBeNull();
    const many = Array.from({ length: 61 }, (_, i) => ({ day_no: i + 1, found: 0, hints: 0, misses: 0, secs: 0 }));
    expect((await g.client.rpc('merge_guest_plays', { items: many })).error).not.toBeNull();
  });
});

describe('delete account', () => {
  it('cascades profile, plays, shares and custom games, and leaves others alone', async () => {
    const d = await makeUser('d');
    await makeProfile(d, 'Dele', uniqueHandle('d'));
    const svc = admin();
    const code = shareCode();
    await svc.from('games').insert({
      id: `custom-${code.toLowerCase()}`,
      kind: 'custom',
      owner_id: d.id,
      share_code: code,
      category: 'Custom',
      title: 'Mine',
      noun: 'words',
      text: 'Pat omitted nothing.',
      dict: ['Atom'],
    });
    await svc.from('shares').insert({ code: shareCode(), user_id: d.id, game_id: 'bible', kind: 'result', payload: {} });
    await svc.from('plays').insert({ user_id: d.id, game_id: 'bible', found: 1, total: 30, secs: 1, score: 100, verified: true, source: 'worker' });

    const r = await d.client.rpc('delete_account');
    expect(r.error).toBeNull();

    expect((await svc.auth.admin.getUserById(d.id)).data.user).toBeNull();
    for (const [table, col] of [
      ['profiles', 'id'],
      ['plays', 'user_id'],
      ['shares', 'user_id'],
      ['games', 'owner_id'],
    ] as const) {
      const left = await svc.from(table).select('*').eq(col, d.id);
      expect(left.data, table).toEqual([]);
    }
    expect((await svc.from('profiles').select('id').eq('id', a.id)).data).toHaveLength(1);
    expect((await playsOf(a.client)).length).toBe(2);

    // The old token no longer reaches any data.
    expect(await playsOf(d.client)).toEqual([]);
    const again = await d.client.from('profiles').insert({ id: d.id, name: 'Back', handle: uniqueHandle() });
    expect(again.error).not.toBeNull();
  });
});

describe('forged tokens', () => {
  it.each([
    ['wrong signature', () => forgedJwt(a.id)],
    ['alg none', () => forgedJwt(a.id, 'authenticated', 'none')],
    ['service role claim', () => forgedJwt(a.id, 'service_role')],
    ['garbage', () => 'not.a.jwt'],
  ])('%s is rejected', async (_, make) => {
    const res = await rest('plays?select=*', make());
    expect(res.status).toBe(401);
    const res2 = await rest('rpc/delete_account', make(), { method: 'POST', body: '{}' });
    expect(res2.status).toBe(401);
  });
});
