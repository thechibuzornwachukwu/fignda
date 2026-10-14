// A guest's place on a daily board (BUILD_PLAN 2g2): where a score would stand, and nothing else.

import { admin, anon, makeProfile, makeUser, today, uniqueHandle } from './helpers';

const svc = admin();
// A day no other test writes to.
const DAY = today() - 90;

type Place = { place: number; players: number };
async function placeOf(score: number, secs: number, day = DAY, client = anon()): Promise<Place> {
  const { data, error } = await client.rpc('daily_place', { p_day: day, p_score: score, p_secs: secs });
  if (error) throw error;
  return (data as Place[])[0]!;
}

describe('daily_place', () => {
  it('counts the checked plays that beat a score, by score then by time, and counts the asker as a player', async () => {
    const before = await placeOf(500, 60);
    const game = (await svc.from('daily').select('game_id').eq('day_no', DAY).single()).data!.game_id;
    const plays = [
      { score: 700, secs: 100 }, // higher score
      { score: 500, secs: 40 }, // same score, faster
      { score: 500, secs: 80 }, // same score, slower
      { score: 500, secs: 60 }, // the same in both: not ahead
      { score: 900, secs: 5, verified: false, source: 'guest_merge' }, // never checked, never counted
    ];
    for (const [i, p] of plays.entries()) {
      const u = await makeUser(`place${i}`);
      await makeProfile(u, `place${i}`, uniqueHandle('pl'));
      const { error } = await svc.from('plays').insert({ user_id: u.id, game_id: game, day_no: DAY, found: 5, total: 10, verified: true, source: 'worker', ...p });
      if (error) throw error;
    }
    const after = await placeOf(500, 60);
    expect(after.place - before.place).toBe(2);
    expect(after.players - before.players).toBe(4);
    expect(after.place).toBeLessThanOrEqual(after.players);
    // The best score there could be is first.
    expect((await placeOf(1_000_000, 0)).place).toBe(1);
  });

  it('answers a guest with 2 numbers and nothing about anyone', async () => {
    const { data } = await anon().rpc('daily_place', { p_day: DAY, p_score: 500, p_secs: 60 });
    expect(Object.keys((data as Place[])[0]!).sort()).toEqual(['place', 'players']);
  });

  it('says nothing useful about a day that has not come, or numbers that cannot be a score', async () => {
    const alone = { place: 1, players: 1 };
    expect(await placeOf(500, 60, today() + 1)).toEqual(alone);
    expect(await placeOf(500, 60, 0)).toEqual(alone);
    expect(await placeOf(-1, 60)).toEqual(alone);
    expect(await placeOf(500, -1)).toEqual(alone);
    expect(await placeOf(2_000_000, 60)).toEqual(alone);
  });
});