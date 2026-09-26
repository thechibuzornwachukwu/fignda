import { dailyStats } from './streak';

export type PlayRow = {
  game_id: string;
  day_no: number | null;
  found: number;
  /** Null while it is today's daily (the count is hidden). */
  total: number | null;
  score: number;
  secs: number;
  created_at: string;
  verified?: boolean;
};

export type DayCell = { day: number; state: 'perfect' | 'played' | 'none' };

export type ProfileStats = {
  dailies: number;
  streak: number;
  bestStreak: number;
  perfect: number;
  last14: DayCell[];
  recent: PlayRow[];
};

const isPerfect = (p: PlayRow) => p.total != null && p.total > 0 && p.found === p.total;

/** Longest run of consecutive days. */
function longestRun(days: Set<number>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(d - 1)) continue;
    let n = 1;
    while (days.has(d + n)) n++;
    best = Math.max(best, n);
  }
  return best;
}

export function profileStats(plays: readonly PlayRow[], today: number): ProfileStats {
  const dailyPlays = plays.filter((p) => p.day_no != null && p.day_no >= 1 && p.day_no <= today);
  const days = new Set(dailyPlays.map((p) => p.day_no!));
  const { played, streak } = dailyStats(days, today);
  const byDay = new Map(dailyPlays.map((p) => [p.day_no!, p]));
  const last14: DayCell[] = Array.from({ length: 14 }, (_, i) => {
    const day = today - 13 + i;
    const p = byDay.get(day);
    return { day, state: !p ? 'none' : isPerfect(p) ? 'perfect' : 'played' };
  });
  const recent = [...plays].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
  return {
    dailies: played,
    streak,
    bestStreak: longestRun(days),
    perfect: plays.filter(isPerfect).length,
    last14,
    recent,
  };
}
