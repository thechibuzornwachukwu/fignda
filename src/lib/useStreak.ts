import { useEffect, useMemo, useState } from 'react';
import { dayNo } from '../engine/daily';
import { fetchDailyDays, localDailies } from './api';
import { useAuth } from './auth';
import { longestRun } from './profileStats';
import { dailyStats } from './streak';
import { daysThisMonth, weekParts, type DayState } from './week';

export type Streak = {
  streak: number;
  best: number;
  playedToday: boolean;
  /** Dailies ever played. 0 means there is nothing to show yet. */
  played: number;
  /** The last 7 UTC days, oldest first. */
  week: DayState[];
  /** Dailies played in this UTC month. */
  month: number;
};

/**
 * The player's own run of dailies: what is finished in this browser, plus their stored plays when signed in.
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
    const days = new Set([...localDailies(400).map((d) => d.day_no), ...(signedIn ? server : [])]);
    const { streak, played } = dailyStats(days, today);
    return {
      streak,
      best: longestRun(days),
      playedToday: days.has(today),
      played,
      // Rest days are the server's to grant. Until it does, none are passed.
      week: weekParts(days, today),
      month: daysThisMonth(days, today),
    };
    // `tick` is the reason to recount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, signedIn, tick]);
}
