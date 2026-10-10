import gamesFile from '../../data/games.json';
import { buildHiddenWords } from './hiddenWords';
import { buildPath, clueId, clueStates, hardness, type CatalogueItem, type Path } from './journey';
import { passages } from './passages';

const games = (gamesFile as unknown as { games: CatalogueItem[] }).games;
const path = buildPath(games);
const ids = path.cases.flatMap((c) => c.clues.map((s) => s.id));
const built = (id: string) => buildHiddenWords(games.find((g) => g.id === id)!);

describe('buildPath', () => {
  it('holds every puzzle in the catalogue exactly once, as a case', () => {
    expect(path.cases.map((c) => c.id).sort()).toEqual(games.map((g) => g.id).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a case is the passages of its puzzle in order, then the whole puzzle', () => {
    for (const c of path.cases) {
      const cut = passages(built(c.id)).length;
      expect(c.clues.map((s) => s.n)).toEqual([...Array.from({ length: cut }, (_, i) => i + 1), 0]);
      expect(c.clues.every((s) => s.puzzle === c.id)).toBe(true);
      expect(c.clues[c.clues.length - 1]!.id).toBe(c.id);
      expect(c.clues[0]!.id).toBe(`${c.id}~1`);
    }
    // 25 puzzles cut into 83 passages: 108 clues.
    expect(ids).toHaveLength(games.reduce((n, g) => n + passages(buildHiddenWords(g)).length + 1, 0));
  });

  it('clue ids: a passage under the puzzle and its number, the unmasking under the puzzle alone', () => {
    expect(clueId('bible', 2)).toBe('bible~2');
    expect(clueId('bible', 0)).toBe('bible');
  });

  it('keeps a category together, in the order categories first appear, easy to hard inside', () => {
    const cats = path.cases.map((c) => games.find((g) => g.id === c.id)!.category);
    const seen = [...new Set(games.map((g) => g.category))];
    expect([...new Set(cats)]).toEqual(seen);
    expect(cats).toEqual([...cats].sort((a, b) => seen.indexOf(a) - seen.indexOf(b)));
    for (const cat of seen) {
      const hs = path.cases.filter((_, i) => cats[i] === cat).map((c) => hardness(built(c.id)));
      expect(hs).toEqual([...hs].sort((a, b) => a - b));
    }
  });

  it('is the same every time, and inside a category does not depend on the order puzzles arrive in', () => {
    expect(buildPath(games)).toEqual(path);
    const bible = games.filter((g) => g.category === 'Bible');
    expect(buildPath([...bible].reverse())).toEqual(buildPath(bible));
  });

  it('a puzzle that is not cut is a case of 1 clue, and no puzzles is no cases', () => {
    const whole = buildPath([{ id: 'a1', category: 'A', text: 'Pat omitted a most odd note.', dict: ['atom'] }]);
    expect(whole.cases).toEqual([{ id: 'a1', clues: [{ id: 'a1', puzzle: 'a1', n: 0 }] }]);
    expect(buildPath([]).cases).toEqual([]);
  });
});

describe('clueStates', () => {
  const states = (done: string[], exists?: Set<string>) => clueStates(path, done, exists);
  const first = path.cases[0]!;

  it('a new player stands on the first clue, the rest locked', () => {
    const s = states([]);
    expect(s.next).toBe(ids[0]);
    expect(s.clues.map((x) => x.state)).toEqual(ids.map((_, i) => (i === 0 ? 'next' : 'locked')));
    expect(s.complete).toBe(false);
    expect(s.left).toEqual(path.cases.map((c) => c.clues.length));
  });

  it('finishing a clue opens the next, and the case counts down', () => {
    const s = states([ids[0]!]);
    expect(s.next).toBe(ids[1]);
    expect(s.left[0]).toBe(first.clues.length - 1);
    expect(s.casesDone[0]).toBe(false);
  });

  it('every clue of a case done: the case is done and the next case opens', () => {
    const s = states(first.clues.map((c) => c.id));
    expect(s.next).toBe(path.cases[1]!.clues[0]!.id);
    expect(s.casesDone.slice(0, 2)).toEqual([true, false]);
    expect(s.left[0]).toBe(0);
    expect(s.clues.filter((x) => x.state === 'next')).toHaveLength(1);
  });

  it('a whole-puzzle score from before shows every passage of its case as done', () => {
    const s = states([first.id]);
    expect(s.clues.filter((x) => x.case === 0).every((x) => x.state === 'done')).toBe(true);
    expect(s.casesDone[0]).toBe(true);
    expect(s.next).toBe(path.cases[1]!.clues[0]!.id);
  });

  it('every passage done is not the case: the unmasking is still to play', () => {
    const s = states(first.clues.slice(0, -1).map((c) => c.id));
    expect(s.next).toBe(first.id);
    expect(s.left[0]).toBe(1);
    expect(s.casesDone[0]).toBe(false);
  });

  it('a clue finished out of order shows done and does not move the next', () => {
    const s = states([ids[3]!]);
    expect(s.next).toBe(ids[0]);
    expect(s.clues[3]!.state).toBe('done');
  });

  it('a puzzle removed from the catalogue takes its case with it and blocks nothing', () => {
    const exists = new Set(path.cases.map((c) => c.id).filter((id) => id !== first.id));
    const s = states([], exists);
    expect(s.clues.some((x) => x.puzzle === first.id)).toBe(false);
    expect(s.next).toBe(path.cases[1]!.clues[0]!.id);
    expect(s.casesDone[0]).toBe(false);
    expect(s.left[0]).toBe(0);
    // A path rebuilt from the smaller catalogue has no hole either, and the old ids in progress are ignored.
    const rebuilt = clueStates(buildPath(games.filter((g) => g.id !== first.id)), [first.id, `${first.id}~1`]);
    expect(rebuilt.clues.some((x) => x.puzzle === first.id)).toBe(false);
    expect(rebuilt.clues.filter((x) => x.state === 'next')).toHaveLength(1);
  });

  it('done ids that are not on the path are ignored', () => {
    expect(states(['no-such-puzzle', 'bible~99', '~1']).next).toBe(ids[0]);
  });

  it('all done: no next, nothing locked, complete', () => {
    for (const done of [ids, path.cases.map((c) => c.id)]) {
      const s = states(done);
      expect(s.next).toBeNull();
      expect(s.complete).toBe(true);
      expect(s.clues.every((x) => x.state === 'done')).toBe(true);
      expect(s.casesDone.every(Boolean)).toBe(true);
    }
  });

  it('an empty path is not complete', () => {
    const empty: Path = { cases: [] };
    expect(clueStates(empty, ['a'])).toEqual({ clues: [], next: null, complete: false, casesDone: [], left: [] });
  });
});
