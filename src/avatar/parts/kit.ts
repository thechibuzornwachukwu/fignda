// Detective kit: pieces a player earns by closing cases and rising in rank (SPEC section 5, Outfits). One entry
// per choice. Which piece needs what is in `../earned.ts`.
//
// TO ADD ONE: append an entry to the END of KIT_STYLES (saved avatars store the position; never reorder or
// remove), then give it a line in EARNED. They are drawn last, on top of everything.
// The head is a 38 by 45 rounded box from (29, 25); the chest is below y 80; the window shows x -7 to 103.

import { c, ellipse, GOLD, INK, line, p, rect, WHITE, type Shape } from '../shapes';
import type { Part } from './face';
import { star } from './festive';

const TWEED = '#8a6f4d';
const TWEED_DARK = '#6b5438';
const WOOD = '#7a4e2d';

/** A gold shield pinned to the chest, with a star. */
const badge = (): Shape[] => [p('M57 86h10v5c0 4.5-2.2 7-5 8.5-2.8-1.5-5-4-5-8.500z', { fill: GOLD }), star(59.3, 87.8, 0.54, WHITE)];
/** A magnifying glass held up at the lower right, inside the round frame an avatar is shown in. */
const glass = (): Shape[] => [
  line('M78.5 85.5l5.5 6', WOOD, 4.2),
  c(73, 79.5, 8, WHITE, { opacity: 0.35 }),
  line('M65 79.5a8 8 0 1 0 16 0a8 8 0 1 0-16 0', INK, 2.6),
  line('M68.5 76.5q2-3.5 5.5-3.5', WHITE, 1.3),
];/** A tweed deerstalker: a round crown with a checked band, a peak, and the knot on top. */
const hat = (): Shape[] => [
  p('M31 30c0-13 7-21 17-21s17 8 17 21z', { fill: TWEED }),
  line('M39 13v16M48 9.500v20M57 13v16', TWEED_DARK, 1.1),
  rect({ x: 31, y: 25, width: 34, height: 5, fill: TWEED_DARK }),
  ellipse({ cx: 48, cy: 30.5, rx: 25, ry: 4.5, fill: TWEED }),
  c(48, 8.5, 2.4, TWEED_DARK),
];

export const KIT_STYLES: readonly Part[] = [
  { name: 'none', draw: () => [] },
  { name: 'badge', draw: badge },
  { name: 'magnifying glass', draw: glass },
  { name: 'detective hat', draw: hat },
  { name: 'full kit', draw: () => [...hat(), ...badge(), ...glass()] },
];