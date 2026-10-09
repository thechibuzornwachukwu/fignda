// Level from lifetime points. Level 1 at 0, level 2 at 500, and each gap about 20% longer than the last.

export const FIRST_GAP = 500;
const GROWTH = 1.2;
const TIDY = 10;

/** Names for bands of 5 levels. The last band has no end. */
export const BANDS = ['Skimmer', 'Reader', 'Spotter', 'Sharp eye', 'Hawk eye'] as const;
export const LEVELS_PER_BAND = 5;

export type Band = (typeof BANDS)[number];

/** Points to climb from `level` to the next: 500, 600, 720, 860, 1040 and so on, to the nearest 10. Worked out from the first gap each time, so rounding never piles up. */
export function gapAt(level: number): number {
  return Math.round((FIRST_GAP * GROWTH ** (Math.max(1, level) - 1)) / TIDY) * TIDY;
}

export function bandOf(level: number): Band {
  return BANDS[Math.min(BANDS.length - 1, Math.floor((Math.max(1, level) - 1) / LEVELS_PER_BAND))]!;
}

export type LevelInfo = {
  level: number;
  /** Points earned since this level began. */
  into: number;
  /** Points between this level and the next. */
  need: number;
  band: Band;
};

export function levelFor(points: number): LevelInfo {
  let left = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  let level = 1;
  while (left >= gapAt(level)) {
    left -= gapAt(level);
    level++;
  }
  return { level, into: left, need: gapAt(level), band: bandOf(level) };
}
