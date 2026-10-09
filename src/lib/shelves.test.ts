// @vitest-environment jsdom
import { loadFinished, markFinished, shelfCounts } from './shelves';

const games = [
  { id: 'bible', category: 'Bible' },
  { id: 'bnote', category: 'Bible' },
  { id: 'bpeople', category: 'Bible' },
  { id: 'football', category: 'Football' },
];

describe('shelfCounts', () => {
  it('counts finished puzzles per category', () => {
    const s = shelfCounts(games, ['bible', 'bpeople']);
    expect(s.get('Bible')).toEqual({ done: 2, total: 3 });
    expect(s.get('Football')).toEqual({ done: 0, total: 1 });
  });

  it('ignores ids that are not in the catalogue and repeats', () => {
    const s = shelfCounts(games, ['bible', 'bible', 'c-abc123', 'gone']);
    expect(s.get('Bible')).toEqual({ done: 1, total: 3 });
    expect([...s.keys()]).toEqual(['Bible', 'Football']);
  });
});

describe('finished store', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty and remembers each puzzle once', () => {
    expect(loadFinished()).toEqual([]);
    markFinished('bible');
    markFinished('football');
    markFinished('bible');
    expect(loadFinished()).toEqual(['bible', 'football']);
  });

  it('survives a broken value', () => {
    localStorage.setItem('gazecraft-finished', '{"a":1}');
    expect(loadFinished()).toEqual([]);
    localStorage.setItem('gazecraft-finished', '["bible", 4, null]');
    expect(loadFinished()).toEqual(['bible']);
  });
});
