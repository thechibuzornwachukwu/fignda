// The player's pet, kept in this browser (SPEC section 5, Pets). Any of the 4, chosen at any time, for nothing.

import { useSyncExternalStore } from 'react';
import { DEFAULT_PARTNER, parsePartner, type PartnerId } from '../engine/partners';
import { storage } from './storage';

export const PARTNER_KEY = 'lantern-pet';

let cache: PartnerId | null = null;
const listeners = new Set<() => void>();
const read = (): PartnerId => (cache ??= parsePartner(storage.get(PARTNER_KEY)));

/** The pet beside the player now. */
export const loadPartner = (): PartnerId => read();

/** The pet beside the player, kept in step with every screen that shows it. */
export function usePartner(): PartnerId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULT_PARTNER,
  );
}

/** Choose a pet. Every one is open. */
export function choosePartner(id: PartnerId): void {
  cache = id;
  storage.set(PARTNER_KEY, id);
  listeners.forEach((l) => l());
}

/** For tests, and for a sign out that cleared storage under us. */
export function forgetPartner(): void {
  cache = null;
  listeners.forEach((l) => l());
}
