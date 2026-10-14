// The player's partner in this browser (SPEC section 5, Partners). A guest's choice lives here. Signed in, the
// account is the truth: what it holds comes down, and a choice made here as a guest goes up once.

import { useSyncExternalStore } from 'react';
import { parseBonds, parsePartner, START, takePartner, type PartnerId, type PartnerState } from '../engine/partners';
import { chooseServerPartner, fetchMyPartner } from './api';
import { storage } from './storage';

export const PARTNER_KEY = 'gazecraft-partner';
const SERVER = { ...START, points: 0, bonds: {} };

/** `bonds`: cases closed with each partner, as the account counts them. A guest has none. */
type Held = PartnerState & { points: number; bonds: Partial<Record<PartnerId, number>> };

let cache: Held | null = null;
const listeners = new Set<() => void>();
const read = (): Held => {
  if (!cache) {
    const raw = storage.getJSON<{ points?: unknown; bonds?: unknown }>(PARTNER_KEY);
    const points = typeof raw?.points === 'number' && Number.isFinite(raw.points) ? Math.max(0, raw.points) : 0;
    cache = { ...parsePartner(raw), points, bonds: parseBonds(raw?.bonds) };
  }
  return cache;
};
function write(next: Held): void {
  cache = next;
  storage.setJSON(PARTNER_KEY, next);
  listeners.forEach((l) => l());
}

/** Whether a partner was ever chosen here. A player who never chose has the default and is not sent up. */
export const partnerChosen = (): boolean => storage.get(PARTNER_KEY) != null;

export const loadPartner = (): Held => read();

/** For tests, and for a sign out that cleared storage under us. */
export function forgetPartner(): void {
  cache = null;
  listeners.forEach((l) => l());
}

/** The partner beside this player, their others, and the points they were last known to have. */
export function usePartner(): Held {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => SERVER,
  );
}

/**
 * Choose a partner. A guest's choice is kept here: the first is free, and with no points there is no second.
 * Signed in, the account decides and its answer is kept. Returns whether the partner is now beside the player.
 */
export async function choosePartner(id: PartnerId, signedIn: boolean): Promise<boolean> {
  const now = read();
  if (!signedIn) {
    // A guest holds 1: choosing another swaps it, since nothing was earned yet.
    write({ current: id, owned: [id], points: 0, bonds: {} });
    return true;
  }
  const answer = await chooseServerPartner(id).catch(() => null);
  if (!answer) {
    // Offline: only a switch among what is already held is safe to show.
    if (!now.owned.includes(id)) return false;
    write({ ...takePartner(now, id, now.points), points: now.points, bonds: now.bonds });
    return true;
  }
  write({ ...parsePartner(answer), points: now.points, bonds: now.bonds });
  return answer.current === id;
}

/**
 * Signed in: bring the account's partners here. An account with none takes the one chosen here as a guest.
 * Fails quietly: the next visit tries again.
 */
export async function syncPartner(): Promise<void> {
  const mine = await fetchMyPartner().catch(() => undefined);
  if (mine === undefined) return;
  if (mine) return write({ ...parsePartner(mine), points: mine.points, bonds: parseBonds(mine.bonds) });
  if (!partnerChosen()) return;
  const answer = await chooseServerPartner(read().current).catch(() => null);
  if (answer) write({ ...parsePartner(answer), points: 0, bonds: {} });
}