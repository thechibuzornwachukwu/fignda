import { games } from '../games/catalog';
import { buildHiddenWords } from './hiddenWords';
import { PASSAGE_MAX, PASSAGE_MIN, passages } from './passages';

describe('passages against data/games.json', () => {
  const built = games.map((g) => [g.id, buildHiddenWords(g)] as const);

  it.each(built)('%s: the passages are the whole text, in order, with nothing lost', (_, p) => {
    const ps = passages(p);
    expect(ps.length).toBeGreaterThanOrEqual(1);
    let at = 0;
    for (const x of ps) {
      expect(x.offset).toBe(at);
      at += x.letters;
    }
    expect(at).toBe(p.S.length);
    expect(new Set(ps.flatMap((x) => x.answers))).toEqual(new Set(p.answers.map((a) => a.key)));
  });

  it.each(built)('%s: each passage builds into a puzzle that hides exactly its answers', (_, p) => {
    for (const x of passages(p)) {
      const own = buildHiddenWords({ text: x.text, dict: p.dict });
      expect(own.S).toBe(p.S.slice(x.offset, x.offset + x.letters));
      expect(own.answers.map((a) => a.key).sort()).toEqual([...x.answers].sort());
    }
  });

  it.each(built)('%s: 5 to 9 answers in each, or the puzzle stays whole', (_, p) => {
    const ps = passages(p);
    if (ps.length === 1) return expect(ps[0]!.answers).toHaveLength(p.answers.length);
    for (const x of ps) {
      expect(x.answers.length).toBeGreaterThanOrEqual(PASSAGE_MIN);
      expect(x.answers.length).toBeLessThanOrEqual(PASSAGE_MAX);
    }
  });

  it.each(built)('%s: a passage never opens on a small letter', (_, p) => {
    for (const x of passages(p)) expect(x.text).toMatch(/^[^a-z]/);
  });

  it('every puzzle with 10 or more answers is cut, and a shorter one stays whole', () => {
    for (const [, p] of built) {
      const n = passages(p).length;
      if (p.answers.length >= 2 * PASSAGE_MIN) expect(n).toBeGreaterThanOrEqual(2);
      else expect(n).toBe(1);
    }
  });
});

// One sentence that hides one word across a space: "Ubx qbo." hides "bxq".
const LETTERS = 'bcdfghjklmnprstvw';
const sent = (l: string, small = false) => `${small ? 'u' : 'U'}${l}x q${l}o.`;
const key = (l: string) => `${l}xq`;
/** `n` sentences, one answer each. `extra` adds dict words; `small` names sentences that open on a small letter. */
function puzzleOf(n: number, extra: string[] = [], small: number[] = []) {
  const ls = [...LETTERS.slice(0, n)];
  return buildHiddenWords({ text: ls.map((l, i) => sent(l, small.includes(i))).join(' '), dict: [...ls.map(key), ...extra] });
}
const sizes = (p: ReturnType<typeof puzzleOf>) => passages(p).map((x) => x.answers.length);

describe('passages', () => {
  it('makes as many passages as the answers allow', () => {
    expect(sizes(puzzleOf(10))).toEqual([5, 5]);
    expect(sizes(puzzleOf(15))).toEqual([5, 5, 5]);
    const fourteen = sizes(puzzleOf(14));
    expect(fourteen).toHaveLength(2);
    expect(fourteen[0]! + fourteen[1]!).toBe(14);
    for (const n of fourteen) expect(n).toBeGreaterThanOrEqual(PASSAGE_MIN);
  });

  it('joins a short tail to the passage before', () => {
    expect(sizes(puzzleOf(12)).every((n) => n >= PASSAGE_MIN)).toBe(true);
    expect(sizes(puzzleOf(12))).toHaveLength(2);
  });

  it('leaves a puzzle whole when it is too short to cut', () => {
    expect(sizes(puzzleOf(9))).toEqual([9]);
    expect(sizes(puzzleOf(4))).toEqual([4]);
    const whole = puzzleOf(9);
    expect(passages(whole)[0]).toMatchObject({ text: whole.text, offset: 0, letters: whole.S.length });
  });

  it('never cuts where an answer runs across the sentence end', () => {
    // "Ugx qgo. Uhx qho.": "gouh" runs from the 5th sentence into the 6th.
    const across = `${LETTERS[4]}ou${LETTERS[5]}`;
    const ten = puzzleOf(10, [across]);
    expect(ten.answers.map((a) => a.key)).toContain(across);
    // The only cut that gives 5 and 5 is the one the answer crosses.
    expect(sizes(ten)).toEqual([11]);
    // With one more sentence the cut moves on by one, and the answer stays whole in the first passage.
    const eleven = passages(puzzleOf(11, [across]));
    expect(eleven.map((x) => x.answers.length)).toEqual([7, 5]);
    expect(eleven[0]!.answers).toContain(across);
  });

  it('never opens a passage on a small letter', () => {
    expect(sizes(puzzleOf(10, [], [5]))).toEqual([10]);
    const eleven = passages(puzzleOf(11, [], [5]));
    expect(eleven.map((x) => x.answers.length)).toEqual([6, 5]);
    expect(eleven[1]!.text.startsWith('U')).toBe(true);
  });

  it('a word hidden twice is in every passage that holds it', () => {
    const ls = [...LETTERS.slice(0, 10)];
    const text = [...ls, ls[0]!].map((l) => sent(l)).join(' ');
    const ps = passages(buildHiddenWords({ text, dict: ls.map(key) }));
    expect(ps).toHaveLength(2);
    for (const x of ps) expect(x.answers).toContain(key(ls[0]!));
  });

  it('lists the answers of a passage in reading order', () => {
    const [first, second] = passages(puzzleOf(10));
    expect(first!.answers).toEqual([...LETTERS.slice(0, 5)].map(key));
    expect(second!.answers).toEqual([...LETTERS.slice(5, 10)].map(key));
    expect(second!.offset).toBe(first!.letters);
  });

  it('has nothing to cut in an empty text, and one passage in a text with no sentence end', () => {
    expect(passages(buildHiddenWords({ text: '', dict: ['amos'] }))).toEqual([]);
    expect(passages(buildHiddenWords({ text: 'a most odd day', dict: ['amos'] }))).toEqual([{ text: 'a most odd day', offset: 0, letters: 11, answers: ['amos'] }]);
  });
});
