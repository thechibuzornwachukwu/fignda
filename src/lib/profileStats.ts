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
  /** Clean read, recorded by the server from the play log. Null on a public row while it is today's daily. */
  clean?: boolean | null;
};

export type DayCell = { day: number; state: 'perfect' | 'played' | 'none' };

export type ProfileStats = {
  /** Lifetime tally from verified plays: every daily, and the best score on each other puzzle. */
  points: number;
  dailies: number;
  streak: number;
  bestStreak: number;
  perfect: number;
  /** Clean reads: every daily, and each other puzzle once. */
  cleanReads: number;
  last14: DayCell[];
  recent: PlayRow[];
};

const isPerfect = (p: PlayRow) => p.total != null && p.total > 0 && p.found === p.total;

/** Longest run of consecutive days. */
export function longestRun(days: ReadonlySet<number>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(d - 1)) continue;
    let n = 1;
    while (days.has(d + n)) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Same rule as the database (player_points): a replayed puzzle counts its best score only. */
export function pointsOf(plays: readonly PlayRow[]): number {
  let total = 0;
  const best = new Map<string, number>();
  for (const p of plays) {
    if (p.verified === false) continue;
    if (p.day_no != null) total += p.score;
    else best.set(p.game_id, Math.max(best.get(p.game_id) ?? 0, p.score));
  }
  for (const v of best.values()) total += v;
  return total;
}

/** Same rule as the database (clean_reads_of): a puzzle read cleanly more than once counts once. */
export function cleanReadsOf(plays: readonly PlayRow[]): number {
  const seen = new Set<string>();
  for (const p of plays) {
    if (p.clean !== true || p.verified === false) continue;
    seen.add(p.day_no != null ? `d:${p.day_no}` : `g:${p.game_id}`);
  }
  return seen.size;
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
    points: pointsOf(plays),
    dailies: played,
    streak,
    bestStreak: longestRun(days),
    perfect: plays.filter(isPerfect).length,
    cleanReads: cleanReadsOf(plays),
    last14,
    recent,
  };
}
