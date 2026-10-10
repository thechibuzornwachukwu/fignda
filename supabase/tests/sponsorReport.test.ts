// The sponsor report and the counts behind it (BUILD_PLAN 1b). Counts only, and only for the service role.

import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const svc = admin();
// A day no other test writes to.
const DAY = today() - 70;
// Plays and counts are dated inside one old week so the range tests are not moved by other tests.
const FROM = '2026-02-02';
const TO = '2026-02-08';
let game: string;
const users: Record<string, TestUser> = {};

type Row = { game_id: string; starts: number; ends: number; fulls: number; shares: number; players: number };

async function report(from: string | null = FROM, to: string | null = TO): Promise<Row> {
  const { data, error } = await svc.rpc('sponsor_report', { p_games: [game], p_from: from, p_to: to });
  if (error) throw error;
  return (data as Row[])[0]!;
}

async function play(name: string, at: string, over: Record<string, unknown> = {}) {
  const { error } = await svc.from('plays').insert({
    user_id: users[name]!.id,
    game_id: game,
    found: 5,
    total: 10,
    secs: 60,
    score: 500,
    verified: true,
    source: 'worker',
    created_at: at,
    ...over,
  });
  if (error) throw error;
}

/** A count on a day in the past. Counts are sums, so a second run of the suite adds to the first. */
async function counted(day: string, kind: string, n: number) {
  const cur = await svc.from('puzzle_counts').select('n').eq('game_id', game).eq('day', day).eq('kind', kind).maybeSingle();
  const { error } = await svc.from('puzzle_counts').upsert({ game_id: game, day, kind, n: (cur.data?.n ?? 0) + n });
  if (error) throw error;
}

beforeAll(async () => {
  game = (await svc.from('daily').select('game_id').eq('day_no', DAY).single()).data!.game_id;
  for (const n of ['ada', 'bola', 'chi']) {
    const u = await makeUser(n);
    await makeProfile(u, n, uniqueHandle(n));
    users[n] = u;
  }
});

describe('sponsor_report', () => {
  let before: Row;

  beforeAll(async () => {
    before = await report();
    await counted('2026-02-02', 'start', 40);
    await counted('2026-02-08', 'start', 10);
    await counted('2026-02-03', 'end', 30);
    await counted('2026-02-03', 'full', 6);
    await counted('2026-02-04', 'share', 4);
    // The day before and the day after the week.
    await counted('2026-02-01', 'start', 500);
    await counted('2026-02-09', 'share', 500);
    // Ada plays twice. Chi's merged guest play is not verified. Bola plays in a room, and once outside the week.
    await play('ada', '2026-02-03T10:00:00Z', { found: 10 });
    await play('ada', '2026-02-04T10:00:00Z');
    await play('chi', '2026-02-05T10:00:00Z', { found: 10, verified: false, source: 'guest_merge' });
    await play('chi', '2026-02-09T00:00:01Z');
    const { error } = await svc.from('room_plays').insert({
      room_code: 'ABCDEF',
      game_id: game,
      user_id: users.bola!.id,
      total: 10,
      started_at: '2026-02-06T10:00:00Z',
      ended_at: '2026-02-06T10:05:00Z',
    });
    if (error) throw error;
  });

  it('sums each kind of count over the days asked for, both ends included', async () => {
    const r = await report();
    expect(r.starts - before.starts).toBe(50);
    expect(r.ends - before.ends).toBe(30);
    expect(r.fulls - before.fulls).toBe(6);
    expect(r.shares - before.shares).toBe(4);
    expect((await report('2026-02-08', '2026-02-08')).starts).toBeGreaterThanOrEqual(10);
    const all = await report(null, null);
    expect(all.starts).toBeGreaterThanOrEqual(r.starts + 500);
    expect(all.shares).toBeGreaterThanOrEqual(r.shares + 500);
  });

  it('counts each signed in player once, alone or in a room, and never an unverified play', async () => {
    // Ada (twice, counted once) and Bola (in a room). Not Chi: one play unverified, the other outside the week.
    expect((await report()).players - before.players).toBe(2);
    expect((await report(null, null)).players).toBeGreaterThanOrEqual(3);
  });

  it('answers with counts and nothing about a person', async () => {
    expect(Object.keys(await report()).sort()).toEqual(['ends', 'fulls', 'game_id', 'players', 'shares', 'starts']);
  });

  it('gives a row of zeros for a puzzle nobody played, and no row for one that does not exist', async () => {
    const { data } = await svc.rpc('sponsor_report', { p_games: ['no-such-game', game, game], p_from: '2020-01-01', p_to: '2020-01-02' });
    expect(data).toEqual([{ game_id: game, starts: 0, ends: 0, fulls: 0, shares: 0, players: 0 }]);
  });
});

describe('count_event', () => {
  const day = new Date().toISOString().slice(0, 10);

  it('adds 1 to today for that puzzle and that kind', async () => {
    const before = await report(day, day);
    for (const kind of ['start', 'start', 'end', 'full', 'share', 'share', 'share']) {
      expect((await svc.rpc('count_event', { p_game: game, p_kind: kind })).data).toBe(true);
    }
    const after = await report(day, day);
    expect([after.starts - before.starts, after.ends - before.ends, after.fulls - before.fulls, after.shares - before.shares]).toEqual([2, 1, 1, 3]);
  });

  it('counts nothing for a puzzle that does not exist or a kind that is not one', async () => {
    const before = await report(day, day);
    expect((await svc.rpc('count_event', { p_game: 'no-such-game', p_kind: 'start' })).data).toBe(false);
    for (const kind of ['open', 'START', '', null]) {
      expect((await svc.rpc('count_event', { p_game: game, p_kind: kind })).data).toBe(false);
    }
    expect(await report(day, day)).toEqual(before);
  });

  it('keeps a puzzle, a day, a kind and a number, and nothing else', async () => {
    const row = await svc.from('puzzle_counts').select('*').eq('game_id', game).eq('day', day).eq('kind', 'share').single();
    expect(Object.keys(row.data!).sort()).toEqual(['day', 'game_id', 'kind', 'n']);
  });
});

describe('who can reach it', () => {
  it('no client can read the counts, add to them or run the report', async () => {
    for (const client of [anon(), users.ada!.client]) {
      const read = await client.from('puzzle_counts').select('*');
      expect(read.data ?? []).toEqual([]);
      expect((await client.from('puzzle_counts').insert({ game_id: game, day: '2026-02-03', kind: 'start', n: 999 })).error).not.toBeNull();
      expect((await client.rpc('count_event', { p_game: game, p_kind: 'start' })).error).not.toBeNull();
      expect((await client.rpc('sponsor_report', { p_games: [game] })).error).not.toBeNull();
    }
  });

  it('the share table of the first version is gone', async () => {
    expect((await svc.from('share_counts').select('*')).error).not.toBeNull();
    expect((await svc.rpc('count_share', { p_game: game })).error).not.toBeNull();
  });
});
