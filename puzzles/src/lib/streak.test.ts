import { dailyStats, handleFromName, safeNext, streakPool } from './streak';

describe('dailyStats', () => {
  it('counts a run ending today', () => {
    expect(dailyStats([8, 9, 10], 10)).toEqual({ played: 3, streak: 3 });
  });
  it('a run ending yesterday still counts before today is played', () => {
    expect(dailyStats([7, 8, 9], 10)).toEqual({ played: 3, streak: 3 });
  });
  it('a gap breaks the run', () => {
    expect(dailyStats([5, 6, 8, 10], 10)).toEqual({ played: 4, streak: 1 });
    expect(dailyStats([5, 6], 10)).toEqual({ played: 2, streak: 0 });
  });
  it('dedupes and ignores junk and future days', () => {
    expect(dailyStats([10, 10, 9, 11, 0, -1, 1.5, NaN], 10)).toEqual({ played: 2, streak: 2 });
  });
});

describe('safeNext', () => {
  it.each([
    ['/play/bible', '/play/bible'],
    ['/account', '/account'],
    [null, '/play'],
    ['', '/play'],
    ['https://evil.com', '/play'],
    ['//evil.com', '/play'],
    ['/\\evil.com', '/play'],
    ['javascript:alert(1)', '/play'],
    ['play', '/play'],
  ])('%s -> %s', (input, want) => {
    expect(safeNext(input)).toBe(want);
  });
});

describe('handleFromName', () => {
  it.each([
    ['Ada Obi', 'ada'],
    ['  Chibuzor  ', 'chibuzor'],
    ["O'Neil", 'oneil'],
    ['Zoé', 'zo'],
    ['', ''],
  ])('%s -> %s', (name, want) => {
    expect(handleFromName(name)).toBe(want);
  });
});

describe('streakPool', () => {
  it.each([
    [0, 0, null],
    [1, 1, { pool: 'streakStart', n: 1 }],
    [1, 2, { pool: 'streakStart', n: 1 }],
    // Back after a real run: point at the best, not the loss.
    [1, 42, { pool: 'streakBack', n: 42 }],
    [2, 2, { pool: 'streakDay', n: 2 }],
    [6, 40, { pool: 'streakDay', n: 6 }],
    [7, 7, { pool: 'streakMilestone', n: 7 }],
    [30, 30, { pool: 'streakMilestone', n: 30 }],
    [100, 100, { pool: 'streakMilestone', n: 100 }],
    [365, 365, { pool: 'streakMilestone', n: 365 }],
  ])('streak %i, best %i', (streak, best, want) => {
    expect(streakPool(streak, best)).toEqual(want);
  });
});
