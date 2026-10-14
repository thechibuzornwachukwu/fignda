import { dailyGameId, dayNo } from './daily';
import { score } from './score';
import { formatTime } from './time';
import { dailyPool } from '../games/catalog';

describe('score', () => {
  it('100 per find, time bonus only when all found', () => {
    expect(score({ found: 5, total: 10, hints: 0, misses: 0, secs: 10 })).toBe(500);
    expect(score({ found: 10, total: 10, hints: 0, misses: 0, secs: 100 })).toBe(1500);
  });
  it('hints -25, daily misses -10', () => {
    expect(score({ found: 3, total: 10, hints: 2, misses: 3, secs: 0 })).toBe(300 - 50 - 30);
  });
  it('time bonus floors at 0', () => {
    expect(score({ found: 2, total: 2, hints: 0, misses: 0, secs: 9999 })).toBe(200);
  });
  it('floors at 0', () => {
    expect(score({ found: 0, total: 5, hints: 4, misses: 9, secs: 0 })).toBe(0);
  });
});

describe('daily', () => {
  it('2026-01-01 UTC is day 1', () => {
    expect(dayNo(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)))).toBe(1);
    expect(dayNo(new Date(Date.UTC(2026, 0, 1, 23, 59, 59)))).toBe(1);
    expect(dayNo(new Date(Date.UTC(2026, 0, 2)))).toBe(2);
    expect(dayNo(new Date(Date.UTC(2026, 8, 25)))).toBe(268);
  });
  it('picks dailyPool[n % len]', () => {
    expect(dailyGameId(0, dailyPool)).toBe(dailyPool[0]);
    expect(dailyGameId(1, dailyPool)).toBe(dailyPool[1]);
    expect(dailyGameId(dailyPool.length + 2, dailyPool)).toBe(dailyPool[2]);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [65, '1:05'],
    [600, '10:00'],
    [3725, '1:02:05'],
  ] as const)('%i -> %s', (s, want) => {
    expect(formatTime(s)).toBe(want);
  });
});
