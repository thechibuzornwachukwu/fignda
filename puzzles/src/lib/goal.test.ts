// @vitest-environment jsdom
import { countPuzzleToday, GOALS, loadGoal, puzzlesToday, saveGoal } from './goal';

beforeEach(() => localStorage.clear());

describe('daily goal', () => {
  it('Light, Regular and Serious are 1, 2 and 4 a day, and Regular is the default', () => {
    expect(GOALS.map((g) => [g.name, g.n])).toEqual([['Light', 1], ['Regular', 2], ['Serious', 4]]);
    expect(loadGoal().key).toBe('regular');
    saveGoal('serious');
    expect(loadGoal().n).toBe(4);
  });

  it('a stored goal that is not one is Regular', () => {
    for (const v of ['', 'keen', '4', '{']) {
      localStorage.setItem('gazecraft-goal', v);
      expect(loadGoal().key).toBe('regular');
    }
  });

  it('counts the puzzles finished today, and a new day starts at 0', () => {
    countPuzzleToday(100);
    countPuzzleToday(100);
    expect(puzzlesToday(100)).toBe(2);
    expect(puzzlesToday(101)).toBe(0);
    countPuzzleToday(101);
    expect(puzzlesToday(101)).toBe(1);
  });

  it('a broken count is 0', () => {
    for (const v of ['{', '[]', '{"day":100,"n":-3}', '{"day":100,"n":1.5}', '{"day":"100","n":2}']) {
      localStorage.setItem('gazecraft-today', v);
      expect(puzzlesToday(100)).toBe(0);
    }
  });
});
