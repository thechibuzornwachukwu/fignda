import { COUNTED_FROM, countsById, finishRate, isDay, rangeLine, reportLines, share, type ReportCounts } from './sponsorReport';

const counts = (over: Partial<ReportCounts> = {}): ReportCounts => ({ starts: 0, ends: 0, fulls: 0, shares: 0, players: 0, ...over });

describe('isDay', () => {
  it('takes a real date as YYYY-MM-DD and nothing else', () => {
    expect(isDay('2026-10-09')).toBe(true);
    expect(isDay('2028-02-29')).toBe(true);
    for (const bad of ['', '2026-2-9', '09-10-2026', '2026-02-30', '2026-13-01', "2026-10-09'; drop table plays; --", '2026-10-09T00:00:00Z']) {
      expect(isDay(bad)).toBe(false);
    }
  });
});

describe('countsById', () => {
  it('reads the database rows, with big counts sent as text', () => {
    const m = countsById([{ game_id: 'bible', starts: '400', ends: 120, fulls: 9, shares: '7', players: 12 }]);
    expect(m.get('bible')).toEqual({ starts: 400, ends: 120, fulls: 9, shares: 7, players: 12 });
  });

  it('a count that is not one reads as 0, and a row with no id is dropped', () => {
    const m = countsById([{ game_id: 'a', starts: -3, ends: 1.5, fulls: null, shares: 'many', players: Number.NaN }, { starts: 5 }, null, 'row']);
    expect([...m.keys()]).toEqual(['a']);
    expect(m.get('a')).toEqual(counts());
  });

  it('anything that is not a list is no rows', () => {
    for (const bad of [null, undefined, {}, 'rows', 4]) expect(countsById(bad).size).toBe(0);
  });
});

describe('share and finishRate', () => {
  it('is the part of the whole, to the nearest 1%', () => {
    expect(share(3, 8)).toBe(38);
    expect(share(0, 5)).toBe(0);
    expect(share(5, 5)).toBe(100);
    expect(finishRate(counts({ starts: 200, ends: 50 }))).toBe(25);
  });

  it('has nothing to say about nothing', () => {
    expect(share(0, 0)).toBeNull();
    expect(finishRate(counts({ ends: 4 }))).toBeNull();
  });

  it('never passes 100, even when a start was not counted', () => {
    expect(share(9, 3)).toBe(100);
  });
});

describe('rangeLine', () => {
  it('says the days asked for', () => {
    expect(rangeLine({})).toBe('All time');
    expect(rangeLine({ from: '2026-10-01', to: '2026-10-07' })).toBe('1 Oct 2026 to 7 Oct 2026');
    expect(rangeLine({ from: '2026-10-01', to: '2026-10-01' })).toBe('1 Oct 2026');
    expect(rangeLine({ from: '2026-10-01' })).toBe('From 1 Oct 2026');
    expect(rangeLine({ to: '2026-10-07' })).toBe('Up to 7 Oct 2026');
  });
});

describe('reportLines', () => {
  const entries = [
    { id: 'bible', title: 'Books of the Bible', sponsor: 'Chi Farms' },
    { id: 'world', title: 'Around the world' },
  ];
  const later = { from: '2026-11-01', to: '2026-11-07' };

  it('prints the counts per puzzle, in the order given', () => {
    const lines = reportLines(entries, new Map([['bible', counts({ starts: 2000, ends: 1500, fulls: 300, shares: 64, players: 410 })]]), later);
    expect(lines).toEqual([
      'Gazecraft sponsor report',
      '1 Nov 2026 to 7 Nov 2026',
      '',
      'Books of the Bible',
      'With Chi Farms',
      'Games started      2,000',
      'Played to the end  1,500 (75%)',
      'Found every word   300 (20% of those)',
      'Shares             64',
      'Signed in players  410',
      '',
      'Around the world',
      'Games started      0',
      'Played to the end  0',
      'Found every word   0',
      'Shares             0',
      'Signed in players  0',
      '',
      'Games and shares count everyone, guests included. Played to the end means at least 1 word found.',
      'Signed in players are different accounts with a play the server checked.',
    ]);
  });

  it('says when counting began, for a range that reaches back before it', () => {
    const note = /counted from 10 Oct 2026/;
    expect(reportLines(entries, new Map()).join('\n')).toMatch(note);
    expect(reportLines(entries, new Map(), { from: '2026-09-01' }).join('\n')).toMatch(note);
    expect(reportLines(entries, new Map(), { to: '2026-12-01' }).join('\n')).toMatch(note);
    expect(reportLines(entries, new Map(), { from: COUNTED_FROM }).join('\n')).not.toMatch(note);
    expect(reportLines(entries, new Map(), later).join('\n')).not.toMatch(note);
  });

  it('says so when no puzzle carries a sponsor', () => {
    expect(reportLines([], new Map())).toEqual(['Gazecraft sponsor report', 'All time', '', 'No puzzle carries a sponsor yet.']);
  });

  it('follows the copy rules and never prints a hole', () => {
    const text = reportLines(entries, countsById([{ game_id: 'bible' }])).join('\n');
    expect(text).not.toMatch(/[—!]|undefined|NaN|null/);
  });
});
