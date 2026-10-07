// Everything on the face: eyes, mouths, facial hair, skin marks, glasses and earrings, things in the mouth,
// and hair ties. One entry per choice.
//
// TO ADD A CHOICE: append an entry to the END of its list (saved avatars store the position; never reorder
// or remove). The first entry of each optional list is 'none'.
// Landmarks: eyes at (40, 48) and (56, 48); mouth around (48, 58); cheeks around (36, 54) and (60, 54);
// ears at (28, 49) and (68, 49).

import { c, ellipse, INK, line, p, rect, RED, ROSE, WHITE, type Kit, type Look, type Shape } from '../shapes';

export type Part = { name: string; look?: Look; draw: (k: Kit) => Shape[] };
const none: Part = { name: 'none', draw: () => [] };

/** A highlight keeps eyes readable on every skin tone. */
const eye = (x: number, r: number): Shape[] => [c(x, 48, r, INK), c(x + r * 0.35, 48 - r * 0.35, r * 0.34, WHITE)];
const closed = (x: number): Shape => line(`M${x - 3.5} 49q3.5-4.5 7 0`, INK);

export const EYE_STYLES: readonly Part[] = [
  { name: 'dots', draw: () => [...eye(40, 2.7), ...eye(56, 2.7)] },
  { name: 'smiling', draw: () => [closed(40), closed(56)] },
  { name: 'wide', draw: () => [c(40, 48, 4.4, WHITE), c(56, 48, 4.4, WHITE), ...eye(40.6, 2.4), ...eye(56.6, 2.4)] },
  { name: 'wink', draw: () => [closed(40), ...eye(56, 2.7)] },
];

export const MOUTH_STYLES: readonly Part[] = [
  { name: 'smile', draw: () => [line('M41 58q7 6 14 0', INK)] },
  { name: 'grin', draw: () => [p('M40 57h16a8 7 0 0 1-16 0z', { fill: WHITE, stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' })] },
  { name: 'flat', draw: () => [line('M42 60h12', INK)] },
  { name: 'smirk', draw: () => [line('M42 60q8 3 12-3', INK)] },
];

/** Drawn under the mouth so the mouth stays readable. Takes the hair colour. */
export const FACE_HAIR_STYLES: readonly Part[] = [
  none,
  { name: 'beard', look: 'masculine', draw: (k) => [p('M29 50c1 14 8 21 19 21s18-7 19-21c-2 8-6 12-10 13-3-2-15-2-18 0-4-1-8-5-10-13z', { fill: k.hair })] },
  { name: 'moustache', look: 'masculine', draw: (k) => [p('M39 56q4.5-4 9-1q4.5-3 9 1q-4.5 2.5-9 0.5q-4.5 2-9-0.5z', { fill: k.hair })] },
  { name: 'goatee', look: 'masculine', draw: (k) => [ellipse({ cx: 48, cy: 66.5, rx: 5.5, ry: 3.6, fill: k.hair })] },
];

const spot = (x: number, y: number, r: number, fill: string, opacity: number): Shape => c(x, y, r, fill, { opacity });
/** Tribal marks: short lines on the cheeks, a shade deeper than the skin. */
const scar = (d: string): Shape => p(d, { fill: 'none', stroke: INK, 'stroke-width': 1.15, 'stroke-linecap': 'round', opacity: 0.5 });

export const MARK_STYLES: readonly Part[] = [
  none,
  { name: 'freckles', draw: () => ([[36, 53], [39, 55], [33.5, 55.5], [60, 53], [57, 55], [62.5, 55.5]] as const).map(([x, y]) => spot(x, y, 0.9, INK, 0.45)) },
  { name: 'pimples', draw: () => ([[35, 55, 1.5], [38.5, 52.5, 1.1], [61, 54, 1.4], [44, 39, 1.2], [58, 57.5, 1]] as const).map(([x, y, r]) => spot(x, y, r, RED, 0.8)) },
  { name: 'beauty mark', draw: () => [spot(58.5, 56.5, 1.3, INK, 0.9)] },
  { name: 'blush', draw: () => [spot(35.5, 55, 4.2, ROSE, 0.32), spot(60.5, 55, 4.2, ROSE, 0.32)] },
  { name: 'tribal marks', draw: () => [scar('M33.5 52v5M36 52v5M38.5 52v5M57.5 52v5M60 52v5M62.5 52v5')] },
  { name: 'tribal marks across', draw: () => [scar('M33 52.5h6M33 55h6M33 57.5h6M57 52.5h6M57 55h6M57 57.5h6')] },
  { name: 'single mark', draw: () => [scar('M35 51.5l3 6M61 51.5l-3 6')] },
];

/** `hidesEyes`: drawn instead of the eyes. `onEars`: skipped when the ears are covered. */
export type Extra = Part & { hidesEyes?: boolean; onEars?: boolean };
export const EXTRA_STYLES: readonly Extra[] = [
  none,
  {
    name: 'glasses',
    draw: () => [
      rect({ x: 33, y: 42.5, width: 13, height: 11, rx: 5, fill: 'none', stroke: INK, 'stroke-width': 2 }),
      rect({ x: 50, y: 42.5, width: 13, height: 11, rx: 5, fill: 'none', stroke: INK, 'stroke-width': 2 }),
      line('M46 47h4', INK, 2),
    ],
  },
  { name: 'earrings', onEars: true, draw: (k) => [c(28, 57, 2.6, k.accent), c(68, 57, 2.6, k.accent)] },
  {
    name: 'shades',
    hidesEyes: true,
    draw: () => [
      rect({ x: 32, y: 43, width: 14, height: 10, rx: 4, fill: INK }),
      rect({ x: 50, y: 43, width: 14, height: 10, rx: 4, fill: INK }),
      line('M46 46h4M32 46l-3-1M64 46l3-1', INK, 2),
      line('M35 46l3-1M53 46l3-1', WHITE, 1.2),
    ],
  },
];

export const MOUTH_ITEM_STYLES: readonly Part[] = [
  none,
  { name: 'toothpick', draw: () => [line('M52 60l13 4.5', '#e6cfa3', 1.3)] },
  { name: 'chewing stick', draw: () => [line('M52 60l13 4', '#a9773f', 2.8), line('M63.5 63.5l2.5 0.8', '#ecd9b4', 2.8)] },
];

/** Hair ties are placed by the hairstyle (see `scrunchie` in hair.ts), so these only carry the names. */
export const HAIR_TIE_NAMES = ['none', 'scrunchie', 'headband'] as const;
export const scrunchie = (k: Kit, [x, y, rx, ry]: readonly [number, number, number, number]): Shape =>
  ellipse({ cx: x, cy: y, rx, ry, fill: k.accent, stroke: INK, 'stroke-width': 0.8 });
export const headband = (k: Kit): Shape => line('M30.5 37c5-5 11-7 17.5-7s12.5 2 17.5 7', k.accent, 3.6);
