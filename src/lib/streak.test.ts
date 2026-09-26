import { dailyStats, handleFromName, safeNext } from './streak';

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
