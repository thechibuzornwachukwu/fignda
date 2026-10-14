// Festive and themed touches: hats, stickers and face paint for a season or a mood. One entry per choice.
//
// TO ADD ONE: append an entry to the END of FESTIVE_STYLES (saved avatars store the position; never reorder
// or remove). They are drawn last, on top of everything, so a hat sits over whatever hair is underneath.
// The head is a 38 by 45 rounded box from (29, 25); the window shows roughly x -7 to 103, y -2 to 108.

import { c, ellipse, GOLD, INK, line, p, rect, RED, ROSE, STAR, WHITE, type Kit, type Shape } from '../shapes';
import type { Part } from './face';

const GREEN = '#0a8f4f';
const PUMPKIN = '#e8822a';
const NIGHT = '#2a1f3d';
const ANTLER = '#7a4e2d';
const CLOWN_BLUE = '#3f7fd6';

/** A small heart with its top left at (x, y). `s` scales it; 1 is 10 wide. */
export const heart = (x: number, y: number, s: number, fill: string): Shape =>
  p('M0 3c0-4 5-4 5 0c0-4 5-4 5 0c0 4-5 7-5 7s-5-3-5-7z', { fill, transform: `translate(${x} ${y}) scale(${s})` });
/** A five point star with its top left at (x, y). `s` scales it; 1 is 10 wide. */
export const star = (x: number, y: number, s: number, fill: string): Shape =>
  p('M5 0l1.5 3.3 3.5.4-2.6 2.4.7 3.5L5 7.9 1.9 9.6l.7-3.5L0 3.7l3.5-.4z', { fill, transform: `translate(${x} ${y}) scale(${s})` });
const dots = (at: ReadonlyArray<readonly [number, number, number]>, fill: string): Shape[] => at.map(([x, y, r]) => c(x, y, r, fill));

