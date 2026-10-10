// A guest plays 2 games, then is asked to sign in (SPEC section 6, Guests). The count is of games played to
// the end in this browser. A game already played stays open, so a result is never taken away.

import { storage } from './storage';

export const GUEST_GAMES = 2;
export const GUEST_PLAYED_KEY = 'gazecraft-guest-played';

/** What a game is counted under: a daily by its day, a clue by its clue id, a puzzle by its id. */
export const playKey = (id: string, dailyN?: number, clue?: number): string => (dailyN != null ? `d${dailyN}` : clue ? `${id}~${clue}` : id);

export function guestPlayed(): string[] {
  const v = storage.getJSON<unknown>(GUEST_PLAYED_KEY);
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];
}

/** Remember a game a guest played to the end. Safe to repeat. */
export function markGuestPlayed(key: string): void {
  const cur = guestPlayed();
  if (!cur.includes(key)) storage.setJSON(GUEST_PLAYED_KEY, [...cur, key]);
}

/** Whether a guest has had their games and this is a new one. */
export const guestBlocked = (key: string): boolean => {
  const cur = guestPlayed();
  return cur.length >= GUEST_GAMES && !cur.includes(key);
};