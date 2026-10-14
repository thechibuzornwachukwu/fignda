import { dayNo } from '../engine/daily';
import { daysThisMonth, weekParts } from './week';

describe('weekParts', () => {
  it('is the last 7 days, oldest first, ending today', () => {
    expect(weekParts([100, 98, 94, 93], 100)).toEqual(['done', 'empty', 'empty', 'empty', 'done', 'empty', 'done']);
  });

  it('is empty with no plays', () => {
    expect(weekParts([], 50)).toEqual(Array(7).fill('empty'));
  });

  it('ignores days that are not real days: the future, before day 1, fractions', () => {
    expect(weekParts([101, 0, -2, 99.5], 100)).toEqual(Array(7).fill('empty'));
    // Day 3: only days 1 to 3 exist.
    expect(weekParts([1, 3, 0, -1], 3)).toEqual(['empty', 'empty', 'empty', 'empty', 'done', 'empty', 'done']);
  });

  it('draws a rest day only where nothing was played', () => {
    expect(weekParts([100, 99, 97], 100, [98, 97, 80])).toEqual(['empty', 'empty', 'empty', 'done', 'rest', 'done', 'done']);
  });
});

describe('daysThisMonth', () => {
  const day = (iso: string) => dayNo(new Date(`${iso}T12:00:00Z`));

  it('counts played days in the UTC month of today', () => {
    const today = day('2026-10-09');
    expect(daysThisMonth([day('2026-10-01'), day('2026-10-04'), today, day('2026-09-30')], today)).toBe(3);
  });

  it('a break does not zero it', () => {
    const today = day('2026-10-09');
    expect(daysThisMonth([day('2026-10-01'), day('2026-10-02')], today)).toBe(2);
  });

  it('starts again on the first of the month', () => {
    const today = day('2026-11-01');
    expect(daysThisMonth([day('2026-10-30'), day('2026-10-31')], today)).toBe(0);
    expect(daysThisMonth([day('2026-10-31'), today], today)).toBe(1);
  });

  it('counts a day once and never the future', () => {
    const today = day('2026-10-09');
    expect(daysThisMonth([today, today, day('2026-10-20')], today)).toBe(1);
  });
});
