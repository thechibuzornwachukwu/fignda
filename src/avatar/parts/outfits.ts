// Outfits. One entry per outfit.
//
// TO ADD AN OUTFIT: append an entry to the END of OUTFIT_STYLES (saved avatars store the position; never
// reorder or remove). `draw(k)` paints over the neck, so start with `torso(...)` and usually a `scoop(...)`
// neckline. `behind(k)` is for anything that sits behind the neck (a hood, a cape).
// The neck is 14 wide, centred on x 48, and meets the shoulders at about y 78.

import { BACKS, c, CORAL, CREAM, ellipse, EMBROIDERY, INK, LIME, line, NAVY, p, rect, ROSE, STAR, VIOLET, WHITE, type Kit, type Look, type Shape } from '../shapes';

export type Outfit = { name: string; look?: Look; behind?: (k: Kit) => Shape[]; draw: (k: Kit) => Shape[] };

/** The shoulders and chest. `rx` widens it for robes. */
export const torso = (fill: string, rx = 31): Shape => ellipse({ cx: 48, cy: 101, rx, ry: 22, fill });
/**
 * A neckline: skin shows in a shallow scoop and the cloth closes around it. Exactly as wide as the neck
 * (x 41 to 55), so nothing bulges past its sides.
 */
const scoop = (k: Kit, depth: number): Shape => p(`M41 79.5q7 ${depth} 14 0v-3h-14z`, { fill: k.skin });

const TRENCH = '#b08d57';
const TRENCH_DARK = '#8c6d3f';

