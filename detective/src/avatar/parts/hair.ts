// Hair and headwear. One entry per style.
//
// TO ADD A STYLE: append an entry to the END of HAIR_STYLES. Saved avatars store a style by its position,
// so never reorder or remove entries (a unit test pins the order).
//   behind(k)   shapes drawn behind the head (afros, braids hanging down, buns)
//   front(k)    shapes drawn on the head (the hairline, parts, wraps)
//   headwear    a cap or wrap: no headband, and not used for starter avatars
//   noHeadband  nothing for a headband to sit on (bald)
//   veil        covers the neck, ears and shoulders (hijab)
//   scrunchie   where the hair is gathered: [x, y, rx, ry] for each tie
//   family      which group it is shown under in the designer (see HAIR_FAMILIES)
//   look        'feminine' or 'masculine' if the style is usually worn that way; leave it out if it is for anyone
// The head is a 38 by 45 rounded box from (29, 25); `CAP` is the plain hairline that most styles start from.

import { c, ellipse, GELE, GOLD, HAIR_COLOURS, INK, line, p, rect, SEAM_DARK, WHITE, type Kit, type Look, type Shape } from '../shapes';

/** How the designer groups hairstyles, so nobody browses all of them at once. */
export const HAIR_FAMILIES = [
  { key: 'cuts', title: 'Cuts and fades' },
  { key: 'afros', title: 'Afros and curls' },
  { key: 'braids', title: 'Braids and locs' },
  { key: 'long', title: 'Long and tied' },
  { key: 'covered', title: 'Headwear' },
] as const;
export type HairFamily = (typeof HAIR_FAMILIES)[number]['key'];

export type HairStyle = {
  name: string;
  family: HairFamily;
  /** Who usually wears it. Only steers Surprise me and starter avatars; anyone can pick anything. */
  look?: Look;
  behind?: (k: Kit) => Shape[];
  front?: (k: Kit) => Shape[];
  headwear?: boolean;
  noHeadband?: boolean;
  veil?: boolean;
  scrunchie?: ReadonlyArray<readonly [number, number, number, number]>;
};

const CAP = 'M29 45v-1a19 19 0 0 1 38 0v1c-4-8-11-11-19-11s-15 3-19 11z';
/** The sides of the head, for fades. */
const SIDES = 'M29 53v-9a19 19 0 0 1 38 0v9c-1-8-3-13-6-16-4-2-8-3-13-3s-9 1-13 3c-3 3-5 8-6 16z';
const BUN_TIE = [[48, 26, 7, 2.6]] as const;
/** Square partings for box braids: three rows front to back, one across. */
const BOX_PARTS = 'M38.5 27.5l-1.5 8M48 25.5v8.5M57.5 27.5l1.5 8M33 33.5c5-3.5 10-5 15-5s10 1.5 15 5';
/** Where braids hang: three by each ear, tight together, the inner ones just over the edge of the face. */
const BRAID_XS = [19.6, 23.2, 26.8, 65.8, 69.4, 73] as const;

const cap = (k: Kit) => p(CAP, { fill: k.hair });
/** A parting: a thin line of scalp. */
const part = (k: Kit, d: string) => line(d, k.skin, 1.1);
/** Shaved close: a light shadow of the hair colour. */
const shadow = (k: Kit, d: string) => p(d, { fill: k.hair, opacity: 0.34 });
/** A sheen line on dark hair. */
const sheen = (d: string, opacity: number) => p(d, { fill: 'none', stroke: WHITE, 'stroke-width': 1, 'stroke-linecap': 'round', opacity });
/** Hanging strands: one rounded bar per x. */
const strands = (k: Kit, xs: readonly number[], y: number, width: number, height: (x: number) => number) =>
  xs.map((x) => rect({ x, y, width, height: height(x), rx: width / 2, fill: k.hair }));

/**
 * Braids falling in front of the ears: tight bars with staggered ends, and a faint line between each so they
 * read as separate braids against the hair behind them.
 */
