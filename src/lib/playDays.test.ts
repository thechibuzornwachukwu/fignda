// @vitest-environment jsdom
import { dayNo } from '../engine/daily';
import { loadPlayDays, markPlayedToday } from './playDays';
import { dailyStats } from './streak';

beforeEach(() => localStorage.clear());

describe('the days a step or a clue was finished', () => {
  it('today is kept once, however often it is marked', () => {
    markPlayedToday();
    markPlayedToday();
    expect(loadPlayDays()).toEqual([dayNo()]);
  });

  it('broken storage is no days, never a crash', () => {
    localStorage.setItem('gazecraft-days', '{broken');
    expect(loadPlayDays()).toEqual([]);
    localStorage.setItem('gazecraft-days', JSON.stringify([3, 'x', 3.5, -2, 3, null, 9]));
    expect(loadPlayDays()).toEqual([3, 9]);
  });

  it('a run carries on across a daily and a step on the days after it', () => {
    const today = 300;
    // Days 297 and 298 were dailies. Day 299 and today were steps of a case.
    markPlayedToday(299);
    markPlayedToday(today);
    const days = new Set([297, 298, ...loadPlayDays()]);
    expect(dailyStats(days, today).streak).toBe(4);
  });
});
