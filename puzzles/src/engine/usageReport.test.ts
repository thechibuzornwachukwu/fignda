import { FEATURES, quietFeatures, usageLines, usageRows, usageSql, usageWeeks } from './usageReport';

const row = (week: string, players: number, used: Record<string, number> = {}) => ({ week, players, ...Object.fromEntries(FEATURES.map((f) => [f.key, used[f.key] ?? 0])) });

describe('usage report', () => {
  it('weeks: a whole number from 1 to 104, anything else is 8', () => {
    expect(['1', '104', '0', '105', '-3', 'x', undefined, '2.5'].map(usageWeeks)).toEqual([1, 104, 8, 8, 8, 8, 8, 8]);
  });

  it('one read-only query, a row a week, every feature a column', () => {
    const sql = usageSql(4);
    expect(sql).toContain("- 21, date_trunc('week'");
    for (const f of FEATURES) expect(sql).toContain(`as "${f.key}"`);
    expect(sql).not.toMatch(/\b(insert|update|delete|drop)\b/i);
  });

  it('rows: oldest first, bad rows dropped, bad counts are 0', () => {
    const r = usageRows([row('2026-10-12', 5), null, { week: 7 }, { week: '2026-10-05', players: 'x', path: '3' }]);
    expect(r.map((w) => w.week)).toEqual(['2026-10-05', '2026-10-12']);
    expect(r[0]!.players).toBe(0);
    expect(r[0]!.used.path).toBe(3);
    expect(usageRows('nope')).toEqual([]);
  });

  it('a feature under 2% of players for 4 weeks in a row is flagged; 3 weeks is not enough', () => {
    const weeks = usageRows(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'].map((w) => row(w, 100, { path: 80, circles: 1, rooms: 5 })));
    expect(quietFeatures(weeks)).toEqual(['Make', 'Circles', 'Following', 'Friend streaks', 'Leagues', 'Sharing', 'Whole puzzles'].filter((n) => FEATURES.some((f) => f.name === n)).sort((a, b) => FEATURES.findIndex((f) => f.name === a) - FEATURES.findIndex((f) => f.name === b)));
    expect(quietFeatures(weeks.slice(1))).toEqual([]);
    expect(usageLines(weeks).at(-1)).toMatch(/^Under 2% of weekly players for 4 weeks, move behind More: /);
    expect(usageLines([])).toEqual(['No weeks to show.']);
  });
});