const braidFall = (k: Kit, length: number, stagger: readonly number[]): Shape[] => [
  ...BRAID_XS.map((x, i) => rect({ x, y: 40, width: 3.4, height: length + stagger[i % 3]!, rx: 1.7, fill: k.hair })),
  ...[23.1, 26.7, 69.3, 72.9].map((x) => sheen(`M${x} 43v${length - 6}`, 0.26)),
];
/** Gold cuffs clipped onto braids. */
const cuffs = (at: ReadonlyArray<readonly [number, number]>): Shape[] => at.map(([x, y]) => rect({ x: x - 1.9, y, width: 3.8, height: 2.4, rx: 0.8, fill: GOLD }));

export const HAIR_STYLES: readonly HairStyle[] = [
  { name: 'low cut', family: 'cuts', front: (k) => [cap(k)] },
  {
    name: 'afro', family: 'afros',
    behind: (k) => [c(48, 34, 27, k.hair)],
    front: (k) => [p('M28.5 47v-3a19.5 19.5 0 0 1 39 0v3c-3-7-10-10-19.5-10s-16.5 3-19.5 10z', { fill: k.hair })],
  },
  {
    name: 'braids', family: 'braids',
    look: 'feminine',
    behind: (k) => [
      rect({ x: 21, y: 34, width: 9, height: 46, rx: 4.5, fill: k.hair }),
      rect({ x: 66, y: 34, width: 9, height: 46, rx: 4.5, fill: k.hair }),
      c(25.5, 76, 3, k.accent),
      c(70.5, 76, 3, k.accent),
    ],
    front: (k) => [cap(k)],
  },
  { name: 'locs', family: 'braids', front: (k) => [cap(k), ...strands(k, [25, 31, 60, 66], 36, 5.5, (x) => (x === 25 || x === 66 ? 26 : 16))] },
  {
    name: 'puffs', family: 'afros',
    look: 'feminine',
    behind: (k) => [c(25, 27, 12, k.hair), c(71, 27, 12, k.hair)],
    front: (k) => [cap(k)],
    scrunchie: [[32.5, 33, 2.6, 4.4], [63.5, 33, 2.6, 4.4]],
  },
  { name: 'bald', family: 'cuts', noHeadband: true },
  {
    // A pleated fabric fan, wider than the head and angular at the top, over a wrap low on the forehead.
    name: 'gele', family: 'covered',
    look: 'feminine',
    headwear: true,
    behind: () => [
      p('M21 37L11 19l14-4 3-11 13 5 9-8 8 9 14-3 1 12 13 6-10 15z', { fill: GELE.cloth }),
      ...['M48 33L25 15', 'M48 33L41 9', 'M48 33L58 10', 'M48 33L73 18', 'M48 33L32 11', 'M48 33L66 12'].map((d) => line(d, GELE.fold, 1.3)),
    ],
    front: () => [
      p('M27 46c-2-13 7-21 21-21s23 8 21 21c-6-6-13-8-21-8s-15 2-21 8z', { fill: GELE.cloth }),
      p('M29 40c9-9 24-12 38-5-2-5-6-9-12-10-11 1-20 6-26 15z', { fill: GELE.light }),
      line('M28.5 43c6-5 12-7 19.5-7s13.5 2 19.5 7', GELE.fold, 1.2),
    ],
  },
  {
    name: 'fila', family: 'covered',
    look: 'masculine',
    headwear: true,
    front: (k) => [p('M28 40c-1-14 7-22 20-22 14 0 22 6 21 20-6-4-13-5-21-5s-14 2-20 7z', { fill: k.accent }), line('M30 38c6-4 12-5 18-5s14 1 20 4', INK, 1.6)],
  },
  {
    name: 'hijab', family: 'covered',
    look: 'feminine',
    headwear: true,
    veil: true,
    behind: (k) => [p('M48 14c-19 0-27 14-27 32 0 16-6 26-13 40h80c-7-14-13-24-13-40 0-18-8-32-27-32z', { fill: k.cloth })],
    front: (k) => [p('M27 47c0-15 9-24 21-24s21 9 21 24c-4-9-11-14-21-14s-17 5-21 14z', { fill: k.cloth })],
  },
  { name: 'short', family: 'cuts', front: (k) => [p('M28 47c-1-15 7-24 20-24 12 0 20 8 20 22-3-6-7-9-12-9-9 1-18 4-28 11z', { fill: k.hair })] },
  { name: 'side part', family: 'cuts', front: (k) => [p('M27 49c-3-18 6-28 21-28 14 0 22 9 20 26-2-8-6-12-11-13-10 4-20 8-30 15z', { fill: k.hair })] },
  {
    name: 'long', family: 'long',
    look: 'feminine',
    behind: (k) => [rect({ x: 22, y: 22, width: 52, height: 62, rx: 24, fill: k.hair })],
    front: (k) => [p('M29 48c0-15 8-24 19-24s19 9 19 24c-3-9-9-14-19-17-10 3-16 8-19 17z', { fill: k.hair })],
  },
  {
    name: 'bob', family: 'long',
    look: 'feminine',
    behind: (k) => [rect({ x: 22, y: 22, width: 52, height: 42, rx: 20, fill: k.hair })],
    front: (k) => [p('M29 45v-2a19 19 0 0 1 38 0v2c-6-4-12-5-19-5s-13 1-19 5z', { fill: k.hair })],
  },
  {
    name: 'ponytail', family: 'long',
    look: 'feminine',
    behind: (k) => [p('M64 28c12 0 16 10 14 22-1 8-5 14-9 16 2-8 0-14-5-18z', { fill: k.hair })],
    front: (k) => [cap(k)],
    scrunchie: [[66, 31, 3.2, 5]],
  },
  {
    name: 'curly', family: 'afros',
    behind: (k) => [c(30, 34, 9, k.hair), c(66, 34, 9, k.hair), c(27, 45, 6, k.hair), c(69, 45, 6, k.hair)],
    front: (k) => [c(34, 29, 8.5, k.hair), c(44, 25, 9, k.hair), c(54, 25, 9, k.hair), c(63, 30, 8, k.hair), cap(k)],
  },
  { name: 'bun', family: 'long', look: 'feminine', behind: (k) => [c(48, 17, 10, k.hair)], front: (k) => [cap(k)], scrunchie: BUN_TIE },
  { name: 'cornrows', family: 'braids', front: (k) => [cap(k), part(k, 'M36 37l2-9M42 35l1.5-9M48 34.5v-9.5M54 35l-1.5-9M60 37l-2-9')] },
  {
    name: 'bantu knots', family: 'afros',
    look: 'feminine',
    front: (k) => [cap(k), c(33, 27, 5.6, k.hair), c(40.5, 21.5, 5.6, k.hair), c(48, 19.5, 5.6, k.hair), c(55.5, 21.5, 5.6, k.hair), c(63, 27, 5.6, k.hair)],
  },
  { name: 'high top', family: 'cuts', look: 'masculine', front: (k) => [p('M31 41V17a8 8 0 0 1 8-8h18a8 8 0 0 1 8 8v24c-5-5-10-7-17-7s-12 2-17 7z', { fill: k.hair })] },
  {
    name: 'frohawk', family: 'afros',
    behind: (k) => [c(48, 19, 12, k.hair)],
    front: (k) => [p('M40 35c0-9 3-13 8-13s8 4 8 13c-3-2-5-3-8-3s-5 1-8 3z', { fill: k.hair })],
  },
  { name: 'twists', family: 'braids', front: (k) => [cap(k), ...strands(k, [25, 66], 36, 5, () => 20), ...strands(k, [32, 38.5, 45, 51.5, 58], 31, 5, () => 9.5)] },
  {
    name: 'long locs', family: 'braids',
    behind: (k) => strands(k, [19, 26, 64, 71], 30, 6, (x) => (x === 19 || x === 71 ? 46 : 54)),
    front: (k) => [cap(k)],
  },
  {
    // Braids gathered up to a knot on the crown.
    name: 'shuku', family: 'braids',
    look: 'feminine',
    behind: (k) => [c(48, 15, 7.5, k.hair)],
    front: (k) => [cap(k), part(k, 'M34 39l10-14M41 35.5l5-11M55 35.5l-5-11M62 39l-10-14')],
    scrunchie: [[48, 22, 5, 2.2]],
  },
  { name: 'top puff', family: 'afros', look: 'feminine', behind: (k) => [c(48, 16, 14, k.hair)], front: (k) => [cap(k)], scrunchie: BUN_TIE },
  {
    name: 'kufi', family: 'covered',
    look: 'masculine',
    headwear: true,
    front: (k) => [p('M29 39c0-13 8-20 19-20s19 7 19 20c-6-3-12-4-19-4s-13 1-19 4z', { fill: k.accent }), line('M30 33c6-2 12-3 18-3s12 1 18 3', INK, 1.4)],
  },
  {
    name: 'turban', family: 'covered',
    headwear: true,
    front: (k) => [
      p('M26 41c-5-17 6-27 22-27s27 10 22 27c-6-6-13-8-22-8s-16 2-22 8z', { fill: k.accent }),
      line('M30 34c8-9 20-12 34-8M34 26c8-5 18-6 28-2', INK, 1.4),
      c(48, 17, 5, k.accent),
    ],
  },
  { name: 'low fade', family: 'cuts', look: 'masculine', front: (k) => [shadow(k, SIDES), cap(k)] },
  {
    name: 'high fade', family: 'cuts',
    look: 'masculine',
    front: (k) => [shadow(k, SIDES), shadow(k, CAP), p('M35 34c0-6 5-9 13-9s13 3 13 9c-4-2-8-3-13-3s-9 1-13 3z', { fill: k.hair })],
  },
  {
    name: 'mohawk fade', family: 'cuts',
    look: 'masculine',
    front: (k) => [shadow(k, SIDES), shadow(k, CAP), p('M41 36c0-11 2-19 7-19s7 8 7 19c-2-2-4-3-7-3s-5 1-7 3z', { fill: k.hair })],
  },
  { name: 'low afro', family: 'afros', behind: (k) => [ellipse({ cx: 48, cy: 35, rx: 22.5, ry: 15, fill: k.hair })], front: (k) => [cap(k)] },
  {
    name: 'tapered afro', family: 'afros',
    behind: (k) => [ellipse({ cx: 48, cy: 28, rx: 19, ry: 16, fill: k.hair })],
    front: (k) => [shadow(k, SIDES), cap(k)],
  },
  {
    name: 'waves', family: 'cuts',
    look: 'masculine',
    front: (k) => [
      shadow(k, SIDES),
      cap(k),
      sheen('M33 39c4-5 9-7 15-7s11 2 15 7M36.5 33.5c3-3 7-4.5 11.5-4.5s8.5 1.5 11.5 4.5M41 28.5c2-1 4.5-1.5 7-1.5s5 .5 7 1.5', 0.3),
    ],
  },
  { name: 'side part cut', family: 'cuts', look: 'masculine', front: (k) => [shadow(k, SIDES), cap(k), part(k, 'M39 26.5l-3 10')] },
  {
    // Many thin braids falling close to the head in a full curtain, past the shoulders, with square partings.
    name: 'box braids', family: 'braids',
    look: 'feminine',
    behind: (k) => [p('M21 45a27 23 0 0 1 54 0v47h-54z', { fill: k.hair })],
    front: (k) => [cap(k), part(k, BOX_PARTS), ...braidFall(k, 54, [0, 4, -3]), ...cuffs([[21.3, 63], [28.5, 74], [67.5, 68], [74.7, 78]])],
  },
  {
    // The same braids cut blunt at the jaw, each finished with a bead.
    name: 'bob braids', family: 'braids',
    look: 'feminine',
    behind: (k) => [p('M21 45a27 23 0 0 1 54 0v20a4 4 0 0 1-4 4h-46a4 4 0 0 1-4-4z', { fill: k.hair })],
    front: (k) => [cap(k), part(k, BOX_PARTS), ...braidFall(k, 27, [0, 2, 1]), ...BRAID_XS.map((x, i) => c(x + 1.7, 67 + [0, 2, 1][i % 3]! + 1.6, 1.9, GOLD))],
  },
  {
    // A centre braid, rows sweeping to the sides, and beaded braids by the ears.
    name: 'fulani braids', family: 'braids',
    look: 'feminine',
    front: (k) => [
      cap(k),
      part(k, 'M48 25.5v9.5M45 26.5c-6 2-10 6-13 12M51 26.5c6 2 10 6 13 12M46 30c-4 1-7 4-9 8M50 30c4 1 7 4 9 8'),
      rect({ x: 25.5, y: 42, width: 3.4, height: 30, rx: 1.7, fill: k.hair }),
      rect({ x: 67.1, y: 42, width: 3.4, height: 30, rx: 1.7, fill: k.hair }),
      c(27.2, 70, 2.3, GOLD),
      c(68.8, 70, 2.3, GOLD),
      c(27.2, 64, 1.8, GOLD),
      c(68.8, 64, 1.8, GOLD),
      c(48, 36.5, 1.8, GOLD),
    ],
  },
  {
    // Irun kiko: threaded hair standing out from the head.
    name: 'thread', family: 'braids',
    look: 'feminine',
    front: (k) => [
      cap(k),
      ...['M35 31L25 16', 'M41 27.5L36 9', 'M48 26V6', 'M55 27.5L60 9', 'M61 31L71 16'].map((d) => line(d, k.hair, 3.4)),
      part(k, 'M40 28l-3 8M48 26.5v8M56 28l3 8'),
    ],
  },
  {
    // Braids falling from the crown like an upturned basket, beaded at the ends.
    name: 'koroba', family: 'braids',
    look: 'feminine',
    front: (k) => [
      cap(k),
      part(k, 'M48 26L33 40M48 26L39.5 36M48 26v8.5M48 26L56.5 36M48 26L63 40'),
      ...[24.5, 29, 63.5, 68].flatMap((x) => [rect({ x, y: 40, width: 3.4, height: 15, rx: 1.7, fill: k.hair }), c(x + 1.7, 55, 2, GOLD)]),
    ],
  },
  {
    // Rows from both sides meeting in a ridge down the middle.
    name: 'patewo', family: 'braids',
    look: 'feminine',
    front: (k) => [
      cap(k),
      line('M48 24.5v10', HAIR_COLOURS[k.hairIndex === 0 ? 1 : 0], 3),
      part(k, 'M46.5 27l-9 5M46.5 31l-12 6M49.5 27l9 5M49.5 31l12 6'),
    ],
  },
  {
    name: 'loc bun', family: 'braids',
    behind: (k) => [c(48, 15, 10, k.hair)],
    front: (k) => [cap(k), part(k, 'M41 27l-2 9M48 25.5v9M55 27l2 9'), sheen('M42 13c2-3 5-4 8-3M43 18c3-3 7-4 11-2', 0.25)],
    scrunchie: BUN_TIE,
  },
  {
    name: 'durag', family: 'covered',
    headwear: true,
    behind: (k) => [p('M64 36c9 4 14 12 14 24l-7-4c0-8-3-13-8-17z', { fill: k.cloth })],
    front: (k) => [
      p('M28 46c-2-14 7-22 20-22s22 8 20 22c-5-7-12-10-20-10s-15 3-20 10z', { fill: k.cloth }),
      line('M48 24v12', k.dark ? INK : SEAM_DARK, 1),
      line('M29 43c6-5 12-7 19-7s13 2 19 7', k.dark ? INK : SEAM_DARK, 1),
    ],
  },
];
