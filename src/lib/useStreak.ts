import { useEffect, useMemo, useState } from 'react';
import { dayNo } from '../engine/daily';
import { fetchDailyDays, localDailies } from './api';
import { useAuth } from './auth';
import { longestRun } from './profileStats';
import { dailyStats } from './streak';

export type Streak = { streak: number; best: number; playedToday: boolean };

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
    const { streak } = dailyStats(days, today);
    return { streak, best: longestRun(days), playedToday: days.has(today) };
    // `tick` is the reason to recount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, signedIn, tick]);
}