export const OUTFIT_STYLES: readonly Outfit[] = [
  { name: 'tee', draw: (k) => [torso(k.body), scoop(k, 5)] },
  {
    // A very wide robe, sleeves folded up onto the shoulders in pleats, a deep V over an inner tunic, and
    // gold embroidery: down the V and in the square panel on the chest.
    name: 'agbada',
    look: 'masculine',
    draw: (k) => {
      const robe = k.back === CREAM ? WHITE : CREAM;
      const pleats = ['M36 81c-9 3-17 9-23 19', 'M31.5 84c-8 4-14 10-18 19', 'M27.5 88c-6 4-10 9-13 16', 'M60 81c9 3 17 9 23 19', 'M64.5 84c8 4 14 10 18 19', 'M68.5 88c6 4 10 9 13 16'];
      return [
        torso(robe, 50),
        p('M39.5 78.5l8.5 21 8.5-21z', { fill: robe === WHITE ? CREAM : WHITE }),
        scoop(k, 3),
        ...pleats.map((d) => line(d, '#b9b2a3', 1.2)),
        line('M39.5 78.5l8.5 21 8.5-21', EMBROIDERY, 1.5),
        line('M42.5 79.5l5.5 13.5 5.5-13.5', EMBROIDERY, 0.9),
        rect({ x: 53.5, y: 91, width: 12, height: 12, rx: 1.5, fill: 'none', stroke: EMBROIDERY, 'stroke-width': 1.3 }),
        line('M56.5 94h6v6h-6zM59.5 94v6M56.5 97h6', EMBROIDERY, 0.9),
        line('M33 92c3 4 7 6 11 7', EMBROIDERY, 0.9),
      ];
    },
  },
  {
    name: 'kaftan',
    look: 'masculine',
    draw: (k) => [torso(k.body), scoop(k, 3), line('M40.5 80q7.5 4 15 0', k.trim, 1.6), line('M48 82.5v13', k.trim, 1.3), c(48, 86, 0.9, k.trim), c(48, 90, 0.9, k.trim)],
  },
  {
    name: 'dashiki',
    draw: (k) => [torso(k.body), p('M39.5 79l8.5 14 8.5-14z', { fill: LIME }), p('M43 79l5 8 5-8z', { fill: k.skin }), line('M41.5 80.5l6.5 10.5 6.5-10.5', INK, 0.9)],
  },
  {
    name: 'ankara',
    draw: (k) => [
      torso(NAVY),
      scoop(k, 5),
      ...([[33, 86, STAR], [41, 91, ROSE], [48, 87.5, STAR], [55, 91, ROSE], [63, 86, STAR], [27, 93, ROSE], [69, 93, ROSE]] as const).flatMap(([x, y, f]) => [c(x, y, 2.6, f), c(x, y, 1, NAVY)]),
    ],
  },
  {
    name: 'buba and beads',
    look: 'feminine',
    draw: (k) => [
      torso(k.body),
      scoop(k, 6),
      ...([[40.5, 82.5], [43.5, 84.6], [46.8, 85.6], [50.2, 85.4], [53.4, 84.2], [56, 82]] as const).map(([x, y]) => c(x, y, 1.7, CORAL)),
    ],
  },
  {
    name: 'suit',
    draw: (k) => [torso(k.body), p('M40.5 79l7.5 13 7.5-13z', { fill: k.trim }), p('M46.6 82h2.8l1.4 11h-5.6z', { fill: LIME }), line('M40.5 79l5 12M55.5 79l-5 12', k.seam, 1.2)],
  },
  {
    name: 'hoodie',
    behind: (k) => [p('M27 84c-2-16 7-24 21-24s23 8 21 24z', { fill: k.body })],
    draw: (k) => [torso(k.body), scoop(k, 4), line('M44.5 83v8M51.5 83v8', k.trim, 1.2), c(44.5, 91.5, 0.9, k.trim), c(51.5, 91.5, 0.9, k.trim)],
  },
  {
    name: 'jersey',
    draw: (k) => [torso(k.back === BACKS[0] ? WHITE : LIME), rect({ x: 44, y: 79, width: 8, height: 18, fill: INK }), scoop(k, 4), line('M40.5 80q7.5 5.5 15 0', INK, 1.6)],
  },
  {
    // A rolled collar that hugs the neck and widens into the shoulders, with one soft fold.
    name: 'turtleneck',
    draw: (k) => [torso(k.body), p('M34 84c4-3 6-7 6.5-12.5q7.5 3 15 0c.5 5.5 2.5 9.5 6.5 12.5z', { fill: k.body }), line('M41 75.5q7 2.6 14 0', k.seam, 1.1)],
  },
  {
    name: 'hero cape',
    behind: () => [ellipse({ cx: 48, cy: 103, rx: 43, ry: 27, fill: '#c2453c' })],
    draw: (k) => [torso(NAVY), scoop(k, 4), p('M48 83.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z', { fill: STAR })],
  },
  {
    name: 'wizard robe',
    draw: (k) => [
      torso(VIOLET),
      p('M40.5 79l7.5 9 7.5-9z', { fill: k.skin }),
      line('M40.5 79l7.5 9 7.5-9', STAR, 1.2),
      ...([[33, 88], [62, 86], [57, 93], [39, 94]] as const).map(([x, y]) => c(x, y, 1, STAR)),
    ],
  },
  {
    name: 'space suit',
    draw: (k) => [
      torso('#f4f4f5'),
      ellipse({ cx: 48, cy: 79.5, rx: 10.5, ry: 3.6, fill: '#9ca3af' }),
      ellipse({ cx: 48, cy: 78.8, rx: 7.5, ry: 2.4, fill: k.skin }),
      rect({ x: 55, y: 87, width: 7, height: 4.5, rx: 1, fill: CORAL }),
    ],
  },
  {
    // A shirt with a tall collar standing up around the neck, open at the front.
    name: 'high collar shirt',
    draw: (k) => [
      torso(k.trim),
      scoop(k, 5),
      p('M41 70.5l-3.5 11.5 10.5 6.5-3-9.5z', { fill: k.trim, stroke: k.seam, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }),
      p('M55 70.5l3.5 11.5-10.5 6.5 3-9.5z', { fill: k.trim, stroke: k.seam, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }),
      line('M48 88.5v12', k.seam, 0.9),
      c(48, 92.5, 0.8, k.seam),
      c(48, 97, 0.8, k.seam),
    ],
  },
  {
    // Earned, not chosen (see ../earned.ts): a belted trench coat, collar up, over a dark shirt.
    name: 'detective coat',
    draw: (k) => [
      torso(TRENCH, 33),
      p('M41 79.5l7 12 7-12z', { fill: INK }),
      scoop(k, 3),
      p('M41 76l-6 9 11 9.5-3.5-10z', { fill: TRENCH, stroke: TRENCH_DARK, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }),
      p('M55 76l6 9-11 9.5 3.5-10z', { fill: TRENCH, stroke: TRENCH_DARK, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }),
      line('M48 94.5v12', TRENCH_DARK, 1),
      c(44.5, 98.5, 1, TRENCH_DARK),
      c(51.5, 98.5, 1, TRENCH_DARK),
    ],
  },
];
