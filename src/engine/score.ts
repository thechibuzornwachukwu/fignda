export type ScoreInput = {
  found: number;
  total: number;
  hints: number;
  /** Wrong picks. Count only on the daily. */
  misses: number;
  secs: number;
};

/** 100 per find, -25 per hint, -10 per daily miss, + max(0, 600 - secs) when all found. Floor 0. */
export function score({ found, total, hints, misses, secs }: ScoreInput): number {
  return Math.max(
    0,
    found * 100 - hints * 25 - misses * 10 + (found === total ? Math.max(0, 600 - secs) : 0),
  );
}
