import { games } from '../games/catalog';
import { buildHiddenWords, difficultyOf, norm } from './hiddenWords';

describe('buildHiddenWords against data/games.json', () => {
  it('has 25 games', () => {
    expect(games).toHaveLength(25);
  });

  it.each(games.map((g) => [g.id, g] as const))('%s returns exactly its expectedAnswers in order', (_, g) => {
    expect(buildHiddenWords(g).answers.map((a) => a.label)).toEqual(g.expectedAnswers);
  });

  it.each(games.map((g) => [g.id, g] as const))('%s difficulty matches', (_, g) => {
    expect(buildHiddenWords(g).difficulty).toBe(g.difficulty);
  });
});

describe('letter stream', () => {
  const p = buildHiddenWords({ text: 'This is a most odd, Amos.', dict: ['Amos', 'is', 'Odd'] });

  it('lowercases letters only into S', () => {
    expect(p.S).toBe('thisisamostoddamos');
  });

  it('finds words across spaces and every occurrence', () => {
    const amos = p.answers.find((a) => a.key === 'amos')!;
    expect(amos.spans).toEqual([
      [6, 9],
      [14, 17],
    ]);
  });

  it('drops dict words under 3 letters', () => {
    expect(p.answers.map((a) => a.key)).not.toContain('is');
  });

  it('gives non letters their neighbours', () => {
    const space = p.chars[9]!; // between "a" and "most"
    expect(space.ch).toBe(' ');
    expect(space).toMatchObject({ li: -1, prev: 6, next: 7 });
    expect(p.chars[0]!.li).toBe(0);
    const tail = p.chars[p.chars.length - 1]!;
    expect(tail).toMatchObject({ ch: '.', prev: 17, next: -1 });
  });

  it('dedupes dict entries by normalised key and keeps the first label', () => {
    const q = buildHiddenWords({ text: 'amos', dict: ['amos', 'A-mos'] });
    expect(q.answers).toHaveLength(1);
    expect(q.answers[0]!.label).toBe('Amos');
  });

  it('norm strips everything but a-z', () => {
    expect(norm("St. John's")).toBe('stjohns');
  });
});

describe('difficultyOf', () => {
  it.each([
    [20, 100, 'Hard'],
    [5, 900, 'Hard'],
    [9, 259, 'Easy'],
    [9, 260, 'Medium'],
    [10, 100, 'Medium'],
    [19, 899, 'Medium'],
  ] as const)('%i answers, %i chars is %s', (n, len, d) => {
    expect(difficultyOf(n, len)).toBe(d);
  });
});
