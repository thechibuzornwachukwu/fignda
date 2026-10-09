// How deep an answer hides: how many word joins it crosses and how long it is.

import type { Answer } from './hiddenWords';
import type { Char } from './text';

type Span = readonly [number, number];

/** An apostrophe sits inside a word ("don't"), so it is not a join. */
const INSIDE_WORD = /['’]/;

/** Gaps between neighbouring letters of the span that hold a space or punctuation. "a most" for AMOS is 1. */
export function joinsOf(chars: readonly Char[], [a, b]: Span): number {
  let joins = 0;
  let gap = false;
  for (const c of chars) {
    if (c.li >= 0) {
      if (gap && c.li > a && c.li <= b) joins++;
      gap = false;
      if (c.li >= b) break;
    } else if (c.prev != null && c.prev >= a && c.prev < b && !INSIDE_WORD.test(c.ch)) gap = true;
  }
  return joins;
}

export type Depth = { joins: number; length: number };

/** An answer can hide in more than one place. Its depth is the shallowest one, the place most players find it. */
export function answerDepth(puzzle: { chars: readonly Char[] }, answer: Answer): Depth {
  const joins = Math.min(...answer.spans.map((s) => joinsOf(puzzle.chars, s)));
  return { joins, length: answer.key.length };
}
