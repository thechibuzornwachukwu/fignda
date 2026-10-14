// A daily is not the same size every day. This says what today holds and what a usual day holds,
// so the screen can say "Today hid 11. Most days hide 8."

import { answerDepth, type Depth } from './depth';
import { LONG_WORD, DEEP_JOINS } from './skill';
import type { Answer } from './hiddenWords';
import type { Char } from './text';

type Built = { chars: readonly Char[]; answers: readonly Answer[] };

export type DayProfile = {
  total: number;
  /** Holds an answer of 9 letters or more. */
  longWord: boolean;
  /** Holds an answer that crosses 3 joins or more. */
  deepWord: boolean;
};

export function dayProfile(p: Built): DayProfile {
  const depths: Depth[] = p.answers.map((a) => answerDepth(p, a));
  return {
    total: p.answers.length,
    longWord: depths.some((d) => d.length >= LONG_WORD),
    deepWord: depths.some((d) => d.joins >= DEEP_JOINS),
  };
}

/** The middle count of the pool, to the nearest whole number (halves go up). 0 for an empty pool. */
export function typicalCount(counts: readonly number[]): number {
  if (!counts.length) return 0;
  const s = [...counts].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

export type DayStats = DayProfile & { typical: number };

/** Today's puzzle against the daily pool (today's included). */
export function dayStats(today: Built, pool: readonly Built[]): DayStats {
  return { ...dayProfile(today), typical: typicalCount(pool.map((p) => p.answers.length)) };
}
