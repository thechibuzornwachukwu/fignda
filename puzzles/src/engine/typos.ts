// Typo hunt: a paragraph we already have, with a few words misspelled on purpose. Find the misspelled ones. Pure,
// and made by the engine from a seed, so the same clue has the same typos on every device and on the server.
// Nothing is written by hand: every paragraph is a Typo hunt too.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { difficultyOf, norm } from './hiddenWords';
import { passages } from './passages';
import { hashOf, seeded } from './seed';
import { toChars, type Char } from './text';

/** How many typos a clue plants. */
export const TYPOS = 4;
/** A word this long or longer can carry a typo; a short one turned is too often another real word. */
const SHORTEST = 5;
/** A Typo hunt reads at most this many passages in a row. */
const WINDOW = 3;

/** A word of the text: where it is in the string, and where its letters are in the letter stream. */
type Word = { text: string; at: number; a: number; b: number };

/** The words of `chars`, a word being a run of letters with nothing else between them. */
export function wordsOf(chars: readonly Char[]): Word[] {
  const out: Word[] = [];
  let cur: Word | null = null;
  chars.forEach((c, i) => {
    if (c.li >= 0 && /\p{L}/u.test(c.ch)) {
      if (cur && cur.b === c.li - 1 && cur.at + cur.text.length === i) {
        cur.text += c.ch;
        cur.b = c.li;
      } else {
        cur = { text: c.ch, at: i, a: c.li, b: c.li };
        out.push(cur);
      }
    } else cur = null;
  });
  return out;
}

/**
 * One typo in `w`, or null: 2 letters swapped, a letter doubled, or a letter dropped, never at the first or last
 * letter (those are how a reader knows a word), and never another real word.
 */
export function misspell(w: string, random: () => number, words: ReadonlySet<string>): string | null {
  for (let t = 0; t < 12; t++) {
    const kind = Math.floor(random() * 3);
    const i = 1 + Math.floor(random() * (w.length - 3));
    let out = w;
    if (kind === 0 && w[i] !== w[i + 1]) out = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    else if (kind === 1) out = w.slice(0, i + 1) + w[i] + w.slice(i + 1);
    else if (kind === 2 && w[i] !== w[i - 1] && w[i] !== w[i + 1]) out = w.slice(0, i) + w.slice(i + 1);
    if (out !== w && !words.has(out.toLowerCase())) return out;
  }
  return null;
}

/** The words a typo can go in: lower case (names are left alone), letters only, long enough. */
const plantable = (w: Word) => w.text.length >= SHORTEST && /^\p{Ll}+$/u.test(w.text);

/**
 * The Typo hunt clue of a pack: a run of up to `WINDOW` of its passages with `TYPOS` words misspelled, chosen by
 * `seed`. `dict` holds each typo as "wrong=right". None when the pack is not cut or has too few long words.
 */
export function typoClue(puzzle: Pick<HiddenWordsPuzzle, 'text' | 'chars' | 'S' | 'answers'>, words: ReadonlySet<string>, seed: string): HiddenWordsDef | null {
  const cut = passages(puzzle);
  // Without a word list there is no way to keep a typo from being a real word, so there is no clue.
  if (cut.length < 2 || words.size === 0) return null;
  const random = seeded(hashOf(`typos:${seed}`));
  // The shortest run of passages, from a seeded start, with room for twice the typos (so they are spread out).
  const start = Math.floor(random() * cut.length);
  for (let k = 0; k < cut.length; k++) {
    const i = (start + k) % cut.length;
    for (let j = i; j < cut.length && j < i + WINDOW; j++) {
      const text = cut
        .slice(i, j + 1)
        .map((p) => p.text)
        .join(' ');
      const ws = wordsOf(toChars(text).chars);
      const open = ws.filter(plantable);
      if (new Set(open.map((w) => w.text)).size < TYPOS * 2) continue;
      // Spread out: one typo from each stretch of the run, never 2 in the same word.
      const picked: Word[] = [];
      const used = new Set<string>();
      for (let n = 0; n < TYPOS; n++) {
        const lo = Math.floor((n * open.length) / TYPOS);
        const hi = Math.floor(((n + 1) * open.length) / TYPOS);
        const pool = open.slice(lo, hi).filter((w) => !used.has(w.text));
        const w = pool[Math.floor(random() * pool.length)];
        if (!w) break;
        picked.push(w);
        used.add(w.text);
      }
      const typos = picked.map((w) => ({ w, wrong: misspell(w.text, random, words) }));
      if (typos.length < TYPOS || typos.some((t) => !t.wrong)) continue;
      // Written back from the end, so earlier positions still hold.
      let out = text;
      for (const t of [...typos].sort((x, y) => y.w.at - x.w.at)) out = out.slice(0, t.w.at) + t.wrong + out.slice(t.w.at + t.w.text.length);
      return { text: out, dict: typos.map((t) => `${t.wrong}=${t.w.text}`) };
    }
  }
  return null;
}

/** A Typo hunt puzzle: each "wrong=right" of `dict` is an answer at the misspelled word, its label the right spelling. */
export function buildTypos<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = toChars(def.text);
  const ws = wordsOf(chars);
  const answers: Answer[] = [];
  for (const entry of def.dict) {
    const [wrong, right] = entry.split('=');
    if (!wrong || !right) continue;
    const w = ws.find((x) => x.text === wrong && !answers.some((a) => a.spans[0]![0] === x.a));
    if (w) answers.push({ key: norm(right), label: right.charAt(0).toUpperCase() + right.slice(1), spans: [[w.a, w.b]] });
  }
  answers.sort((a, b) => a.spans[0]![0] - b.spans[0]![0]);
  return { ...def, chars, S, answers, difficulty: difficultyOf(answers.length, def.text.length) };
}