export const FESTIVE_STYLES: readonly Part[] = [
  { name: 'none', draw: () => [] },
  {
    name: 'santa hat',
    draw: () => [
      p('M28 31c1-13 9-22 21-22 11 0 18 8 19 20-12-4-27-4-40 2z', { fill: RED }),
      p('M60 11c9 1 14 7 14 16l-5 1c0-6-3-10-9-11z', { fill: RED }),
      rect({ x: 26, y: 27, width: 44, height: 8, rx: 4, fill: WHITE }),
      c(72.5, 28.5, 4.5, WHITE),
    ],
  },
  {
    // Reindeer: antlers and a red nose.
    name: 'antlers',
    draw: () => [
      line('M38 25c-2-6-6-10-11-12M33 18c-1-3-1-6 1-9M30 15c-3 0-5-1-7-3', ANTLER, 3),
      line('M58 25c2-6 6-10 11-12M63 18c1-3 1-6-1-9M66 15c3 0 5-1 7-3', ANTLER, 3),
      c(48, 53, 3.4, RED),
    ],
  },
  {
    name: 'witch hat',
    draw: () => [
      p('M33 28L50 0l5 6-3 4 11 18z', { fill: NIGHT }),
      ellipse({ cx: 48, cy: 29, rx: 27, ry: 5.5, fill: NIGHT }),
      line('M36 24.5q12 3.5 24 0', STAR, 2.6),
    ],
  },
  {
    name: 'pumpkin',
    draw: () => [
      ellipse({ cx: 85, cy: 92, rx: 11, ry: 9.5, fill: PUMPKIN }),
      line('M85 83v18M80 84c-3 5-3 11 0 16M90 84c3 5 3 11 0 16', '#b85f14', 1.1),
      rect({ x: 83.5, y: 79, width: 3, height: 5, rx: 1, fill: GREEN }),
      // The carved face.
      p('M80 90l2.5-3 2.5 3zM85.5 90l2.5-3 2.5 3zM80.5 95h9.5l-2 3h-5.5z', { fill: INK }),
    ],
  },
  {
    name: 'ghost',
    draw: () => [
      p('M4 30v-11a9 9 0 0 1 18 0v11l-3-2.5-3 2.5-3-2.5-3 2.5-3-2.5z', { fill: WHITE }),
      c(10, 19, 1.4, INK),
      c(16, 19, 1.4, INK),
      ellipse({ cx: 13, cy: 23.5, rx: 1.5, ry: 2, fill: INK }),
    ],
  },
  { name: 'hearts', draw: () => [heart(4, 12, 1.2, ROSE), heart(80, 4, 1, ROSE), heart(88, 26, 0.7, RED), heart(10, 34, 0.6, RED)] },
  {
    name: 'party hat',
    draw: () => [
      p('M34 27L50 0l14 28c-9-4-20-5-30-1z', { fill: STAR }),
      line('M42 14l12 4M38 21l20 5', ROSE, 2),
      c(50, 0.5, 3.6, ROSE),
      ...dots([[8, 18, 1.6], [18, 6, 1.3], [84, 12, 1.6], [92, 32, 1.3]], ROSE),
      ...dots([[12, 44, 1.3], [78, 26, 1.3], [88, 52, 1.5]], STAR),
    ],
  },
  {
    // Green, white, green: a headband and a flag on each cheek.
    name: 'naija',
    draw: () => [
      rect({ x: 29, y: 31, width: 13, height: 5, fill: GREEN }),
      rect({ x: 42, y: 31, width: 12, height: 5, fill: WHITE }),
      rect({ x: 54, y: 31, width: 13, height: 5, fill: GREEN }),
      ...[33, 58].flatMap((x) => [
        rect({ x, y: 53, width: 1.8, height: 4, fill: GREEN }),
        rect({ x: x + 1.8, y: 53, width: 1.8, height: 4, fill: WHITE }),
        rect({ x: x + 3.6, y: 53, width: 1.8, height: 4, fill: GREEN }),
      ]),
    ],
  },
  { name: 'snow', draw: () => dots([[8, 20, 1.7], [20, 8, 1.3], [84, 14, 1.7], [93, 40, 1.3], [5, 50, 1.3], [89, 66, 1.5], [13, 76, 1.3], [74, 4, 1.2], [30, 2, 1.1]], WHITE) },
  {
    name: 'crown',
    draw: () => [p('M34 27l-3-16 9 8 8-13 8 13 9-8-3 16z', { fill: GOLD }), c(48, 21, 1.8, RED), c(40, 23, 1.3, WHITE), c(56, 23, 1.3, WHITE)],
  },
  {
    name: 'bunny ears',
    draw: (k: Kit) => [
      ellipse({ cx: 39, cy: 12, rx: 5, ry: 14, fill: WHITE, transform: 'rotate(-10 39 24)' }),
      ellipse({ cx: 57, cy: 12, rx: 5, ry: 14, fill: WHITE, transform: 'rotate(10 57 24)' }),
      ellipse({ cx: 39, cy: 13, rx: 2.2, ry: 9, fill: ROSE, transform: 'rotate(-10 39 24)' }),
      ellipse({ cx: 57, cy: 13, rx: 2.2, ry: 9, fill: ROSE, transform: 'rotate(10 57 24)' }),
      // The headband the ears sit on.
      line('M32 30c5-4 10-5 16-5s11 1 16 5', k.dark ? WHITE : INK, 2),
    ],
  },
  {
    // A rainbow wig in tufts, a red nose, painted cheeks, a mark over each eye and a big bow tie.
    name: 'clown',
    draw: () => [
      ...dots([[24, 30, 8], [19, 43, 7.5], [72, 30, 8], [77, 43, 7.5]], RED),
      ...dots([[31, 21, 7.5], [65, 21, 7.5], [22, 55, 6], [74, 55, 6]], STAR),
      ...dots([[41, 16, 7], [55, 16, 7]], CLOWN_BLUE),
      c(48, 14, 6.5, GREEN),
      c(36, 55.5, 3.6, ROSE, { opacity: 0.75 }),
      c(60, 55.5, 3.6, ROSE, { opacity: 0.75 }),
      line('M40 41.5v-3M56 41.5v-3', CLOWN_BLUE, 1.8),
      c(48, 53, 4.4, RED),
      c(46.6, 51.6, 1.2, WHITE, { opacity: 0.7 }),
      p('M48 83l-13-6.5v13zM48 83l13-6.5v13z', { fill: STAR }),
      c(48, 83, 3.2, RED),
      ...dots([[39, 81, 1], [39.5, 85, 1], [57, 81, 1], [56.5, 85, 1]], RED),
    ],
  },
];
