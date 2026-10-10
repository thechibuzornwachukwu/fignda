// The sponsor report and the share count behind it (BUILD_PLAN 1b). Counts only, and only for the service role.

import { admin, anon, makeProfile, makeUser, today, uniqueHandle, type TestUser } from './helpers';

const svc = admin();
// A day no other test writes to.
const DAY = today() - 70;
// Plays are dated inside one old week so the range tests are not moved by other tests.
const FROM = '2026-02-02';
const TO = '2026-02-08';
let game: string;
const users: Record<string, TestUser> = {};

type Row = { game_id: string; players: number; plays: number; room_plays: number; finished: number; shares: number };

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
    // Ada plays twice and finishes once. Bola gives up. Chi's merged guest play is not verified.
    await play('ada', '2026-02-03T10:00:00Z', { found: 10 });
    await play('ada', '2026-02-04T10:00:00Z');
    await play('bola', '2026-02-08T23:59:00Z');
    await play('chi', '2026-02-05T10:00:00Z', { found: 10, verified: false, source: 'guest_merge' });
    // Outside the week.
    await play('bola', '2026-02-09T00:00:01Z', { found: 10 });
    // Bola again, in a room, and Chi for the first time.
    for (const n of ['bola', 'chi']) {
      const { error } = await svc.from('room_plays').insert({
        room_code: 'ABCDEF',
        game_id: game,
        user_id: users[n]!.id,
        total: 10,
        started_at: '2026-02-06T10:00:00Z',
        ended_at: '2026-02-06T10:05:00Z',
      });
      if (error) throw error;
    }
  });

  it('counts players once, plays alone and in a room, and finishes among plays alone', async () => {
    const r = await report();
    expect(r.players - before.players).toBe(3);
    expect(r.plays - before.plays).toBe(5);
    expect(r.room_plays - before.room_plays).toBe(2);
    expect(r.finished - before.finished).toBe(1);
  });

  it('includes both ends of the range and nothing outside it', async () => {
    const lastDay = await report('2026-02-08', '2026-02-08');
    const dayAfter = await report('2026-02-09', '2026-02-09');
    expect(lastDay.plays).toBeGreaterThanOrEqual(1);
    expect(dayAfter.finished).toBeGreaterThanOrEqual(1);
    expect((await report(null, null)).plays).toBeGreaterThanOrEqual(lastDay.plays + dayAfter.plays);
  });

  it('answers with counts and nothing about a person', async () => {
    expect(Object.keys(await report()).sort()).toEqual(['finished', 'game_id', 'players', 'plays', 'room_plays', 'shares']);
  });

  it('gives a row of zeros for a puzzle nobody played, and no row for one that does not exist', async () => {
    const { data } = await svc.rpc('sponsor_report', { p_games: ['no-such-game', game, game], p_from: '2020-01-01', p_to: '2020-01-02' });
    expect(data).toEqual([{ game_id: game, players: 0, plays: 0, room_plays: 0, finished: 0, shares: 0 }]);
  });
});

describe('count_share', () => {
  it('adds 1 to today for that puzzle, and nothing for a puzzle that does not exist', async () => {
    const day = new Date().toISOString().slice(0, 10);
    const before = (await report(day, day)).shares;
    expect((await svc.rpc('count_share', { p_game: game })).data).toBe(true);
    expect((await svc.rpc('count_share', { p_game: game })).data).toBe(true);
    expect((await svc.rpc('count_share', { p_game: 'no-such-game' })).data).toBe(false);
    expect((await report(day, day)).shares - before).toBe(2);
    const row = await svc.from('share_counts').select('*').eq('game_id', game).eq('day', day).single();
    expect(Object.keys(row.data!).sort()).toEqual(['day', 'game_id', 'n']);
  });
});

describe('who can reach it', () => {
  it('no client can read the counts, add to them or run the report', async () => {
    for (const client of [anon(), users.ada!.client]) {
      const read = await client.from('share_counts').select('*');
      expect(read.data ?? []).toEqual([]);
      expect((await client.from('share_counts').insert({ game_id: game, day: '2026-02-03', n: 999 })).error).not.toBeNull();
      expect((await client.rpc('count_share', { p_game: game })).error).not.toBeNull();
      expect((await client.rpc('sponsor_report', { p_games: [game] })).error).not.toBeNull();
    }
  });
});
