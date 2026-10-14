// The few SVG shapes an avatar is made of, and the palette they are painted with.
// Colours here are avatar art (data, like the puzzle texts), not UI tokens.

export type Shape = { tag: 'circle' | 'rect' | 'path' | 'ellipse'; attrs: Record<string, string | number> };
type Attrs = Record<string, string | number>;

export const c = (cx: number, cy: number, r: number, fill: string, extra: Attrs = {}): Shape => ({ tag: 'circle', attrs: { cx, cy, r, fill, ...extra } });
export const p = (d: string, attrs: Attrs): Shape => ({ tag: 'path', attrs: { d, ...attrs } });
export const rect = (attrs: Attrs): Shape => ({ tag: 'rect', attrs });
export const ellipse = (attrs: Attrs): Shape => ({ tag: 'ellipse', attrs });
/** A round-ended stroke. */
export const line = (d: string, stroke: string, w = 2.4): Shape =>
  p(d, { fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

/** Background colours: lime, ink, cream, sky, coral, lilac. */
export const BACKS = ['#d4f04c', '#1c1c20', '#f1ece2', '#bcd9f5', '#f5b8a6', '#cfc4f5'] as const;
export const BACK_NAMES = ['lime', 'ink', 'cream', 'sky', 'coral', 'lilac'] as const;
export const SKINS = ['#f6d3b3', '#e3ac7e', '#c68655', '#a5683c', '#7b4a2a', '#56331f'] as const;
export const HAIR_COLOURS = ['#1b1716', '#4a2f20', '#7a4e2d', '#e2bd6b', '#c2622d', '#b9b9bf'] as const;
export const HAIR_COLOUR_NAMES = ['black', 'dark brown', 'brown', 'blonde', 'ginger', 'grey'] as const;

export const INK = '#141416';
export const WHITE = '#ffffff';
export const LIME = BACKS[0];
export const CREAM = BACKS[2];
export const GOLD = '#e0a526';
export const EMBROIDERY = '#c8962a';
export const STAR = '#f2b84b';
export const CORAL = '#e0553f';
export const ROSE = '#e8566b';
export const RED = '#c2453c';
export const NAVY = '#1f4e79';
export const VIOLET = '#3b2a6b';
export const SEAM_LIGHT = '#d4d4d8';
export const SEAM_DARK = '#3f3f46';
/** Gele fabric: a rich cloth colour so it never reads as hair. */
export const GELE = { cloth: '#b0336f', light: '#cf5a93', fold: '#7a1d4b' } as const;

/**
 * Who usually wears a style. Used only to keep Surprise me and starter avatars from changing how someone
 * presents; it is never saved, shown or used to stop anyone choosing anything.
 */
export type Look = 'feminine' | 'masculine';

/** Everything a part needs to know about the avatar it is drawn on. */
export type Kit = {
  /** Background colour. */
  back: string;
  skin: string;
  /** The chosen hair colour. */
  hair: string;
  /** Index of the hair colour, for parts that need a contrasting shade. */
  hairIndex: number;
  /** True on the ink background, where dark cloth would vanish. */
  dark: boolean;
  /** Headwear cloth: lime on ink, ink elsewhere. */
  cloth: string;
  /** Small accents (beads, bands, caps): white on lime, lime elsewhere. */
  accent: string;
  /** Plain clothing: white on ink, ink elsewhere. */
  body: string;
  /** Detail on plain clothing: the opposite of `body`. */
  trim: string;
  /** A seam that shows on `body`. */
  seam: string;
};
