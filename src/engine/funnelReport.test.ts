import { FUNNEL_DAYS_DEFAULT, funnelDays, funnelLines, funnelRows, funnelSql, per100 } from './funnelReport';

describe('funnelDays', () => {
  it('takes a whole number of days from 1 to a year, and the default for anything else', () => {
    expect(funnelDays('30')).toBe(30);
    expect(funnelDays('1')).toBe(1);
    expect(funnelDays('365')).toBe(365);
    for (const bad of [undefined, '', '0', '366', '-3', '2.5', 'week', '14; drop table plays']) expect(funnelDays(bad)).toBe(FUNNEL_DAYS_DEFAULT);
  });
});

describe('funnelSql', () => {
  it('reads and never writes, and holds nothing but a number from outside', () => {
    const sql = funnelSql(14);
    expect(sql).toMatch(/^with d as \(select generate_series/);
    expect(sql).toContain('- 13,');
    expect(sql).not.toMatch(/\b(insert|update|delete|drop|alter|truncate|grant)\b/i);
    expect(funnelSql(9999)).toContain('- 364,');
    expect(funnelSql(Number.NaN)).toMatch(/- \d+,/);
  });
});

describe('funnelRows', () => {
  it('reads the rows oldest day first, with big counts sent as text', () => {
    expect(
      funnelRows([
        { day: '2026-10-11', starts: '120', ends: 80, accounts: 3 },
        { day: '2026-10-10', starts: 40, ends: 10, accounts: '1' },
      ]),
    ).toEqual([
      { day: '2026-10-10', starts: 40, ends: 10, accounts: 1 },
      { day: '2026-10-11', starts: 120, ends: 80, accounts: 3 },
    ]);
  });

  it('drops a row with no day, and reads a count that is not one as 0', () => {
    expect(funnelRows([{ starts: 4 }, null, 'row', { day: 'today', starts: 4 }, { day: '2026-10-10', starts: -2, ends: 'lots', accounts: null }])).toEqual([
      { day: '2026-10-10', starts: 0, ends: 0, accounts: 0 },
    ]);
    for (const bad of [null, undefined, {}, 'rows']) expect(funnelRows(bad)).toEqual([]);
  });
});

describe('per100', () => {
  it('is new accounts for every 100 games started', () => {
    expect(per100(3, 200)).toBe(1.5);
    expect(per100(0, 50)).toBe(0);
    expect(per100(1, 3)).toBe(33.3);
  });

  it('has nothing to say when no game was started', () => {
    expect(per100(4, 0)).toBeNull();
  });
});

describe('funnelLines', () => {
  const days = [
    { day: '2026-10-10', starts: 40, ends: 10, accounts: 1 },
    { day: '2026-10-11', starts: 1160, ends: 890, accounts: 23 },
  ];

  it('prints a row a day, the totals and the rate', () => {
    expect(funnelLines(days)).toEqual([
      'Gazecraft guest funnel',
      '10 Oct to 11 Oct',
      '',
      'Day       Started  Finished         Accounts',
      '10 Oct         40        10    25%         1',
      '11 Oct      1,160       890    77%        23',
      'Total       1,200       900    75%        24',
      '',
      '2 new accounts for every 100 games started.',
      'Games count everyone, guests included, from 10 Oct 2026. They are counted in the browser and not checked.',
      'A player who starts 5 games is 5 starts, so this is a rate to compare week with week, not a share of people.',
    ]);
  });

  it('gives no rate and no percentage for days with no games', () => {
    const text = funnelLines([{ day: '2026-10-10', starts: 0, ends: 0, accounts: 2 }]).join('\n');
    expect(text).toContain('No game was started in these days');
    expect(text).not.toMatch(/%|NaN|Infinity|undefined/);
  });

  it('says so when there are no days at all', () => {
    expect(funnelLines([])[1]).toBe('No days');
  });
});
