// Which answer a hint points at. Pure. Every kind marks one first letter of one unfound answer and costs the
// same, so no pet's hint is worth more than another's: they differ only in which answer they choose.

export type HintKind = 'first' | 'longest' | 'shortest' | 'near';

type Hidden = { key: string; spans: ReadonlyArray<readonly [number, number]> };

const size = (a: Hidden) => a.spans[0]![1] - a.spans[0]![0];

/**
 * The unfound answer a hint of this kind marks: the first in reading order, the longest, the shortest, or the
 * one nearest `lastAt` (where the player's last find began; the first when there is none). Ties go to the
 * earlier one. `answers` is in reading order. Null when everything is found.
 */
export function hintAnswer<A extends Hidden>(answers: readonly A[], found: ReadonlySet<string>, kind: HintKind = 'first', lastAt: number | null = null): A | null {
  const left = answers.filter((a) => !found.has(a.key));
  if (left.length === 0) return null;
  const least = (cost: (a: A) => number) => left.reduce((best, a) => (cost(a) < cost(best) ? a : best));
  if (kind === 'longest') return least((a) => -size(a));
  if (kind === 'shortest') return least(size);
  if (kind === 'near' && lastAt != null) return least((a) => Math.abs(a.spans[0]![0] - lastAt));
  return left[0]!;
}
