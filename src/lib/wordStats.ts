/** How many verified players found one word of a daily. */
export type WordStat = { key: string; found: number; players: number };

/** Below this many players a percentage says nothing. */
export const MIN_PLAYERS = 5;
/** A word most players found is not worth a line. */
export const RARE_PCT = 50;

/**
 * The rarest word this player found, with the share of players who found it, or null when there is nothing
 * worth saying: too few players, or everything they found was common. Never 0%: the player found it too.
 */
export function rarestFound(stats: readonly WordStat[], foundKeys: readonly string[]): { key: string; pct: number } | null {
  const mine = new Set(foundKeys);
  let best: { key: string; pct: number } | null = null;
  for (const s of stats) {
    if (!mine.has(s.key) || s.players < MIN_PLAYERS) continue;
    const pct = Math.max(1, Math.round((s.found / s.players) * 100));
    if (pct <= RARE_PCT && (!best || pct < best.pct)) best = { key: s.key, pct };
  }
  return best;
}
