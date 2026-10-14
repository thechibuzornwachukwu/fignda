/** How many verified players found one word of a daily. */
export type WordStat = { key: string; found: number; players: number };

/** Below this many players a percentage says nothing. */
export const MIN_PLAYERS = 5;
/** At or under this share the line says "Only". Above it the word is still the player's rarest, said plainly. */
export const RARE_PCT = 50;

/**
 * The rarest word this player found, with the share of players who found it. Said every day there are enough
 * players, however common the word. Null when there is nothing to say: no stats, too few players, nothing found,
 * or numbers that are not numbers. Never 0%: the player found it too. Never over 100%.
 */
export function rarestFound(stats: readonly WordStat[], foundKeys: readonly string[]): { key: string; pct: number } | null {
  const mine = new Set(foundKeys);
  let best: { key: string; pct: number } | null = null;
  for (const s of stats ?? []) {
    if (!s || !mine.has(s.key)) continue;
    if (!Number.isFinite(s.players) || !Number.isFinite(s.found) || s.players < MIN_PLAYERS || s.found < 0) continue;
    const pct = Math.min(100, Math.max(1, Math.round((s.found / s.players) * 100)));
    if (!best || pct < best.pct) best = { key: s.key, pct };
  }
  return best;
}
