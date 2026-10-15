// Badges as medals (SPEC section 6, Medals). A badge code from the server is a tier of a medal: 1 medal a kind,
// worn at the highest tier earned, with the way to the next. Pure.

export type MedalKey = 'clean' | 'nohint' | 'long' | 'deep' | 'run' | 'cases' | 'points' | 'first';

/** The metal a tier is struck in, lowest first. A medal with more tiers than metals stays in the last one. */
export const METALS = ['bronze', 'silver', 'gold', 'jade', 'onyx'] as const;
export type Metal = (typeof METALS)[number];

type Kind = { key: MedalKey; tiers: readonly number[]; code: (n: number) => string; name: (n: number) => string };

const short = (n: number): string => (n >= 1000 ? `${n / 1000}K` : String(n));

/** Skill medals first (BUILD_PLAN set 3b), then the rest. */
export const MEDAL_KINDS: readonly Kind[] = [
  { key: 'clean', tiers: [1], code: () => 'clean_read', name: () => 'Clean read' },
  { key: 'nohint', tiers: [1], code: () => 'no_hint_perfect', name: () => 'No-hint perfect' },
  { key: 'long', tiers: [1], code: () => 'long_word', name: () => 'Long word' },
  { key: 'deep', tiers: [1], code: () => 'deep_find', name: () => 'Deep find' },
  { key: 'run', tiers: [7, 30, 50, 100, 365], code: (n) => `streak_${n}`, name: (n) => `${n} day run` },
  { key: 'cases', tiers: [1, 5, 10, 25], code: (n) => `cases_${n}`, name: (n) => (n === 1 ? 'First pack' : `${n} packs`) },
  { key: 'points', tiers: [1000, 5000, 10000, 25000, 50000, 100000], code: (n) => `points_${n}`, name: (n) => `${short(n)} points` },
  { key: 'first', tiers: [1], code: () => 'first_game', name: () => 'First puzzle' },
];

export type Medal = {
  key: MedalKey;
  /** The highest tier earned, counted from 0. -1: not earned yet. */
  tier: number;
  metal: Metal | null;
  /** What is struck on its face: the tier earned, or the first one while it is not earned. */
  face: string;
  /** Its name: "30 day run". Of the first tier while it is not earned. */
  name: string;
  /** How far toward the next tier, 0 to 1. Null when there is no next tier, or the count is not known. */
  progress: number | null;
  /** "12 of 30", for a screen reader. Empty when there is nothing to count. */
  toward: string;
};

/** Where a player stands in each kind, when it is known: their run, cases closed and points. */
export type MedalCounts = Partial<Record<MedalKey, number>>;

/** A player's medals from their badge codes, 1 a kind, in a fixed order. Unknown codes are ignored. */
export function medalsOf(codes: readonly string[], counts: MedalCounts = {}): Medal[] {
  const have = new Set(codes);
  return MEDAL_KINDS.map((k) => {
    let tier = -1;
    k.tiers.forEach((n, i) => {
      if (have.has(k.code(n))) tier = i;
    });
    const shown = k.tiers[Math.max(tier, 0)]!;
    const next = k.tiers[tier + 1];
    const count = counts[k.key];
    const known = next != null && typeof count === 'number' && Number.isFinite(count) && count >= 0;
    return {
      key: k.key,
      tier,
      metal: tier < 0 ? null : METALS[Math.min(tier, METALS.length - 1)]!,
      face: k.key === 'first' ? '1' : short(shown),
      name: k.name(shown),
      progress: known ? Math.min(1, count / next) : null,
      toward: known ? `${Math.min(count, next).toLocaleString('en-US')} of ${next.toLocaleString('en-US')}` : '',
    };
  });
}
