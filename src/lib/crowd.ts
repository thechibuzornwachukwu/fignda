// Ranks opens on your crowd: people you follow if there are any, else everyone. A circle's board is on the circle (Squad).

import { countOf } from './unlocks';

export const CROWDS = ['following', 'everyone'] as const;
export type Crowd = (typeof CROWDS)[number];

/** The board asked for in the address, or null when it names none. */
export function askedCrowd(raw: string | null | undefined): Crowd | null {
  return CROWDS.find((c) => c === raw) ?? null;
}

/** A count that is missing or not a number reads as 0, so a failed lookup lands on everyone. */
export function defaultCrowd(following: unknown): Crowd {
  return countOf(following) > 0 ? 'following' : 'everyone';
}
