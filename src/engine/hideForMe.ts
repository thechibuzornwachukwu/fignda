// "Hide some for me": words that already sit across word boundaries in a player's own paragraph.
// Engine only, no AI. The word list is `data/words.json`, a public list shared with the Worker's real word
// check, so nothing secret is bundled. It is large: import this file on demand, not at app start.

import list from '../../data/words.json';
import { joinsOf } from './depth';
import { toChars } from './text';
import { MAKE, WORD_RE } from './make';
import { wordRuns } from './wordRuns';

/** Longest word Make accepts (WORD_RE). */
const MAX_LENGTH = 12;

let WORDS: Set<string> | undefined;
const words = () => (WORDS ??= new Set((list as { words: string }).words.split(' ')));

export type HideOptions = {
  /** Shortest word offered. 3 letter words are mostly noise in this list. Default 4. */
  minLength?: number;
  /** Most words offered. Default is Make's limit. */
  limit?: number;
  /** Drop a word the caller finds unfit (the Worker's profanity check). */
  reject?: (word: string) => boolean;
};

/**
 * Words (lowercase, 3 to 12 letters) hidden across at least one word join in `text`, longest first, then in
 * reading order, at most `limit`, returned in reading order. A word that is also a whole word anywhere in the
 * text is never returned: it is in plain sight.
 */
export function hideForMe(text: string, { minLength = 4, limit = MAKE.maxWords, reject }: HideOptions = {}): string[] {
  const { chars, S } = toChars(text);
  const whole = new Set(wordRuns(chars).map((r) => r.text));
  const set = words();
  const found = new Map<string, number>();
  for (let i = 0; i < S.length; i++) {
    for (let n = minLength; n <= MAX_LENGTH && i + n <= S.length; n++) {
      const w = S.slice(i, i + n);
      if (found.has(w) || !set.has(w) || !WORD_RE.test(w) || whole.has(w)) continue;
      if (joinsOf(chars, [i, i + n - 1]) < 1) continue;
      if (reject?.(w)) continue;
      found.set(w, i);
    }
  }
  return [...found]
    .sort((a, b) => b[0].length - a[0].length || a[1] - b[1])
    .slice(0, limit)
    .sort((a, b) => a[1] - b[1])
    .map(([w]) => w);
}
