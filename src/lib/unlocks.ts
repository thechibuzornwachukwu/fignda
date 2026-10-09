// Less at once (BUILD_PLAN 2c, SPEC section 6). An entry point appears when the player has done what it scores.
// These rules hide links and sections. They never guard a route: a direct link always works.

export const FEATURES = ['boards', 'badges', 'points', 'circles', 'friendStreaks', 'make'] as const;
export type Feature = (typeof FEATURES)[number];
export type Unlocks = Record<Feature, boolean>;

/** What the player has done so far, counted from the browser and, signed in, from their stored plays. */
export type History = {
  /** Games played to the end, dailies included. */
  finished: number;
  /** Plays the server has verified. */
  verified: number;
  /** Dailies finished. */
  dailies: number;
  /** Every play that counts toward Make a puzzle. */
  plays: number;
};

export const UNLOCKS_KEY = 'gazecraft-unlocks';
export const FIRST_VISIT: History = { finished: 0, verified: 0, dailies: 0, plays: 0 };

export const NEEDS: Readonly<Record<Feature, { of: keyof History; n: number }>> = {
  boards: { of: 'finished', n: 1 },
  badges: { of: 'verified', n: 1 },
  points: { of: 'verified', n: 1 },
  circles: { of: 'dailies', n: 3 },
  friendStreaks: { of: 'dailies', n: 3 },
  make: { of: 'plays', n: 5 },
};

/** A whole count of 0 or more. Anything else reads as 0. */
export const countOf = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** A length that survives a value that is not a list. */
export const sizeOf = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

/** Anything that is not a clean count reads as 0, so missing or broken data is a first visit. */
export function readHistory(raw: unknown): History {
  if (raw == null || typeof raw !== 'object') return { ...FIRST_VISIT };
  const r = raw as Record<string, unknown>;
  return { finished: countOf(r.finished), verified: countOf(r.verified), dailies: countOf(r.dailies), plays: countOf(r.plays) };
}

/** The stored list of things already shown. Unknown names and wrong shapes are dropped. */
export function readKept(raw: unknown): Feature[] {
  if (!Array.isArray(raw)) return [];
  return FEATURES.filter((f) => raw.includes(f));
}

/** `kept` is what this player was already shown: once on screen, a thing never goes away. */
export function unlocks(history: unknown, kept: unknown = []): Unlocks {
  const h = readHistory(history);
  const k = readKept(kept);
  const out = {} as Unlocks;
  for (const f of FEATURES) out[f] = k.includes(f) || h[NEEDS[f].of] >= NEEDS[f].n;
  return out;
}

/** True while nothing has appeared yet: the daily and the games list only. */
export const isFirstVisit = (u: Unlocks): boolean => FEATURES.every((f) => !u[f]);

export const unlockedList = (u: Unlocks): Feature[] => FEATURES.filter((f) => u[f]);
