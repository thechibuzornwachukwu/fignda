import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { goesUp, LEAGUE_TIERS, LEAGUE_UP, readLeague, tierName } from './league';

describe('leagues', () => {
  it('5 tiers named for the medal metals; anything out of range is the first', () => {
    expect(LEAGUE_TIERS).toEqual(['Bronze', 'Silver', 'Gold', 'Jade', 'Onyx']);
    expect([0, 4, -1, 5, 1.5, Number.NaN].map(tierName)).toEqual(['Bronze', 'Onyx', 'Bronze', 'Bronze', 'Bronze', 'Bronze']);
  });

  it('reads the table, and an empty or broken answer is no league', () => {
    const l = readLeague([
      { place: 1, handle: 'bisi', name: 'Bisi', points: '2400', me: false, tier: 2, players: 7 },
      { place: 2, handle: 'ada', name: null, points: -5, me: true, tier: 2, players: 7 },
      { place: 3, handle: 7 },
    ]);
    expect(l).toEqual({ tier: 2, players: 7, rows: [{ place: 1, handle: 'bisi', name: 'Bisi', points: 2400, me: false }, { place: 2, handle: 'ada', name: '', points: 0, me: true }] });
    for (const bad of [null, undefined, [], 'x', [{}], [{ handle: 3 }]]) expect(readLeague(bad)).toBeNull();
  });

  it('the top 5 with points go up, never from the top tier', () => {
    const row = (place: number, points: number) => ({ place, points, handle: 'a', name: '', me: false });
    expect(goesUp(row(5, 10), 0)).toBe(true);
    expect(goesUp(row(6, 10), 0)).toBe(false);
    expect(goesUp(row(1, 0), 0)).toBe(false);
    expect(goesUp(row(1, 10), 4)).toBe(false);
  });

  it('the database runs the same numbers: 5 up, 5 down only from 5 players, 5 tiers, 20 a table', () => {
    const sql = readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261015000500_leagues.sql'), 'utf8');
    expect(sql).toContain(`when r.place <= ${LEAGUE_UP} and r.pts > 0 then least(r.tier + 1, ${LEAGUE_TIERS.length - 1})`);
    expect(sql).toContain('when r.players >= 5 and r.place > 5 and r.place > r.players - 5 then greatest(r.tier - 1, 0)');
    expect(sql).toContain('having count(*) < 20');
  });
});
