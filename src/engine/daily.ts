// Daily. The server is authoritative; the client uses this for display only.

export const DAY0 = Date.UTC(2026, 0, 1);

/** 1-based day number in UTC. 2026-01-01 is day 1. */
export function dayNo(d: Date = new Date()): number {
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - DAY0) / 864e5) + 1;
}

/** One holiday in `data/holidays.json`. Fixed ones repeat every year (`date`), moving ones list each date (`dates`). */
export type Holiday = {
  id: string;
  /** Shown before "daily": "Christmas daily". */
  name: string;
  /** MM-DD, every year. */
  date?: string;
  /** YYYY-MM-DD, for holidays that move (Easter, Eid). */
  dates?: readonly string[];
  /** The puzzle to use that day. */
  game: string;
};

/** `since` (YYYY-MM-DD): holidays before it are ignored, so days already played keep the puzzle they had. */
export type Calendar = { since: string; holidays: readonly Holiday[] };

/** YYYY-MM-DD of a day number, in UTC. */
export function isoDate(n: number): string {
  return new Date(DAY0 + (n - 1) * 864e5).toISOString().slice(0, 10);
}

/** The holiday on day `n`, if any. Only that one day changes: the rotation carries on underneath. */
export function holidayOn(n: number, cal?: Calendar): Holiday | undefined {
  if (!cal) return undefined;
  const iso = isoDate(n);
  if (iso < cal.since) return undefined;
  return cal.holidays.find((h) => h.date === iso.slice(5) || h.dates?.includes(iso));
}

export function dailyGameId(n: number, pool: readonly string[], cal?: Calendar): string {
  const h = holidayOn(n, cal);
  if (h) return h.game;
  // Positive modulo so pre-launch dates still resolve.
  return pool[((n % pool.length) + pool.length) % pool.length]!;
}
