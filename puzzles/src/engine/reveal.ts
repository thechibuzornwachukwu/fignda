// After the game: where a missed answer was hiding, and whether the player went over it.

import type { Char } from './text';

type Span = readonly [number, number];

export type RevealPart = { text: string; hit: boolean };

const SPACE = /\s/;

/** The words a span sits in, cut where the answer starts and ends: AMOS in "a most" is [a mos] then [t]. */
export function revealParts(chars: readonly Char[], [a, b]: Span): RevealPart[] {
  const ia = chars.findIndex((c) => c.li === a);
  const ib = chars.findIndex((c) => c.li === b);
  if (ia < 0 || ib < ia) return [];
  let start = ia;
  while (start > 0 && !SPACE.test(chars[start - 1]!.ch)) start--;
  let end = ib;
  while (end < chars.length - 1 && !SPACE.test(chars[end + 1]!.ch)) end++;
  // Quotes and full stops around the words are not part of them.
  while (chars[start]!.li < 0) start++;
  while (chars[end]!.li < 0) end--;
  const text = (from: number, to: number) =>
    chars
      .slice(from, to)
      .map((c) => c.ch)
      .join('');
  return [
    { text: text(start, ia), hit: false },
    { text: text(ia, ib + 1), hit: true },
    { text: text(ib + 1, end + 1), hit: false },
  ].filter((p) => p.text);
}

/** How many of the missed spans one of the player's own selections ran across. */
export function readPast(events: ReadonlyArray<{ a: number; b: number }>, missed: readonly Span[]): number {
  return missed.filter(([x, y]) => events.some(({ a, b }) => Math.min(a, b) <= y && Math.max(a, b) >= x)).length;
}
