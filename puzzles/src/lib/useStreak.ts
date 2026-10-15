import { useEffect, useMemo, useState } from 'react';
import { dayNo } from '../engine/daily';
import { fetchDailyDays, localDailies } from './api';
import { useAuth } from './auth';
import { loadPlayDays } from './playDays';
import { longestWithRest, restDays, runWithRest } from '../engine/rest';
import { daysThisMonth, weekParts, type DayState } from './week';

export type Streak = {
  streak: number;
  best: number;
  playedToday: boolean;
  /** Days on which something was finished: a step, a clue, or a daily from before. 0 means there is nothing to show yet. */
  played: number;
  /** The last 7 UTC days, oldest first. */
  week: DayState[];
  /** Dailies played in this UTC month. */
  month: number;
};

/**
 * The player's own run: the days they finished a step of a case or a clue in this browser, and the dailies they
 * played before the daily went, from this browser and from their stored plays when signed in.
 * `tick` changes when a daily has just been finished here, so the count includes it.
 */
export function useStreak(tick: unknown = 0): Streak {
  const auth = useAuth();
  const signedIn = !!auth.profile;
  const [server, setServer] = useState<number[]>([]);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetchDailyDays()
      .then((d) => alive && setServer(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [signedIn]);

  return useMemo(() => {
    const today = dayNo();
    const days = new Set([...localDailies(400).map((d) => d.day_no), ...loadPlayDays(), ...(signedIn ? server : [])]);
    const streak = runWithRest(days, today);
    return {
      streak,
      best: longestWithRest(days, today),
      playedToday: days.has(today),
      played: [...days].filter((d) => Number.isInteger(d) && d >= 1 && d <= today).length,
      // Rest days: the same rule the server runs (src/engine/rest.ts).
      week: weekParts(days, today, restDays(days, today)),
      month: daysThisMonth(days, today),
    };
    // `tick` is the reason to recount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, signedIn, tick]);
}
