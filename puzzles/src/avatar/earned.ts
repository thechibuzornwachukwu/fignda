// What a player earns: a few pieces for finishing packs and rising in rank (SPEC section 5, Outfits).
// Only these few are earned. Everything that helps someone look like themselves stays free, always.

import { levelFor, RANKS, type Rank } from '../engine/level';

/** What a piece asks for: so many packs done (`cases` in code), or a rank reached. */
export type Need = { cases: number } | { rank: Rank };

/** Every earned piece, by the part it belongs to and its name there. Append only, like the parts. */
export const EARNED: ReadonlyArray<{ part: 'kit' | 'outfit'; name: string; need: Need }> = [
  { part: 'kit', name: 'star pin', need: { cases: 1 } },
  { part: 'kit', name: 'headphones', need: { cases: 5 } },
  { part: 'kit', name: 'crown', need: { rank: 'Keen' } },
  { part: 'kit', name: 'gold set', need: { cases: 10 } },
  { part: 'outfit', name: 'bomber jacket', need: { rank: 'Sharp' } },
];

/** Where a player stands: packs done, and lifetime points (which set the rank). */
export type Standing = { cases: number; points: number };

/** What a choice asks for. Nothing for a choice that is free. */
export const needOf = (part: string, name: string): Need | undefined => EARNED.find((e) => e.part === part && e.name === name)?.need;

const whole = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

export function isEarned(need: Need, standing: Standing): boolean {
  if ('cases' in need) return whole(standing.cases) >= need.cases;
  return RANKS.indexOf(levelFor(whole(standing.points)).rank) >= RANKS.indexOf(need.rank);
}

/** How to earn it, said once under the locked piece. */
export const howTo = (need: Need): string =>
  'cases' in need ? (need.cases === 1 ? 'Finish 1 pack.' : `Finish ${need.cases} packs.`) : `Reach the rank of ${need.rank}.`;