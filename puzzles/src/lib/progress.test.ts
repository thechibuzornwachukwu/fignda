// @vitest-environment jsdom
import { vi } from 'vitest';
import { loadFinished } from './shelves';
import { loadStars } from './starStore';

const api = vi.hoisted(() => ({
  merged: [] as Array<Array<{ id: string; stars: number }>>,
  rows: [] as Array<{ clue_id: unknown; stars: unknown }>,
  failUp: false,
  failDown: false,
}));
vi.mock('./api', () => ({
  mergeGuestProgress: async (items: Array<{ id: string; stars: number }>) => {
    if (api.failUp) throw new Error('offline');
    api.merged.push(items);
    return items.length;
  },
  fetchProgress: async () => {
    if (api.failDown) throw new Error('offline');
    return api.rows;
  },
}));

const { applyProgress, localProgress, PROGRESS_EVENT, syncProgress } = await import('./progress');

beforeEach(() => {
  localStorage.clear();
  api.merged = [];
  api.rows = [];
  api.failUp = false;
  api.failDown = false;
});

describe('localProgress', () => {
  it('every starred clue, and finished puzzles at 1 star unless they hold more', () => {
    localStorage.setItem('gazecraft-stars', JSON.stringify({ 'bible~1': 3, 'bible~2': 1, science: 2 }));
    localStorage.setItem('gazecraft-finished', JSON.stringify(['science', 'ai']));
    expect(localProgress().sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'ai', stars: 1 },
      { id: 'bible~1', stars: 3 },
      { id: 'bible~2', stars: 1 },
      { id: 'science', stars: 2 },
    ]);
  });

  it('nothing saved, broken storage and ids that are not clues give nothing bad', () => {
    expect(localProgress()).toEqual([]);
    localStorage.setItem('gazecraft-stars', '{broken');
    localStorage.setItem('gazecraft-finished', JSON.stringify(['<script>', 'UPPER', 'ok-id', 7]));
    expect(localProgress()).toEqual([{ id: 'ok-id', stars: 1 }]);
  });
});

describe('applyProgress', () => {
  it('brings down what this browser lacks: stars for clues, and whole puzzles onto the shelves too', () => {
    expect(applyProgress([{ clue_id: 'bible~1', stars: 2 }, { clue_id: 'science', stars: 3 }])).toBe(true);
    expect(loadStars()).toEqual({ 'bible~1': 2, science: 3 });
    expect(loadFinished()).toEqual(['science']);
  });

  it('stars only go up, and nothing new means no change', () => {
    localStorage.setItem('gazecraft-stars', JSON.stringify({ 'bible~1': 3, science: 2 }));
    localStorage.setItem('gazecraft-finished', JSON.stringify(['science']));
    expect(applyProgress([{ clue_id: 'bible~1', stars: 1 }, { clue_id: 'science', stars: 2 }])).toBe(false);
    expect(loadStars()).toEqual({ 'bible~1': 3, science: 2 });
    expect(applyProgress([{ clue_id: 'science', stars: 3 }])).toBe(true);
    expect(loadStars().science).toBe(3);
  });

  it('skips rows that are not clues or not stars', () => {
    const bad = [{ clue_id: 7, stars: 3 }, { clue_id: '<script>', stars: 3 }, { clue_id: 'bible~1', stars: 0 }, { clue_id: 'bible~1', stars: 9 }, { clue_id: 'bible~1', stars: 'x' }, { clue_id: null, stars: null }];
    expect(applyProgress(bad)).toBe(false);
    expect(loadStars()).toEqual({});
    expect(loadFinished()).toEqual([]);
  });
});

describe('syncProgress', () => {
  it('2 devices: what this one did goes up, what the other did comes down, and the path is told', async () => {
    localStorage.setItem('gazecraft-stars', JSON.stringify({ 'bible~3': 1 }));
    api.rows = [{ clue_id: 'bible~1', stars: 3 }, { clue_id: 'bible~2', stars: 2 }, { clue_id: 'bible~3', stars: 1 }];
    const heard = vi.fn();
    window.addEventListener(PROGRESS_EVENT, heard);
    expect(await syncProgress()).toBe(true);
    window.removeEventListener(PROGRESS_EVENT, heard);
    expect(api.merged).toEqual([[{ id: 'bible~3', stars: 1 }]]);
    expect(loadStars()).toEqual({ 'bible~1': 3, 'bible~2': 2, 'bible~3': 1 });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('nothing new: no event', async () => {
    localStorage.setItem('gazecraft-stars', JSON.stringify({ 'bible~1': 3 }));
    api.rows = [{ clue_id: 'bible~1', stars: 3 }];
    const heard = vi.fn();
    window.addEventListener(PROGRESS_EVENT, heard);
    expect(await syncProgress()).toBe(false);
    window.removeEventListener(PROGRESS_EVENT, heard);
    expect(heard).not.toHaveBeenCalled();
  });

  it('either half failing loses nothing', async () => {
    localStorage.setItem('gazecraft-stars', JSON.stringify({ 'bible~3': 2 }));
    api.failUp = true;
    api.rows = [{ clue_id: 'bible~1', stars: 3 }];
    expect(await syncProgress()).toBe(true);
    expect(loadStars()).toEqual({ 'bible~3': 2, 'bible~1': 3 });
    api.failUp = false;
    api.failDown = true;
    expect(await syncProgress()).toBe(false);
    expect(loadStars()).toEqual({ 'bible~3': 2, 'bible~1': 3 });
    expect(api.merged).toHaveLength(1);
  });
});
