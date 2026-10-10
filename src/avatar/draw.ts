// Player avatars: a character you design, drawn from parts. No uploads, nothing to moderate.
// Every look is free: nobody pays to look like themselves.
//
// HOW IT FITS TOGETHER
//   shapes.ts          the SVG shapes, the palette, and the `Kit` every part is drawn with
//   parts/hair.ts      hair and headwear, one entry per style
//   parts/outfits.ts   outfits, one entry per outfit
//   parts/face.ts      eyes, mouths, facial hair, skin marks, extras, mouth items, hair ties, mood presets
//   parts/disguises.ts what a culprit wears until their case is closed; a layer of its own, never saved
//   parts/festive.ts   seasonal and themed touches (Santa hat, hearts, Naija colours), drawn on top
//   draw.ts (here)     the choices an avatar is made of, its saved code, and the layer order
//   store.ts           fetching other players' codes in batches
//
// An avatar is one choice per part, saved as a short code like "b0s3h1c0e0m0f0x0k0t0a0o0" (a letter per
// part, then the position of the choice). To add a hairstyle, outfit or mark, append one entry to its list:
// the designer, the code and the starter avatars all pick it up. Positions are saved, so lists are append only.
// To add a whole new kind of part, add a line to PARTS with an unused letter and draw it in `drawAvatar`.
// Give a style `look: 'feminine'` or `'masculine'` if it is usually worn that way: Surprise me and starter
// avatars use it so they never change how someone presents. It limits nothing a player picks by hand.

import { EXTRA_STYLES, EYE_STYLES, FACE_HAIR_STYLES, HAIR_TIE_NAMES, headband, MARK_STYLES, MOUTH_ITEM_STYLES, MOUTH_STYLES, scrunchie } from './parts/face';
import { DISGUISE_STYLES } from './parts/disguises';
import { FESTIVE_STYLES } from './parts/festive';
import { HAIR_STYLES } from './parts/hair';
import { OUTFIT_STYLES, torso } from './parts/outfits';
import { BACK_NAMES, BACKS, c, HAIR_COLOUR_NAMES, HAIR_COLOURS, INK, LIME, rect, SEAM_DARK, SEAM_LIGHT, SKINS, WHITE, type Kit, type Look, type Shape } from './shapes';

export type { Shape } from './shapes';

type Styled = ReadonlyArray<{ name: string; look?: Look }>;
const names = (list: Styled) => list.map((x) => x.name);
/** Which look each choice usually goes with, in the same order as its names. Empty for parts anyone wears. */
const looks = (list: Styled) => list.map((x) => x.look);
const anyone: ReadonlyArray<Look | undefined> = [];

/**
 * Every part of an avatar: its key, the letter it is saved under, a title for the designer, the names of
 * its choices in saved order, and the look each choice usually goes with (see `surprise`).
 */
export const PARTS = [
  { key: 'back', letter: 'b', title: 'Background', names: BACK_NAMES as readonly string[], looks: anyone },
  { key: 'skin', letter: 's', title: 'Skin', names: SKINS.map((_, i) => `tone ${i + 1}`), looks: anyone },
  { key: 'hair', letter: 'h', title: 'Hair and headwear', names: names(HAIR_STYLES), looks: looks(HAIR_STYLES) },
  { key: 'colour', letter: 'c', title: 'Hair colour', names: HAIR_COLOUR_NAMES as readonly string[], looks: anyone },
  { key: 'eyes', letter: 'e', title: 'Eyes', names: names(EYE_STYLES), looks: looks(EYE_STYLES) },
  { key: 'mouth', letter: 'm', title: 'Mouth', names: names(MOUTH_STYLES), looks: looks(MOUTH_STYLES) },
  { key: 'face', letter: 'f', title: 'Facial hair', names: names(FACE_HAIR_STYLES), looks: looks(FACE_HAIR_STYLES) },
  { key: 'extra', letter: 'x', title: 'Glasses and earrings', names: names(EXTRA_STYLES), looks: looks(EXTRA_STYLES) },
  { key: 'mark', letter: 'k', title: 'Skin marks', names: names(MARK_STYLES), looks: looks(MARK_STYLES) },
  { key: 'item', letter: 't', title: 'In the mouth', names: names(MOUTH_ITEM_STYLES), looks: looks(MOUTH_ITEM_STYLES) },
  { key: 'tie', letter: 'a', title: 'Hair ties', names: HAIR_TIE_NAMES as readonly string[], looks: anyone },
  { key: 'outfit', letter: 'o', title: 'Outfit', names: names(OUTFIT_STYLES), looks: looks(OUTFIT_STYLES) },
  { key: 'festive', letter: 'z', title: 'Festive', names: names(FESTIVE_STYLES), looks: anyone },
] as const satisfies ReadonlyArray<{ key: string; letter: string; title: string; names: readonly string[]; looks: ReadonlyArray<Look | undefined> }>;

