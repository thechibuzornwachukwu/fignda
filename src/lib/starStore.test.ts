// @vitest-environment jsdom
import { loadStars, recordStars } from './starStore';

const KEY = 'gazecraft-stars';

describe('star store', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty, and 0 stars is never stored', () => {
    expect(loadStars()).toEqual({});
    expect(recordStars('bible', 0)).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('says when the stars went up, the first finish included, and never lowers them', () => {
    expect(recordStars('bible', 2)).toBe(true);
    expect(recordStars('bible', 2)).toBe(false);
    expect(recordStars('bible', 1)).toBe(false);
    expect(recordStars('bible', 3)).toBe(true);
    expect(loadStars()).toEqual({ bible: 3 });
  });

  it('reads broken or malformed storage as empty and drops values that are not stars', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadStars()).toEqual({});
    localStorage.setItem(KEY, '[3,3]');
    expect(loadStars()).toEqual({});
    localStorage.setItem(KEY, JSON.stringify({ bible: 7, bnote: '3', ai: null, cities: 2 }));
    expect(loadStars()).toEqual({ cities: 2 });
    expect(recordStars('bible', 1)).toBe(true);
    expect(loadStars()).toEqual({ cities: 2, bible: 1 });
  });
});
