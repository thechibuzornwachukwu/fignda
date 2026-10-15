// Leagues (BUILD_PLAN set 3g): a table of up to 20 a week, 5 tiers named for the medal metals. The rules are the
// database's (supabase/migrations/20261015000500_leagues.sql); this only names and reads what it returns.

export const LEAGUE_TIERS = ['Bronze', 'Silver', 'Gold', 'Jade', 'Onyx'] as const;
/** How many at the top of a table go up when the week ends. */
export const LEAGUE_UP = 5;

export type LeagueRow = { place: number; handle: string; name: string; points: number; me: boolean };
export type League = { tier: number; players: number; rows: LeagueRow[] };

/** The tier's name. Anything out of range is the first. */
export const tierName = (tier: number): string => LEAGUE_TIERS[Number.isInteger(tier) && tier >= 0 && tier < LEAGUE_TIERS.length ? tier : 0]!;

/** What `my_league` answered, as a league. Empty (null) for a player who left, or for nothing usable. */
export function readLeague(data: unknown): League | null {
  const rows = (Array.isArray(data) ? data : []).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && typeof (r as { handle?: unknown }).handle === 'string');
  if (rows.length === 0) return null;
  return {
    tier: Number(rows[0]!.tier) || 0,
    players: Number(rows[0]!.players) || rows.length,
    rows: rows.map((r, i) => ({ place: Number(r.place) || i + 1, handle: r.handle as string, name: String(r.name ?? ''), points: Math.max(0, Number(r.points) || 0), me: r.me === true })),
  };
}

/** A row goes up when the week ends: the top 5, with points to show for it, below the top tier. */
export const goesUp = (row: LeagueRow, tier: number): boolean => row.place <= LEAGUE_UP && row.points > 0 && tier < LEAGUE_TIERS.length - 1;