export type PartKey = (typeof PARTS)[number]['key'];
/** The position chosen for each part. */
export type Avatar = Record<PartKey, number>;

export const DEFAULT_AVATAR: Avatar = { back: 0, skin: 3, hair: 0, colour: 0, eyes: 0, mouth: 0, face: 0, extra: 0, mark: 0, item: 0, tie: 0, outfit: 0, festive: 0 };

/** Parse a saved code. Anything missing or out of range falls back to the default choice. */
export function parseAvatar(code: string | null | undefined): Avatar {
  const out: Avatar = { ...DEFAULT_AVATAR };
  if (typeof code !== 'string' || code.length > 64) return out;
  for (const part of PARTS) {
    const m = code.match(new RegExp(`${part.letter}(\\d{1,2})(?!\\d)`));
    const n = m ? Number(m[1]) : NaN;
    if (Number.isInteger(n) && n >= 0 && n < part.names.length) out[part.key] = n;
  }
  return out;
}

export function avatarCode(a: Avatar): string {
  return PARTS.map((part) => `${part.letter}${a[part.key]}`).join('');
}

/**
 * How an avatar presents, read from the hair and facial hair its owner chose: feminine if those are usually
 * feminine, masculine if usually masculine, and null when they are neutral or mixed (braids and a beard).
 * Outfits are costume and do not count: a woman in an agbada for a laugh still presents as she did.
 * This is worked out on the spot from the design itself. The one thing a player may tell us is the answer to
 * "Who are we dressing?" (`Prefer` below), which only orders choices and steers Surprise me.
 */
const IDENTITY: readonly PartKey[] = ['hair', 'face'];
export function lookOf(a: Avatar): Look | null {
  const worn = new Set(PARTS.filter((part) => IDENTITY.includes(part.key)).map((part) => part.looks[a[part.key]]).filter(Boolean));
  if (worn.size !== 1) return null;
  return worn.has('feminine') ? 'feminine' : 'masculine';
}

/** The choices of a part that suit a look: those for anyone, plus those usually worn with that look. */
function suiting(key: PartKey, look: Look | null): number[] {
  const part = PARTS.find((x) => x.key === key)!;
  return part.names.flatMap((_, i) => (part.looks[i] === undefined || part.looks[i] === look ? [i] : []));
}

/**
 * The player's own answer to "Who are we dressing?", kept with the avatar as its look. `mixed` ("I'd rather not
 * say"), null and anything unknown all mean the same here: no steer, which is what everyone had before the question.
 */
export type Prefer = Look | 'mixed' | null | undefined;
const lookFrom = (prefer: unknown): Look | null => (prefer === 'feminine' || prefer === 'masculine' ? prefer : null);

/**
 * The choices of a part in the order the editor shows them: those that suit the answer first, the rest after,
 * each group in its saved order. Nothing is left out, so nothing is locked. No answer: the saved order.
 */
export function orderFor(key: PartKey, prefer?: Prefer): number[] {
  const part = PARTS.find((x) => x.key === key)!;
  const all = part.names.map((_, i) => i);
  const look = lookFrom(prefer);
  if (!look) return all;
  const suits = new Set(suiting(key, look));
  return [...all.filter((i) => suits.has(i)), ...all.filter((i) => !suits.has(i))];
}

/** Picks from a list with a 0 to 1 random source. */
const pick = (from: readonly number[], random: () => number) => from[Math.min(from.length - 1, Math.floor(random() * from.length))]!;

/** What Surprise me may change. Skin, hair colour, facial hair, skin marks and what is in the mouth are who you are. */
const PLAYFUL: readonly PartKey[] = ['hair', 'eyes', 'mouth', 'extra', 'tie', 'outfit', 'back'];

/**
 * A fresh take on the same person. It keeps skin, hair colour, facial hair and marks exactly, and only draws
 * styles that suit how the avatar already presents, so a surprise never changes someone's gender or complexion.
 * A neutral or mixed avatar only gets styles that are for anyone.
 * With an answer to the outfit question (`prefer`), that answer steers the draw instead of the design.
 */
export function surprise(a: Avatar, random: () => number = Math.random, prefer?: Prefer): Avatar {
  const look = lookFrom(prefer) ?? lookOf(a);
  const next = { ...a };
  for (const key of PLAYFUL) next[key] = pick(suiting(key, look), random);
  return next;
}

