// Mirror: hidden words that read right to left. Pure. It writes nothing new: it reads the paragraphs we have
// backwards and lists the everyday words that turn up, so every paragraph is a Mirror puzzle too.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { difficultyOf, norm } from './hiddenWords';
import { passages } from './passages';
import { toChars } from './text';

/** A Mirror clue is worth sitting down to from this many words, the same floor as a passage. */
export const MIRROR_MIN = 3;
/** And lists no more than a passage does. */
export const MIRROR_MAX = 5;
/** Word lengths looked for. Under 4 letters a backwards word is an accident nobody would call hidden. */
const SHORTEST = 4;
const LONGEST = 7;
/** A Mirror clue reads at most this many passages in a row. */
const WINDOW = 4;

export const reversed = (s: string): string => [...s].reverse().join('');

/**
 * The words of `words` that read right to left in the letter stream, in reading order. A word that reads the
 * same both ways is not hidden, and one that sits inside a longer find ("trap" in "traps") is left to the longer.
 */
export function mirrorWordsIn(S: string, words: ReadonlySet<string>): string[] {
  const hits: Array<{ w: string; a: number; b: number }> = [];
  for (let len = LONGEST; len >= SHORTEST; len--) {
    for (let a = 0; a + len <= S.length; a++) {
      const w = reversed(S.slice(a, a + len));
      if (!words.has(w) || w === reversed(w)) continue;
      const b = a + len - 1;
      if (hits.some((h) => h.a <= a && h.b >= b)) continue;
      hits.push({ w, a, b });
    }
  }
  hits.sort((x, y) => x.a - y.a);
  return [...new Set(hits.map((h) => h.w))];
}

/** A Mirror puzzle: the paragraph as written, and each `dict` word wherever it reads right to left. */
export function buildMirror<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = toChars(def.text);
  const seen = new Set<string>();
  const answers: Answer[] = [];
  for (const w of def.dict) {
    const k = norm(w);
    if (k.length < 3 || seen.has(k)) continue;
    const back = reversed(k);
    const spans: Array<[number, number]> = [];
    for (let i = S.indexOf(back); i >= 0; i = S.indexOf(back, i + 1)) spans.push([i, i + k.length - 1]);
    if (spans.length) {
      seen.add(k);
      answers.push({ key: k, label: w.charAt(0).toUpperCase() + w.slice(1), spans });
    }
  }
  answers.sort((a, b) => a.spans[0]![0] - b.spans[0]![0]);
  return { ...def, chars, S, answers, difficulty: difficultyOf(answers.length, def.text.length) };
}

/**
 * The Mirror clue of a case: the shortest run of its passages that hides `MIRROR_MIN` words backwards, and
 * those words. None when the puzzle is not cut, or no run of `WINDOW` passages hides enough.
 */
export function mirrorClue(puzzle: Pick<HiddenWordsPuzzle, 'text' | 'chars' | 'S' | 'answers'>, words: ReadonlySet<string>): HiddenWordsDef | null {
  const cut = passages(puzzle);
  if (cut.length < 2) return null;
  let best: { text: string; dict: string[]; letters: number } | null = null;
  for (let i = 0; i < cut.length; i++) {
    for (let j = i; j < cut.length && j < i + WINDOW; j++) {
      const text = cut
        .slice(i, j + 1)
        .map((p) => p.text)
        .join(' ');
      const S = toChars(text).S;
      const dict = mirrorWordsIn(S, words);
      if (dict.length < MIRROR_MIN) continue;
      if (!best || S.length < best.letters) best = { text, dict: dict.slice(0, MIRROR_MAX), letters: S.length };
      break;
    }
  }
  return best && { text: best.text, dict: best.dict };
}
