import { countsById, finishRate, isDay, rangeLine, reportLines, type ReportCounts } from './sponsorReport';

const counts = (over: Partial<ReportCounts> = {}): ReportCounts => ({ players: 0, plays: 0, roomPlays: 0, finished: 0, shares: 0, ...over });

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
    const m = countsById([{ game_id: 'bible', players: 12, plays: '40', room_plays: 4, finished: 9, shares: '7' }]);
    expect(m.get('bible')).toEqual({ players: 12, plays: 40, roomPlays: 4, finished: 9, shares: 7 });
  });

  it('a count that is not one reads as 0, and a row with no id is dropped', () => {
    const m = countsById([
      { game_id: 'a', players: -3, plays: 1.5, room_plays: null, finished: 'many', shares: Number.NaN },
      { players: 5 },
      null,
      'row',
    ]);
    expect([...m.keys()]).toEqual(['a']);
    expect(m.get('a')).toEqual(counts());
  });

  it('anything that is not a list is no rows', () => {
    for (const bad of [null, undefined, {}, 'rows', 4]) expect(countsById(bad).size).toBe(0);
  });
});

describe('finishRate', () => {
  it('is the share of plays alone that found every word', () => {
    expect(finishRate(counts({ plays: 8, finished: 3 }))).toBe(38);
    expect(finishRate(counts({ plays: 10, roomPlays: 6, finished: 1 }))).toBe(25);
    expect(finishRate(counts({ plays: 5, finished: 0 }))).toBe(0);
    expect(finishRate(counts({ plays: 5, finished: 5 }))).toBe(100);
  });

  it('has nothing to say when nobody played alone', () => {
    expect(finishRate(counts())).toBeNull();
    expect(finishRate(counts({ plays: 4, roomPlays: 4 }))).toBeNull();
  });

  it('never passes 100', () => {
    expect(finishRate(counts({ plays: 3, finished: 9 }))).toBe(100);
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

  it('prints 4 counts per puzzle, in the order given', () => {
    const lines = reportLines(entries, new Map([['bible', counts({ players: 1200, plays: 1500, roomPlays: 100, finished: 350, shares: 64 })]]), {
      from: '2026-10-01',
      to: '2026-10-07',
    });
    expect(lines).toEqual([
      'Gazecraft sponsor report',
      '1 Oct 2026 to 7 Oct 2026',
      '',
      'Books of the Bible',
      'With Chi Farms',
      'Players      1,200',
      'Plays        1,500 (100 in a room)',
      'Finish rate  25% found every word',
      'Shares       64',
      '',
      'Around the world',
      'Players      0',
      'Plays        0',
      'Finish rate  No plays alone yet',
      'Shares       0',
      '',
      'Players and plays are signed in players only. Guests play without an account and are not counted.',
      'Finish rate is the share of plays alone that found every word.',
      'Shares count guests too.',
    ]);
  });

  it('says so when no puzzle carries a sponsor', () => {
    expect(reportLines([], new Map())).toEqual(['Gazecraft sponsor report', 'All time', '', 'No puzzle carries a sponsor yet.']);
  });

  it('follows the copy rules and never prints a hole', () => {
    const text = reportLines(entries, countsById([{ game_id: 'bible' }])).join('\n');
    expect(text).not.toMatch(/[—!]|undefined|NaN|null/);
  });
});
