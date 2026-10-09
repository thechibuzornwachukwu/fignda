// The words of a paragraph as runs of letters, in terms of the letter stream `S`.

import type { Char } from './text';

/** One word as typed: its lowercase letters and its first and last index in `S`. An apostrophe inside a word ("don't") keeps it one word. */
export type Run = { text: string; a: number; b: number };

const APOSTROPHE = /^['’]$/;

export function wordRuns(chars: readonly Char[]): Run[] {
  const out: Run[] = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i]!.li < 0) {
      i++;
      continue;
    }
    let j = i;
    for (;;) {
      const next = chars[j + 1];
      if (next && next.li >= 0) j++;
      else if (next && APOSTROPHE.test(next.ch) && (chars[j + 2]?.li ?? -1) >= 0) j += 2;
      else break;
    }
    let text = '';
    for (let k = i; k <= j; k++) if (chars[k]!.li >= 0) text += chars[k]!.ch.toLowerCase();
    out.push({ text, a: chars[i]!.li, b: chars[j]!.li });
    i = j + 1;
  }
  return out;
}
