import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { longestWithRest, REST_EARN, REST_WINDOW, restDays, runWithRest } from './rest';

const span = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('rest days', () => {
  it('a single missed day after 5 of the last 7 is rest, and the run steps over it without counting it', () => {
    const days = [...span(1, 6), ...span(8, 10)];
    expect(restDays(days, 10)).toEqual([7]);
    expect(runWithRest(days, 10)).toBe(9);
  });

  it('too few days played before it: no rest, the run starts again', () => {
    const days = [1, 3, 5, 6, 8, 9];
    expect(restDays(days, 9)).toEqual([]);
    expect(runWithRest(days, 9)).toBe(2);
  });

  it('2 days missed in a row: no rest', () => {
    const days = [...span(1, 7), ...span(10, 12)];
    expect(restDays(days, 12)).toEqual([]);
    expect(runWithRest(days, 12)).toBe(3);
  });

  it('1 a week: a second gap within 7 days of the first is not rest', () => {
    const days = [...span(1, 7), ...span(9, 11), ...span(13, 14)];
    expect(restDays(days, 14)).toEqual([8]);
    expect(runWithRest(days, 14)).toBe(2);
    const later = [...span(1, 7), ...span(9, 14), ...span(16, 18)];
    expect(restDays(later, 18)).toEqual([8, 15]);
    expect(runWithRest(later, 18)).toBe(16);
  });

  it('yesterday missed while today is still open: the run is alive, and today is never rest', () => {
    const days = span(1, 6);
    expect(restDays(days, 8)).toEqual([7]);
    expect(runWithRest(days, 8)).toBe(6);
    expect(restDays(days, 9)).toEqual([]);
    expect(runWithRest(days, 9)).toBe(0);
  });

  it('the best run steps over rest days too, and bad input is ignored', () => {
    expect(longestWithRest([...span(1, 6), ...span(8, 10), 20], 30)).toBe(9);
    expect(runWithRest([], 5)).toBe(0);
    expect(runWithRest([Number.NaN, -1, 1.5, 99], 5)).toBe(0);
  });

  it('the database runs the same numbers', () => {
    const sql = readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261015000200_rest_day.sql'), 'utf8');
    expect(sql).toContain(`n >= ${REST_EARN} and m - last_rest >= ${REST_WINDOW}`);
    expect(sql).toContain(`x >= m - ${REST_WINDOW} and x < m`);
  });
});
