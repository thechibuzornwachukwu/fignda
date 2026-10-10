// What a guest is told under a result (SPEC section 6, Results). Play first stays: nothing here is a wall.
// A guest is asked at the moments something has been earned, with the fact that makes signing in worth it.

import type { PoolKey, Vars } from '../copy';
import { storage } from './storage';

/** A place is only said on a board with this many players, the guest included. Fewer, and it means nothing. */
export const PLACE_MIN_PLAYERS = 6;
/** The run is worth a word from here. */
export const RUN_ASK = 3;

const TOLD_KEY = 'gazecraft-run-told';

export type GuestFacts = {
  /** Today's daily, just finished or opened again. */
  today: boolean;
  /** The guest's run of dailies. */
  streak: number;
  /** Whether the line about the run has been said in this browser. */
  runTold: boolean;
  /** Where the guest's score would stand today, when the server has answered. */
  place?: { place: number; players: number } | null;
};

/**
 * The one line for a guest, or none for the plain ask. The run comes first, once: it is the thing they can lose.
 * After that, their place on today's board. Pure.
 */
export function guestAsk(f: GuestFacts): { pool: PoolKey; vars: Vars; run: boolean } | null {
  if (!f.today) return null;
  if (f.streak >= RUN_ASK && !f.runTold) return { pool: 'guestRun', vars: { n: f.streak }, run: true };
  const p = f.place;
  if (p && Number.isInteger(p.place) && Number.isInteger(p.players) && p.players >= PLACE_MIN_PLAYERS && p.place >= 1 && p.place <= p.players) {
    return { pool: 'guestPlace', vars: { n: p.place, m: p.players }, run: false };
  }
  return null;
}

export const runTold = (): boolean => storage.get(TOLD_KEY) === '1';
export const markRunTold = (): void => void storage.set(TOLD_KEY, '1');
