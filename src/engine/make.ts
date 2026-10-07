// Player-made puzzles: the one rule set for a draft, used by the maker screen and by the server.
// A word counts only if the engine finds it in the paragraph and it runs across a space or punctuation
// somewhere. A word sitting whole inside one word of the text is in plain sight, not hidden.

import { buildHiddenWords, norm } from './hiddenWords';

export const MAKE = {
  minWords: 4,
  maxWords: 20,
  minText: 60,
  maxText: 900,
  titleMax: 40,
  nounMax: 40,
} as const;

export const WORD_RE = /^[A-Za-z]{3,12}$/;

/** True when some occurrence of the answer runs across a space or punctuation (the point of the game). */
export function crossesWords(chars: readonly { li: number }[], spans: ReadonlyArray<readonly [number, number]>): boolean {
  const at = new Map<number, number>();
  chars.forEach((c, i) => c.li >= 0 && at.set(c.li, i));
  return spans.some(([a, b]) => at.get(b)! - at.get(a)! > b - a);
}

export type WordState =
  /** Hidden across word boundaries. Counts. */
  | 'hidden'
  /** Not in the paragraph. */
  | 'missing'
  /** In the paragraph, but whole inside one word. */
  | 'plain'
  /** Not 3 to 12 letters. */
  | 'bad'
  /** Typed twice. */
  | 'repeat';

export type DraftCheck = { words: Array<{ word: string; state: WordState }>; hidden: string[]; ok: boolean };

/** Split what a player typed into words: commas or new lines. */
export const splitWords = (raw: string): string[] =>
  raw
    .split(/[\n,]+/)
    .map((w) => w.trim())
    .filter(Boolean);

export function checkDraft(text: string, words: readonly string[]): DraftCheck {
  const good = words.filter((w) => WORD_RE.test(w));
  const puzzle = buildHiddenWords({ text, dict: good });
  const byKey = new Map(puzzle.answers.map((a) => [a.key, a]));
  const seen = new Set<string>();
  const out = words.map((word) => {
    if (!WORD_RE.test(word)) return { word, state: 'bad' as const };
    const key = norm(word);
    if (seen.has(key)) return { word, state: 'repeat' as const };
    seen.add(key);
    const a = byKey.get(key);
    if (!a) return { word, state: 'missing' as const };
    return { word, state: crossesWords(puzzle.chars, a.spans) ? ('hidden' as const) : ('plain' as const) };
  });
  const hidden = out.filter((w) => w.state === 'hidden').map((w) => w.word);
  const ok =
    text.trim().length >= MAKE.minText &&
    text.length <= MAKE.maxText &&
    words.length <= MAKE.maxWords &&
    hidden.length >= MAKE.minWords &&
    out.every((w) => w.state === 'hidden');
  return { words: out, hidden, ok };
}
