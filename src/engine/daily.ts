// Daily. The server is authoritative; the client uses this for display only.

export const DAY0 = Date.UTC(2026, 0, 1);

/** 1-based day number in UTC. 2026-01-01 is day 1. */
export function dayNo(d: Date = new Date()): number {
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - DAY0) / 864e5) + 1;
}

export function dailyGameId(n: number, pool: readonly string[]): string {
  // Positive modulo so pre-launch dates still resolve.
  return pool[((n % pool.length) + pool.length) % pool.length]!;
}
