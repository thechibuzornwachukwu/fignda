// Is the paragraph made of real words? A model that cannot hide a word honestly cheats: it cuts the word in
// two with a space ("cr oss", "sa vior", "she pherd"). The engine sees a word that crosses a space and
// accepts it, and the player gets nonsense. This check drops any hidden word that sits on a fragment, and
// turns down a paragraph with too many fragments in it.
//
// Used for system-written puzzles only. A player's own paragraph may hold names, Pidgin and slang.

import list from '../../data/words.json';
import type { Char } from '../../src/engine/text';

const WORDS = new Set(list.words.split(' '));
/** `data/words.json` stops at 7 letters. A fragment made by cutting a word is short; longer runs pass. */
const LISTED_MAX = 7;
/** What is left after an apostrophe: he's, don't, we'd, I'll, you're, they've, I'm. */
const AFTER_APOSTROPHE = new Set(['s', 't', 'd', 'll', 're', 've', 'm']);
const APOSTROPHE = /^['’]$/;
/** Unknown words a paragraph may hold before it is turned down. Room for a rare word or a food name. */
export const MAX_UNKNOWN = 3;

/** A run of letters: its text and its first and last letter index in the engine's letter stream. */
export type Token = { text: string; a: number; b: number; known: boolean };

export function tokensOf(chars: readonly Char[]): Token[] {
  const out: Token[] = [];
  let sentenceStart = true;
  for (let i = 0; i < chars.length; ) {
    const c = chars[i]!;
    if (c.li < 0) {
      if (/[.!?]/.test(c.ch)) sentenceStart = true;
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < chars.length && chars[j + 1]!.li >= 0) j++;
    const text = chars.slice(i, j + 1).map((x) => x.ch).join('');
    const before = i > 0 ? chars[i - 1]!.ch : '';
    const after = j + 1 < chars.length ? chars[j + 1]!.ch : '';
    const lower = text.toLowerCase();
    // A capital inside a sentence is a name (Kenya, Ada): not ours to judge. So is a longer capitalised word
    // that opens a sentence (Lisa, Mochi); a fragment there would be the short front half of a cut word.
    const name = /^[A-Z]/.test(text) && (!sentenceStart || text.length >= 4);
    const known =
      name ||
      lower.length > LISTED_MAX ||
      WORDS.has(lower) ||
      (APOSTROPHE.test(before) && AFTER_APOSTROPHE.has(lower)) ||
      // didn't, isn't, couldn't: the part before the apostrophe is the verb plus n.
      (APOSTROPHE.test(after) && lower.endsWith('n') && WORDS.has(lower.slice(0, -1)));
    out.push({ text, a: c.li, b: chars[j]!.li, known });
    sentenceStart = false;
    i = j + 1;
  }
  return out;
}

/** True when every word this hidden answer touches, in at least one of its places, is a real word. */
export function onRealWords(tokens: readonly Token[], spans: ReadonlyArray<readonly [number, number]>): boolean {
  return spans.some(([a, b]) => {
    const touched = tokens.filter((t) => t.b >= a && t.a <= b);
    return touched.length > 1 && touched.every((t) => t.known);
  });
}

/** The fragments and unknown words in the paragraph, in order. */
export const unknownIn = (tokens: readonly Token[]) => tokens.filter((t) => !t.known).map((t) => t.text);
