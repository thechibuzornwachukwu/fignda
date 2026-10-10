import { games } from '../games/catalog';
import { buildHiddenWords } from './hiddenWords';
import { PASSAGE_MAX, PASSAGE_MIN, PASSAGE_SENTENCES, passages } from './passages';
import { sentences } from './text';

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

  it.each(built)('%s: 3 to 5 answers in each (6 where the text gives no other cut), or the puzzle stays whole', (_, p) => {
    const ps = passages(p);
    if (ps.length === 1) return expect(ps[0]!.answers).toHaveLength(p.answers.length);
    for (const x of ps) {
      expect(x.answers.length).toBeGreaterThanOrEqual(PASSAGE_MIN);
      expect(x.answers.length).toBeLessThanOrEqual(PASSAGE_MAX + 1);
    }
  });

  it('nearly every sitting is 3 to 5 words', () => {
    const sizes = built.flatMap(([, p]) => passages(p).map((x) => x.answers.length));
    expect(sizes.filter((n) => n > PASSAGE_MAX).length).toBeLessThanOrEqual(sizes.length * 0.1);
  });

  it.each(built)('%s: a passage never opens on a small letter', (_, p) => {
    for (const x of passages(p)) expect(x.text).toMatch(/^[^a-z]/);
  });

  it('every puzzle with 6 or more answers is cut, and a shorter one stays whole', () => {
    for (const [, p] of built) {
      const n = passages(p).length;
      if (p.answers.length >= 2 * PASSAGE_MIN) expect(n).toBeGreaterThanOrEqual(2);
      else expect(n).toBe(1);
    }
  });

  it('a sitting is a sentence, or 2 or 3: longer only where sentences in a row hide nothing', () => {
    const long: string[] = [];
    let all = 0;
    for (const [id, p] of built) {
      for (const x of passages(p)) {
        all++;
        const own = buildHiddenWords({ text: x.text, dict: p.dict });
        if (sentences(own.text, own.chars).length > PASSAGE_SENTENCES) long.push(id);
      }
    }
    expect(all).toBeGreaterThanOrEqual(80);
    // The classic opens with sentences that hide no book at all.
    expect([...new Set(long)]).toEqual(['bible']);
    expect(long.length).toBeLessThanOrEqual(2);
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
  it('makes as many passages as the answers allow, each of 3 sentences or fewer', () => {
    expect(sizes(puzzleOf(6))).toEqual([3, 3]);
    expect(sizes(puzzleOf(9))).toEqual([3, 3, 3]);
    expect(sizes(puzzleOf(12))).toEqual([3, 3, 3, 3]);
  });

  it('joins a short tail to a passage beside it, never leaving a thin one', () => {
    const seven = sizes(puzzleOf(7));
    expect(seven).toHaveLength(2);
    expect(seven[0]! + seven[1]!).toBe(7);
    for (const n of seven) expect(n).toBeGreaterThanOrEqual(PASSAGE_MIN);
  });

  it('prefers level sizes: 4 and 4, not 3 and 5', () => {
    expect(sizes(puzzleOf(8))).toEqual([4, 4]);
  });

  it('leaves a puzzle whole when it is too short to cut', () => {
    expect(sizes(puzzleOf(5))).toEqual([5]);
    expect(sizes(puzzleOf(2))).toEqual([2]);
    const whole = puzzleOf(5);
    expect(passages(whole)[0]).toMatchObject({ text: whole.text, offset: 0, letters: whole.S.length });
  });

  it('never cuts where an answer runs across the sentence end', () => {
    // "Udx qdo. Ufx qfo.": "douf" runs from the 3rd sentence into the 4th.
    const across = `${LETTERS[2]}ou${LETTERS[3]}`;
    const six = puzzleOf(6, [across]);
    expect(six.answers.map((a) => a.key)).toContain(across);
    // The only cut that gives 3 and 3 is the one the answer crosses.
    expect(sizes(six)).toEqual([7]);
    // With one more sentence the cut moves on by one, and the answer stays whole in the first passage.
    const seven = passages(puzzleOf(7, [across]));
    expect(seven.map((x) => x.answers.length)).toEqual([5, 3]);
    expect(seven[0]!.answers).toContain(across);
  });

  it('never opens a passage on a small letter', () => {
    expect(sizes(puzzleOf(6, [], [3]))).toEqual([6]);
    const seven = passages(puzzleOf(7, [], [3]));
    expect(seven.map((x) => x.answers.length)).toEqual([4, 3]);
    expect(seven[1]!.text.startsWith('U')).toBe(true);
  });

  it('a word hidden twice is in every passage that holds it', () => {
    const ls = [...LETTERS.slice(0, 6)];
    const text = [...ls, ls[0]!].map((l) => sent(l)).join(' ');
    const ps = passages(buildHiddenWords({ text, dict: ls.map(key) }));
    expect(ps).toHaveLength(2);
    for (const x of ps) expect(x.answers).toContain(key(ls[0]!));
  });

  it('lists the answers of a passage in reading order', () => {
    const [first, second] = passages(puzzleOf(6));
    expect(first!.answers).toEqual([...LETTERS.slice(0, 3)].map(key));
    expect(second!.answers).toEqual([...LETTERS.slice(3, 6)].map(key));
    expect(second!.offset).toBe(first!.letters);
  });

  it('has nothing to cut in an empty text, and one passage in a text with no sentence end', () => {
    expect(passages(buildHiddenWords({ text: '', dict: ['amos'] }))).toEqual([]);
    expect(passages(buildHiddenWords({ text: 'a most odd day', dict: ['amos'] }))).toEqual([{ text: 'a most odd day', offset: 0, letters: 11, answers: ['amos'] }]);
  });
});
