// Stars on a path clue, 1 to 3, earned by skill. 0 until the puzzle is finished.

export type StarsInput = {
  finished: boolean;
  found: number;
  total: number;
  hints: number;
  /** Wrong picks. */
  wrongs: number;
  /** Any find was a teammate's, not the player's own. */
  byOthers?: boolean;
};

/** 1 for finishing, 2 for finding 80% or more, 3 for a clean read (all found, no hint, no wrong pick). */
export function starsFor({ finished, found, total, hints, wrongs, byOthers = false }: StarsInput): 0 | 1 | 2 | 3 {
  if (!finished) return 0;
  if (total > 0 && found === total && hints === 0 && wrongs === 0 && !byOthers) return 3;
  if (total > 0 && found / total >= 0.8) return 2;
  return 1;
}
