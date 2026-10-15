// Extras: pieces a player earns by finishing packs and rising in rank (SPEC section 5, Outfits). One entry per
// choice. Which piece needs what is in `../earned.ts`.
//
// TO ADD ONE: append an entry to the END of KIT_STYLES (saved avatars store the position; never reorder or
// remove), then give it a line in EARNED. They are drawn last, on top of everything.
// The head is a 38 by 45 rounded box from (29, 25); the chest is below y 80; the window shows x -7 to 103.

import { c, GOLD, INK, line, p, rect, WHITE, type Shape } from '../shapes';
import type { Part } from './face';
import { star } from './festive';

const CUSHION = '#e4572e';
const BAND = '#2b2b33';

/** A gold star pinned to the chest. */
const pin = (): Shape[] => [c(62, 91, 6.5, GOLD), star(58.3, 87.3, 0.62, WHITE)];
/** Headphones: a band over the top of the head and a bright cushion over each ear. */
const phones = (): Shape[] => [
  line('M27 46c0-21 9-29 21-29s21 8 21 29', BAND, 3.6),
  rect({ x: 22, y: 39, width: 9, height: 16, rx: 4, fill: CUSHION }),
  rect({ x: 65, y: 39, width: 9, height: 16, rx: 4, fill: CUSHION }),
];
/** A gold crown on top of the head, with 3 points and a jewel. */
const crown = (): Shape[] => [
  p('M33 29l2-14 7 7 6-10 6 10 7-7 2 14z', { fill: GOLD, stroke: INK, 'stroke-width': 1, 'stroke-linejoin': 'round' }),
  c(48, 23.5, 2, CUSHION),
];

export const KIT_STYLES: readonly Part[] = [
  { name: 'none', draw: () => [] },
  // Positions are what a saved avatar stores: these 4 keep the slots the first earned pieces held.
  { name: 'star pin', draw: pin },
  { name: 'headphones', draw: phones },
  { name: 'crown', draw: crown },
  { name: 'gold set', draw: () => [...crown(), ...pin()] },
];