/** A stable starter avatar from a handle, so nobody is a blank circle before they design theirs. */
export function avatarFor(seed: string): Avatar {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const take = (n: number) => {
    const v = h % n;
    h = Math.floor(h / n) + 7919;
    return v;
  };
  // Neutral on purpose: hair that is for anyone and not headwear, no facial hair, a plain tee.
  // A hash of a handle must never decide how someone presents.
  const hairs = suiting('hair', null).filter((i) => !HAIR_STYLES[i]!.headwear);
  return {
    ...DEFAULT_AVATAR,
    hair: hairs[take(hairs.length)]!,
    back: take(BACKS.length),
    skin: take(SKINS.length),
    colour: take(HAIR_COLOURS.length),
    eyes: take(EYE_STYLES.length),
    mouth: take(MOUTH_STYLES.length),
    extra: take(2),
  };
}

/** The window onto the drawing. Wider than the 96 box the face is laid out in, so the chest shows. */
export const VIEW_BOX = '-7 -2 110 110';

function kitFor(a: Avatar): Kit {
  const dark = a.back === 1;
  return {
    back: BACKS[a.back]!,
    skin: SKINS[a.skin]!,
    hair: HAIR_COLOURS[a.colour]!,
    hairIndex: a.colour,
    dark,
    cloth: dark ? LIME : INK,
    accent: a.back === 0 ? WHITE : LIME,
    body: dark ? WHITE : INK,
    trim: dark ? INK : WHITE,
    seam: dark ? SEAM_LIGHT : SEAM_DARK,
  };
}

/** The shapes of an avatar, back to front. */
export function drawAvatar(a: Avatar): Shape[] {
  const k = kitFor(a);
  const hair = HAIR_STYLES[a.hair]!;
  const outfit = OUTFIT_STYLES[a.outfit]!;
  const extra = EXTRA_STYLES[a.extra]!;
  const tie = HAIR_TIE_NAMES[a.tie];
  const veiled = !!hair.veil;

  const layers: Shape[][] = [
    [rect({ x: -20, y: -20, width: 136, height: 140, fill: k.back })],
    hair.behind?.(k) ?? [],
    // A veil covers the neck, ears and shoulders, so there is no outfit to show.
    veiled ? [] : (outfit.behind?.(k) ?? []),
    veiled ? [] : [rect({ x: 41, y: 60, width: 14, height: 24, rx: 6, fill: k.skin }), c(28, 49, 5, k.skin), c(68, 49, 5, k.skin)],
    veiled ? [torso(k.cloth, 46)] : outfit.draw(k),
    [rect({ x: 29, y: 25, width: 38, height: 45, rx: 19, fill: k.skin })],
    hair.front?.(k) ?? [],
    MARK_STYLES[a.mark]!.draw(k),
    extra.hidesEyes ? [] : EYE_STYLES[a.eyes]!.draw(k),
    veiled ? [] : FACE_HAIR_STYLES[a.face]!.draw(k),
    MOUTH_STYLES[a.mouth]!.draw(k),
    extra.onEars && veiled ? [] : extra.draw(k),
    MOUTH_ITEM_STYLES[a.item]!.draw(k),
    tie === 'scrunchie' ? (hair.scrunchie ?? []).map((at) => scrunchie(k, at)) : [],
    tie === 'headband' && !hair.headwear && !hair.noHeadband ? [headband(k)] : [],
    // Festive touches go on last, so a hat sits over whatever hair is underneath.
    FESTIVE_STYLES[a.festive]!.draw(k),
  ];
  return layers.flat();
}

/** A disguise for this avatar, as a layer of its own to draw on top of it. Nothing for a position that is not in the list. */
export function drawDisguise(a: Avatar, disguise: number): Shape[] {
  return DISGUISE_STYLES[disguise]?.draw(kitFor(a)) ?? [];
}

/** SVG attribute names to React prop names (stroke-width to strokeWidth). */
export function shapeProps(attrs: Record<string, string | number>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(attrs)) out[k.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())] = v;
  return out;
}

/** The same drawing as SVG text (link previews, exports). Values are numbers and fixed palette strings only. */
export function avatarSvg(a: Avatar, size = 96): string {
  const body = drawAvatar(a)
    .map((sh) => `<${sh.tag} ${Object.entries(sh.attrs).map(([key, v]) => `${key}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${VIEW_BOX}"><clipPath id="r"><circle cx="48" cy="53" r="55"/></clipPath><g clip-path="url(#r)">${body}</g></svg>`;
}
