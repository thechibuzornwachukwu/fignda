import { fitFrom, type Range } from './paginate';
import type { Sentence } from './text';

/** Answer as the share card sees it: first occurrence only. */
export type SpanAnswer = { key: string; span: [number, number]; found?: boolean; hinted?: boolean };

export function inside(a: SpanAnswer, sents: readonly Sentence[], s0: number, s1: number): boolean {
  return a.span[0] >= sents[s0]!.ls && a.span[1] <= sents[s1]!.le;
}

/**
 * The one window of whole sentences within `budget` holding the most target answers.
 * Ties keep the earliest window. Null when there are no sentences.
 */
export function excerptRange(
  sents: readonly Sentence[],
  answers: readonly SpanAnswer[],
  budget: number,
  isTarget: (a: SpanAnswer) => boolean,
): Range | null {
  let best: { r: Range; n: number } | null = null;
  for (let i = 0; i < sents.length; i++) {
    const r = fitFrom(sents, i, budget);
    const n = answers.filter((a) => isTarget(a) && inside(a, sents, r[0], r[1])).length;
    if (!best || n > best.n) best = { r, n };
  }
  return best ? best.r : null;
}
