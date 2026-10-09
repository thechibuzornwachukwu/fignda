// The cat: the Gazecraft mark (SPEC section 1). Never redraw: the logo, the favicon and the app icons read this.
// Dark fur, lime eyes, one lid lowered. Its colours are brand art, as avatar colours are, not UI tokens,
// so they live here and not in a component.

export type LogoShape = { tag: 'path' | 'ellipse' | 'circle'; attrs: Record<string, string | number> };

const FUR = '#454552';
const FUR_DARK = '#2e2e38';
const LIME = '#d4f04c';
const INK = '#141416';
const CREAM = '#f1ece2';
const PINK = '#f5a3a8';
const WHITE = '#ffffff';
const fill = (d: string, colour: string): LogoShape => ({ tag: 'path', attrs: { d, fill: colour } });
const line = (d: string, colour: string, w: number): LogoShape => ({ tag: 'path', attrs: { d, fill: 'none', stroke: colour, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } });
const oval = (cx: number, cy: number, rx: number, ry: number, colour: string): LogoShape => ({ tag: 'ellipse', attrs: { cx, cy, rx, ry, fill: colour } });

/** The colour that fills the app icon behind the eyes. */
export const CAT_FUR = FUR;

/** The cat's head, back to front, in the 240 wide space the characters are drawn in (`design/characters`). */
export const CAT: readonly LogoShape[] = [
  fill('M50 104L40 20 104 70z', FUR),
  fill('M57 88L52 42 86 70z', PINK),
  fill('M190 104L200 20 136 70z', FUR),
  fill('M183 88L188 42 154 70z', PINK),
  fill('M38 122c0-36 34-60 82-60s82 24 82 60c0 10-3 19-9 27l15 10-24 5c-15 14-38 22-64 22s-49-8-64-22l-24-5 15-10c-6-8-9-17-9-27z', FUR),
  oval(106, 155, 17, 13, CREAM),
  oval(134, 155, 17, 13, CREAM),
  oval(120, 167, 12, 8, CREAM),
  fill('M56 120c6-32 46-32 58 0-10 25-48 25-58 0z', LIME),
  oval(85, 117, 6.5, 16, INK),
  { tag: 'circle', attrs: { cx: 78, cy: 108, r: 4.6, fill: WHITE } },
  fill('M126 120c6-32 46-32 58 0-10 25-48 25-58 0z', LIME),
  oval(155, 117, 6.5, 16, INK),
  { tag: 'circle', attrs: { cx: 148, cy: 108, r: 4.6, fill: WHITE } },
  // The lowered lid: it has already worked it out.
  fill('M122 92l66 4v18q-30-16-64-8z', FUR),
  line('M54 119c8-34 48-34 62 0', FUR_DARK, 5),
  line('M124 107q32-10 62 6', FUR_DARK, 5.5),
  fill('M113 142q7-3 14 0l-7 8z', PINK),
  line('M120 150v6m-13 2q7 6 13-2 8 9 19-3', INK, 3),
  line('M88 152l-40-10M88 160l-42 2M152 152l40-10M152 160l42 2', CREAM, 2.4),
];

/** Boxes: x, y, width, height. The whole head, and the eyes up close for the app icon. */
export const CAT_BOX = [16, 14, 208, 182] as const;
export const CAT_EYES_BOX = [50, 50, 140, 140] as const;

/**
 * The wordmark: the cat, a gap, then the letters. Its height is 816 units and the capitals are 720 of them (88%),
 * so sizes mean what they always did. `CAT_IN_WORDMARK` places the cat's head in the letters' units.
 */
export const WORDMARK_BOX = [-1065, -768, 7159, 816] as const;
export const CAT_IN_WORDMARK = 'translate(-1065 -768) scale(4.4835) translate(-16 -14)';
