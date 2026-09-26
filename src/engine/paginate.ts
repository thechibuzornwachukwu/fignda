import type { Sentence } from './text';

export type Range = [number, number];

/** Greedy runs of sentences starting at `i` that fit `budget` (joined by one space). Always takes at least one. */
export function fitFrom(sents: readonly Sentence[], i: number, budget: number): Range {
  let j = i;
  let len = sents[i]!.len;
  while (j + 1 < sents.length && len + 1 + sents[j + 1]!.len <= budget) {
    j++;
    len += 1 + sents[j]!.len;
  }
  return [i, j];
}

/** Every sentence, paged greedily. First page uses `first`, the rest `next`. */
export function paginate(sents: readonly Sentence[], first: number, next: number): Range[] {
  const pages: Range[] = [];
  let i = 0;
  let budget = first;
  while (i < sents.length) {
    const r = fitFrom(sents, i, budget);
    pages.push(r);
    i = r[1] + 1;
    budget = next;
  }
  return pages;
}
