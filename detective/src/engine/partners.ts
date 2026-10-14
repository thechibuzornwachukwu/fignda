// The pets (SPEC section 5, Pets): the cat, the dino, the dog and the robot, one of whom works every case beside
// the player. Any of the 4 can be chosen, at any time, for nothing. Pure.

import type { HintKind } from './hint';

/** The pets, in the order they are offered. Ids are stored: never rename or reorder. */
export const PARTNERS = [
  { id: 'cat', name: 'Detective X' },
  { id: 'dino', name: 'Detective Tobs' },
  { id: 'dog', name: 'Detective Puff' },
  // The robot. It scans and zooms where the animals hold a glass and wear a monocle.
  { id: 'robot', name: 'Agent 404' },
] as const;

export type PartnerId = (typeof PARTNERS)[number]['id'];
export const DEFAULT_PARTNER: PartnerId = 'cat';

export const partnerName = (id: PartnerId): string => PARTNERS.find((p) => p.id === id)!.name;

/** A stored pet, or the default for anything that is not one. */
export const parsePartner = (raw: unknown): PartnerId => (PARTNERS.some((p) => p.id === raw) ? (raw as PartnerId) : DEFAULT_PARTNER);

/** The mood a pet shows in each moment. One mood per moment. */
export const MOOD = { hello: 'wave', empty: 'calm', loading: 'thinking', error: 'stumped', done: 'happy', found: 'found', asleep: 'sleepy' } as const;
export type Moment = keyof typeof MOOD;

/** How each pet chooses the answer its tip-off marks (`hintAnswer`). Same cost, same mark: one first letter. */
export const HINT_OF: Record<PartnerId, HintKind> = { cat: 'first', dino: 'longest', dog: 'near', robot: 'shortest' };

/** The picture of a pet in a moment. */
export const partnerSrc = (id: PartnerId, moment: Moment): string => `/pets/${id}-${MOOD[moment]}.svg`;
