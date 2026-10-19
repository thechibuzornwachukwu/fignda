// The outfit the player's pet wears (BUILD_PLAN set 7m), kept in this browser. A few are earned: by packs done,
// or a rank reached, the same needs as the player's own extras (`../avatar/earned`). The rest wait for Paystack.

import { useSyncExternalStore } from 'react';
import type { Need } from '../avatar/earned';
import { PET_OUTFITS, type PetOutfit } from '../engine/partners';
import { storage } from './storage';

const KEY = 'gazecraft-pet-outfit';

/** What each outfit asks for. */
export const OUTFIT_NEEDS: Readonly<Record<PetOutfit, Need>> = {
  'bow tie': { cases: 3 },
  beanie: { cases: 10 },
  'party hat': { rank: 'Keen' },
};

const listeners = new Set<() => void>();
const read = (): PetOutfit | null => {
  const v = storage.get(KEY);
  return PET_OUTFITS.find((o) => o === v) ?? null;
};

/** The outfit worn, or none. Anything stored that is not an outfit is none. */
export const loadOutfit = read;

/** Put one on, or take it off (null). */
export function wearOutfit(o: PetOutfit | null): void {
  if (o) storage.set(KEY, o);
  else storage.remove(KEY);
  listeners.forEach((l) => l());
}

export function useOutfit(): PetOutfit | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
}
