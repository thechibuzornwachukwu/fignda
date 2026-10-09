import gamesFile from '../../data/games.json';
import { buildHiddenWords } from './hiddenWords';
import { buildPath, hardness, stopStates, MAX_CHAPTER, type CatalogueItem } from './journey';

const games = (gamesFile as unknown as { games: CatalogueItem[] }).games;
const path = buildPath(games);
const ids = path.chapters.flatMap((c) => c.stops.map((s) => s.id));

describe('buildPath', () => {
  it('holds every puzzle in the catalogue exactly once', () => {
    expect([...ids].sort()).toEqual(games.map((g) => g.id).sort());
  });

  it('makes chapters of about 5', () => {
    expect(path.chapters.length).toBeGreaterThanOrEqual(4);
    expect(path.chapters.length).toBeLessThanOrEqual(7);
    for (const c of path.chapters) {
      expect(c.stops.length).toBeGreaterThanOrEqual(3);
      expect(c.stops.length).toBeLessThanOrEqual(MAX_CHAPTER);
    }
  });

  it('orders each chapter easy to hard, so the last stop is the hardest', () => {
    const h = (id: string) => hardness(buildHiddenWords(games.find((g) => g.id === id)!));
    for (const c of path.chapters) {
      const hs = c.stops.map((s) => h(s.id));
      expect(hs).toEqual([...hs].sort((a, b) => a - b));
      expect(hs[hs.length - 1]).toBe(Math.max(...hs));
    }
  });

  it('is the same every time, and inside a chapter does not depend on the order puzzles arrive in', () => {
    expect(buildPath(games)).toEqual(path);
    const bible = games.filter((g) => g.category === 'Bible');
    expect(buildPath([...bible].reverse())).toEqual(buildPath(bible));
  });

  it('chapter ids are unique', () => {
    const cids = path.chapters.map((c) => c.id);
    expect(new Set(cids).size).toBe(cids.length);
  });

  it('small categories share a chapter, big ones split', () => {
    const item = (id: string, category: string): CatalogueItem => ({ id, category, text: 'Pat omitted a most odd note.', dict: ['atom'] });
    const small = buildPath([item('a1', 'A'), item('a2', 'A'), item('b1', 'B'), item('b2', 'B'), item('c1', 'C')]);
    expect(small.chapters.map((c) => c.title)).toEqual(['A and B and C']);
    const big = buildPath(Array.from({ length: 10 }, (_, i) => item(`x${i}`, 'X')));
    expect(big.chapters.map((c) => c.stops.length)).toEqual([5, 5]);
    expect(big.chapters.map((c) => c.title)).toEqual(['X 1', 'X 2']);
    expect(buildPath([]).chapters).toEqual([]);
  });
});

describe('stopStates', () => {
  const states = (done: string[], exists?: Set<string>) => stopStates(path, done, exists);

  it('a new player stands on the first stop, the rest locked', () => {
    const s = states([]);
    expect(s.next).toBe(ids[0]);
    expect(s.stops.map((x) => x.state)).toEqual(ids.map((_, i) => (i === 0 ? 'next' : 'locked')));
    expect(s.complete).toBe(false);
  });

  it('finishing a stop opens the next, across a chapter end', () => {
    const first = path.chapters[0]!.stops.map((s) => s.id);
    const s = states(first);
    expect(s.next).toBe(path.chapters[1]!.stops[0]!.id);
    expect(s.chaptersDone[0]).toBe(true);
    expect(s.chaptersDone[1]).toBe(false);
    expect(s.stops.filter((x) => x.state === 'next')).toHaveLength(1);
  });

  it('a stop finished out of order shows done and does not move the next', () => {
    const s = states([ids[3]!]);
    expect(s.next).toBe(ids[0]);
    expect(s.stops[3]!.state).toBe('done');
  });

  it('a puzzle removed from the catalogue is skipped and does not lock the chapter', () => {
    const gone = ids[1]!;
    const exists = new Set(ids.filter((i) => i !== gone));
    const s = states([ids[0]!], exists);
    expect(s.stops.find((x) => x.id === gone)).toBeUndefined();
    expect(s.next).toBe(ids[2]);
    // A path rebuilt from the smaller catalogue has no hole either, and the old id in progress is ignored.
    const rebuilt = stopStates(buildPath(games.filter((g) => g.id !== gone)), [ids[0]!, gone]);
    expect(rebuilt.stops.some((x) => x.id === gone)).toBe(false);
    expect(rebuilt.stops.filter((x) => x.state === 'next')).toHaveLength(1);
  });

  it('done ids that are not on the path are ignored', () => {
    expect(states(['no-such-puzzle']).next).toBe(ids[0]);
  });

  it('a removed puzzle that left a chapter empty does not count as done', () => {
    const only = { chapters: [{ id: 'c', title: 'C', stops: [{ id: 'x' }] }, { id: 'd', title: 'D', stops: [{ id: 'y' }] }] };
    const s = stopStates(only, ['y'], new Set(['y']));
    expect(s.chaptersDone).toEqual([false, true]);
    expect(s.next).toBeNull();
  });

  it('all done: no next, nothing locked, complete', () => {
    const s = states(ids);
    expect(s.next).toBeNull();
    expect(s.complete).toBe(true);
    expect(s.stops.every((x) => x.state === 'done')).toBe(true);
    expect(s.chaptersDone.every(Boolean)).toBe(true);
  });

  it('an empty path is not complete', () => {
    expect(stopStates({ chapters: [] }, ['a'])).toEqual({ stops: [], next: null, complete: false, chaptersDone: [] });
  });
});
