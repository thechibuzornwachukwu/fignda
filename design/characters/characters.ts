// The partners: characters built from parts, the way player avatars are.
//
// One call draws any combination:
//   character({ who: 'cat', mood: 'found', hat: true, coat: true, glass: true, view: 'bust', dark: true })
//
// who      cat (the main one), dino, dog, robot
// mood     calm, happy, thinking, found, stumped, sleepy: the eyes, brows and mouth
// dress    hat, coat, glass, monocle: any mix. Each character has its own: on the robot `glass` is a
//          scanner and `monocle` is a zoom on its screen (see `tools` in CAST).
// wave     one arm up, hand open. With no mood given, a waving character is happy.
// view     full (the whole figure), bust (head and shoulders), eyes (the app icon, eyes up close)
// flip     mirrored, so a character can face the other way across a screen
// dark     for a dark ground: ink lines are drawn in cream
// back     a background colour. Left out, the drawing is transparent.
//
// TO ADD A MOOD: add its name to MOODS and a case to each character's face.
// TO ADD A CHARACTER: write its body and face, and add it to CAST.
// A true side or three-quarter angle is new drawing for every character. `view` and `flip` are what exists.
//
// Run `npm run characters:render` to write index.html and the svg folder beside this file.

export const INK = '#141416';
export const WHITE = '#ffffff';
export const LIME = '#d4f04c';
export const CREAM = '#f1ece2';
const TAN = '#c9a36b';
const TAN_DARK = '#a17c47';
const GOLD = '#e0a526';
const PINK = '#f5a3a8';
const MOUTH = '#7a2f35';

export const WHO = ['cat', 'dino', 'dog', 'robot'] as const;
export const MOODS = ['calm', 'happy', 'thinking', 'found', 'stumped', 'sleepy'] as const;
export type Who = (typeof WHO)[number];
export type Mood = (typeof MOODS)[number];
export type View = 'full' | 'bust' | 'eyes';
export type Options = {
  who: Who;
  mood?: Mood;
  hat?: boolean;
  coat?: boolean;
  glass?: boolean;
  monocle?: boolean;
  wave?: boolean;
  view?: View;
  flip?: boolean;
  dark?: boolean;
  back?: string;
  size?: number;
};
type Dress = Required<Pick<Options, 'hat' | 'coat' | 'glass' | 'monocle' | 'wave' | 'dark'>> & { mood: Mood; line: string };
/** A character: its name, how it is drawn, the square around its eyes, and the colour that fills its icon. */
/** `called` is the character's name. `tools` says what `glass` and `monocle` are on this character. */
type Member = { name: string; called: string; tools: { glass: string; monocle: string }; draw: (d: Dress) => string; eyes: readonly [number, number, number]; fur: string; eye: readonly [number, number, number] };

// ------------------------------------------------------------------ Shared parts

/** A fedora with a lime band, centred on x 120 with its brim at y 64. */
const fedora = (tilt: number, dx = 0, dy = 0): string =>
  `<g transform="translate(${dx} ${dy}) rotate(${tilt} 120 64)"><path d="M76 62c-2-26 8-44 22-47 8-2 14 4 22 4s14-6 22-4c14 3 24 21 22 47z" fill="${TAN}"/>` +
  `<path d="M76.4 49h87.2c.7 4.3.7 8.7.4 13H76c-.3-4.300-.3-8.700.4-13z" fill="${LIME}"/><ellipse cx="120" cy="64" rx="68" ry="12" fill="${TAN_DARK}"/></g>`;

/** A belted trench coat cut to a body: shoulders at `top`, hem at `hem`, half-widths `w1` and `w2`. */
function trench(top: number, hem: number, w1: number, w2: number): string {
  const l1 = 120 - w1, l2 = 120 - w2, r2 = 120 + w2, belt = top + (hem - top) * 0.56;
  let s = `<path d="M${l1} ${top + 16}c0-10 8-16 18-16h${(w1 - 18) * 2}c10 0 18 6 18 16L${r2} ${hem - 10}c1 6-3 10-9 10H${l2 + 9}c-6 0-10-4-9-10z" fill="${TAN}"/>`;
  s += `<path d="M120 ${top + 34}V${hem}" stroke="${TAN_DARK}" stroke-width="2.2" stroke-linecap="round"/>`;
  s += `<rect x="${l2 + 3}" y="${belt}" width="${(w2 - 3) * 2}" height="12" rx="3" fill="${TAN_DARK}"/><rect x="112" y="${belt - 2.5}" width="16" height="17" rx="3.5" fill="${TAN}" stroke="${GOLD}" stroke-width="3.6"/>`;
  s += `<path d="M106 ${top + 2}l14 26 14-26z" fill="${WHITE}"/><path d="M117 ${top + 9}h6l2.5 11-5.5 7-5.5-7z" fill="${INK}"/>`;
  s += `<path d="M106 ${top + 1}l-22 8 14 26 22-8z" fill="${TAN_DARK}"/><path d="M134 ${top + 1}l22 8-14 26-22-8z" fill="${TAN_DARK}"/>`;
  return s;
}

/** A magnifying glass held up at the right shoulder. */
const heldGlass = (line: string, paw: string): string =>
  `<path d="M186 204l-20 22" stroke="${line}" stroke-width="12" stroke-linecap="round"/><circle cx="200" cy="186" r="24" fill="${WHITE}" fill-opacity=".25" stroke="${line}" stroke-width="8"/>` +
  `<path d="M186 178a16 16 0 0 1 10-8" fill="none" stroke="${WHITE}" stroke-width="3.4" stroke-linecap="round"/><circle cx="172" cy="218" r="12" fill="${paw}"/>`;

/** An open palm, for a wave: the animal's own colour with pale pads. */
const hand = (cx: number, cy: number, fur: string, pad: string, r = 14): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fur}"/><circle cx="${cx - r * 0.42}" cy="${cy - r * 0.2}" r="${r * 0.22}" fill="${pad}"/><circle cx="${cx}" cy="${cy - r * 0.46}" r="${r * 0.22}" fill="${pad}"/><circle cx="${cx + r * 0.42}" cy="${cy - r * 0.2}" r="${r * 0.22}" fill="${pad}"/><ellipse cx="${cx}" cy="${cy + r * 0.28}" rx="${r * 0.4}" ry="${r * 0.3}" fill="${pad}"/>`;

/** The marks beside a waving hand. */
const waveMarks = (cx: number, cy: number, line: string): string =>
  `<path d="M${cx - 20} ${cy - 16}q-7 9-3 20M${cx - 6} ${cy - 24}q-9 2-13 9" fill="none" stroke="${line}" stroke-opacity=".55" stroke-width="3.4" stroke-linecap="round"/>`;

/** A paw at rest, seen from the front: a rounded mitt at the end of the wrist, two toe lines at its tip. */
const mitt = (cx: number, cy: number, fur: string, shade: string): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="9.5" ry="11" fill="${fur}"/><path d="M${cx - 3.2} ${cy + 5}v5m6.400-5v5" stroke="${shade}" stroke-width="2" stroke-linecap="round"/>`;

/** An arm with an edge to it, so a sleeve reads against a coat of the same cloth. */
const limb = (d: string, fill: string, edge: string, w: number): string => stroke(d, edge, w + 3) + stroke(d, fill, w);

/**
 * Two arms that belong to the body. `top` is the height of the shoulders.
 * They are drawn before the body, as the robot's are, so each arm comes out of the shoulder and never sits on it.
 * At rest an arm leaves the shoulder, hangs clear of the coat, a little bent, the paw at the hip.
 * Waving, the upper arm goes out and the forearm up, the palm open toward you, so the pads show.
 * Holding the glass, the elbow drops and the forearm comes up to the handle. `heldGlass` draws that fist.
 */
function arms(d: Dress, top: number, sleeve: string, edge: string, fur: string, shade: string, pad: string, w = 15): string {
  let s = '';
  if (d.wave) s += limb(`M98 ${top + 10}L58 ${top + 12}L46 ${top - 24}`, sleeve, edge, w) + hand(44, top - 38, fur, pad, 13) + waveMarks(44, top - 38, d.line);
  else s += limb(`M96 ${top + 10}C72 ${top + 16} 60 ${top + 34} 58 ${top + 52}`, sleeve, edge, w) + mitt(57, top + 63, fur, shade);
  if (d.glass) s += limb(`M142 ${top + 10}L180 ${top + 30}L175 ${top + 15}`, sleeve, edge, w);
  else s += limb(`M144 ${top + 10}C168 ${top + 16} 180 ${top + 34} 182 ${top + 52}`, sleeve, edge, w) + mitt(183, top + 63, fur, shade);
  return s;
}

/** A monocle: a gold rim, a faint glass, and a chain that drops to the collar. */
const monocle = (cx: number, cy: number, r: number): string =>
  `<path d="M${cx + r * 0.6} ${cy + r * 0.8}C${cx + r + 14} ${cy + r + 40} ${cx + 4} ${cy + r + 56} 138 200" fill="none" stroke="${GOLD}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 5"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}" fill-opacity=".16" stroke="${GOLD}" stroke-width="5"/>`;

const stroke = (d: string, colour: string, w: number): string => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** A closed, smiling eye and a closed, resting eye. */
const arcUp = (cx: number, cy: number, w: number, colour: string, t: number) => stroke(`M${cx - w} ${cy + 4}q${w}-${w} ${w * 2} 0`, colour, t);
const arcDown = (cx: number, cy: number, w: number, colour: string, t: number) => stroke(`M${cx - w} ${cy}q${w} ${w * 0.6} ${w * 2} 0`, colour, t);

// ------------------------------------------------------------------ Cat

const CAT = '#454552';
const CAT_DARK = '#2e2e38';

function catFace(mood: Mood): string {
  let s = '';
  /** An almond eye, `h` tall, its slit pupil moved by `dx` and `dy`. */
  const eye = (cx: number, h: number, dx = 0, dy = 0, wide = false) =>
    `<path d="M${cx - 29} 120c6-${h} 46-${h} 58 0-10 ${h * 0.78}-48 ${h * 0.78}-58 0z" fill="${LIME}"/>` +
    `<ellipse cx="${cx + dx}" cy="${117 + dy}" rx="${wide ? 10 : 6.5}" ry="${Math.min(17, h * 0.5)}" fill="${INK}"/><circle cx="${cx + dx - 7}" cy="${108 + dy}" r="${wide ? 5.5 : 4.6}" fill="${WHITE}"/>`;
  const lid = (cx: number, h: number) => stroke(`M${cx - 31} 119c8-${h + 2} 48-${h + 2} 62 0`, CAT_DARK, 5);
  if (mood === 'happy') s += arcUp(85, 116, 26, LIME, 8) + arcUp(155, 116, 26, LIME, 8);
  else if (mood === 'sleepy') s += arcDown(85, 116, 26, LIME, 7) + arcDown(155, 116, 26, LIME, 7);
  else if (mood === 'found') s += eye(85, 40, 0, 0, true) + eye(155, 40, 0, 0, true) + lid(85, 40) + lid(155, 40);
  else if (mood === 'thinking') s += eye(85, 32, -8, -5) + eye(155, 32, -8, -5) + lid(85, 32) + lid(155, 32) + stroke('M130 86l50-10', CAT_DARK, 6);
  else if (mood === 'stumped') s += eye(85, 30, 0, 3) + eye(155, 30, 0, 3) + stroke('M58 96l50-14M182 96l-50-14', CAT_DARK, 6);
  else {
    // Calm is the cat's own look: one eye open, one lid lowered. It has already worked it out.
    s += eye(85, 32) + eye(155, 32) + `<path d="M122 92l66 4v18q-30-16-64-8z" fill="${CAT}"/>` + lid(85, 32) + stroke('M124 107q32-10 62 6', CAT_DARK, 5.5);
  }
  s += `<path d="M113 142q7-3 14 0l-7 8z" fill="${PINK}"/>`;
  const mouths: Record<Mood, string> = {
    calm: stroke('M120 150v6m-13 2q7 6 13-2 8 9 19-3', INK, 3),
    happy: `<path d="M106 156q14 18 28 0z" fill="${MOUTH}"/>` + stroke('M120 150v6m-14 0q7 6 14 0 7 6 14 0', INK, 3),
    thinking: stroke('M120 150v6m-6 4q10 2 18-4', INK, 3),
    found: stroke('M120 150v5', INK, 3) + `<ellipse cx="120" cy="163" rx="7" ry="8.5" fill="${MOUTH}"/>`,
    stumped: stroke('M120 150v6m-14 6q7-7 14 0 7-7 14 0', INK, 3),
    sleepy: stroke('M120 150v6m-8 2q8 4 16 0', INK, 3),
  };
  return s + mouths[mood];
}

function cat(d: Dress): string {
  const sleeve = d.coat ? TAN : CAT;
  // The tail leaves low on the right and hooks well clear of the coat.
  let s = stroke('M150 300c52 8 80-10 76-38-3-18-22-18-22-4', CAT, 14);
  for (const x of [102, 138]) s += `<ellipse cx="${x}" cy="310" rx="17" ry="9" fill="${CAT}"/><ellipse cx="${x + (x < 120 ? -6 : 6)}" cy="312" rx="8" ry="5.5" fill="${CREAM}"/>`;
  s += arms(d, 204, sleeve, d.coat ? TAN_DARK : CAT_DARK, CAT, CAT_DARK, CREAM);
  s += d.coat ? trench(184, 300, 38, 50) : `<path d="M90 198c-8 40-6 78 4 106h52c10-28 12-66 4-106z" fill="${CAT}"/><path d="M106 196c-2 30 3 52 14 66 11-14 16-36 14-66z" fill="${CREAM}"/>`;
  for (const sx of [1, -1]) {
    const f = (x: number) => 120 + sx * (x - 120);
    s += `<path d="M${f(50)} 104L${f(40)} 20 ${f(104)} 70z" fill="${CAT}"/><path d="M${f(57)} 88L${f(52)} 42 ${f(86)} 70z" fill="${PINK}"/>`;
  }
  s += `<path d="M38 122c0-36 34-60 82-60s82 24 82 60c0 10-3 19-9 27l15 10-24 5c-15 14-38 22-64 22s-49-8-64-22l-24-5 15-10c-6-8-9-17-9-27z" fill="${CAT}"/>`;
  s += `<ellipse cx="106" cy="155" rx="17" ry="13" fill="${CREAM}"/><ellipse cx="134" cy="155" rx="17" ry="13" fill="${CREAM}"/><ellipse cx="120" cy="167" rx="12" ry="8" fill="${CREAM}"/>`;
  s += catFace(d.mood);
  s += `<path d="M88 152l-40-10M88 160l-42 2M152 152l40-10M152 160l42 2" stroke="${CREAM}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (d.monocle) s += monocle(155, 116, 29);
  if (d.hat) s += fedora(-11, -8, -2);
  if (d.glass) s += heldGlass(d.line, CAT);
  return s;
}

// ------------------------------------------------------------------ Dog (a Pomeranian)

const DOG = '#f2a94e';
const DOG_DARK = '#d6862b';
const DOG_LIGHT = '#fff1d6';

function dogFace(mood: Mood): string {
  const eye = (cx: number, r: number, dx = 0, dy = 0) =>
    `<circle cx="${cx}" cy="118" r="${r}" fill="${INK}"/><circle cx="${cx - 5 + dx}" cy="${112 + dy}" r="${r * 0.4}" fill="${WHITE}"/><circle cx="${cx + 5 + dx}" cy="${124 + dy}" r="${r * 0.18}" fill="${WHITE}"/>`;
  let s = '';
  if (mood === 'happy') s += arcUp(94, 116, 15, INK, 6.5) + arcUp(146, 116, 15, INK, 6.5);
  else if (mood === 'sleepy') s += arcDown(94, 118, 15, INK, 6) + arcDown(146, 118, 15, INK, 6);
  else if (mood === 'found') s += eye(94, 19) + eye(146, 19);
  else if (mood === 'thinking') s += eye(94, 15.5, -3, -3) + eye(146, 15.5, -3, -3) + stroke('M132 94l28-8', DOG_DARK, 5);
  else if (mood === 'stumped') s += eye(94, 15.5, 0, 2) + eye(146, 15.5, 0, 2) + stroke('M78 98l28-9M162 98l-28-9', DOG_DARK, 5);
  else s += eye(94, 15.5) + eye(146, 15.5);
  s += `<path d="M111 136q9-4 18 0l-9 9z" fill="${INK}"/>`;
  const lip = stroke('M100 148q10 8 20-2 10 10 20 2', INK, 3);
  const mouths: Record<Mood, string> = {
    calm: `<path d="M106 150q14 18 28 0z" fill="${MOUTH}"/><path d="M113 157q7 8 14 0q-7-4-14 0z" fill="${PINK}"/>` + lip,
    happy: `<path d="M102 149q18 26 36 0z" fill="${MOUTH}"/><path d="M110 158q10 12 20 0q-10-6-20 0z" fill="${PINK}"/>` + lip,
    thinking: stroke('M120 145v5m-8 4q10 3 18-3', INK, 3),
    found: stroke('M120 145v4', INK, 3) + `<ellipse cx="120" cy="158" rx="8" ry="9.5" fill="${MOUTH}"/>`,
    stumped: stroke('M120 145v5m-14 8q7-7 14 0 7-7 14 0', INK, 3),
    sleepy: stroke('M120 145v5m-9 2q9 5 18 0', INK, 3),
  };
  return s + mouths[mood];
}

function dog(d: Dress): string {
  const puff = (cx: number, cy: number, r: number, fill = DOG) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  let s = '';
  const sleeve = d.coat ? TAN : DOG;
  // The tail: a short pom at the hip, clear of the arm.
  for (const [x, y, r] of [[58, 300, 13], [47, 293, 10]] as const) s += puff(x, y, r);
  s += puff(45, 291, 4.500, DOG_LIGHT);
  for (const x of [102, 138]) s += `<ellipse cx="${x}" cy="310" rx="16" ry="9" fill="${DOG_LIGHT}"/>`;
  s += arms(d, 208, sleeve, d.coat ? TAN_DARK : DOG_DARK, DOG, DOG_DARK, DOG_LIGHT);
  if (d.coat) s += trench(190, 300, 40, 50);
  else {
    s += `<path d="M82 204c-8 34-6 68 6 98h64c12-30 14-64 6-98z" fill="${DOG}"/>`;
    for (const [x, y, r] of [[102, 216, 15], [120, 222, 17], [138, 216, 15], [110, 240, 15], [130, 240, 15], [120, 258, 14]] as const) s += puff(x, y, r, DOG_LIGHT);
  }
  for (const sx of [1, -1]) {
    const f = (x: number) => 120 + sx * (x - 120);
    s += `<path d="M${f(70)} 80L${f(64)} 34 ${f(104)} 58z" fill="${DOG}"/><path d="M${f(75)} 70L${f(72)} 48 ${f(92)} 60z" fill="${DOG_DARK}"/>`;
  }
  for (let i = 0; i < 16; i++) s += puff(Math.round(120 + Math.cos((i / 16) * Math.PI * 2) * 72), Math.round(124 + Math.sin((i / 16) * Math.PI * 2) * 60), 23);
  s += `<ellipse cx="120" cy="122" rx="70" ry="60" fill="${DOG}"/><ellipse cx="120" cy="150" rx="46" ry="34" fill="${DOG_LIGHT}"/>`;
  s += puff(96, 92, 6.5, DOG_LIGHT) + puff(144, 92, 6.5, DOG_LIGHT);
  s += `<circle cx="78" cy="146" r="11" fill="${PINK}" fill-opacity=".55"/><circle cx="162" cy="146" r="11" fill="${PINK}" fill-opacity=".55"/>`;
  s += dogFace(d.mood);
  if (d.monocle) s += monocle(146, 118, 21);
  if (d.hat) s += fedora(9, 4, -4);
  if (d.glass) s += heldGlass(d.line, DOG);
  return s;
}

// ------------------------------------------------------------------ Dino (a young rex)

const REX = '#57b862';
const REX_DARK = '#34884a';
const REX_BELLY = '#e9f6c6';
const REX_SPIKE = '#f08a3c';

function dinoFace(mood: Mood): string {
  const eye = (cx: number, r: number, dx: number, dy: number) =>
    `<circle cx="${cx}" cy="96" r="${r + 4}" fill="${REX_DARK}"/><circle cx="${cx}" cy="96" r="${r}" fill="${WHITE}"/>` +
    `<circle cx="${cx + dx}" cy="${99 + dy}" r="${r * 0.6}" fill="${LIME}"/><circle cx="${cx + dx}" cy="${100 + dy}" r="${r * 0.33}" fill="${INK}"/><circle cx="${cx + dx - 4}" cy="${95 + dy}" r="3.4" fill="${WHITE}"/>`;
  const closed = (cx: number, up: boolean) => `<circle cx="${cx}" cy="96" r="27" fill="${REX_DARK}"/>` + (up ? arcUp(cx, 96, 16, WHITE, 6.5) : arcDown(cx, 96, 16, WHITE, 6));
  let s = '';
  if (mood === 'happy') s += closed(88, true) + closed(152, true);
  else if (mood === 'sleepy') s += closed(88, false) + closed(152, false);
  else if (mood === 'found') s += eye(88, 26, 2, -2) + eye(152, 26, -2, -2) + stroke('M62 62q26-14 48-2M178 62q-26-14-48-2', REX_DARK, 8);
  else if (mood === 'thinking') s += eye(88, 23, -6, -6) + eye(152, 23, -6, -6) + stroke('M60 66q26-10 50 2M132 60l48-6', REX_DARK, 8);
  else if (mood === 'stumped') s += eye(88, 23, 4, 2) + eye(152, 23, -4, 2) + stroke('M58 84l52-16M182 84l-52-16', REX_DARK, 8);
  // Calm, for a rex, is brows set low: fierce is the idea, small is the result.
  else s += eye(88, 23, 4, 0) + eye(152, 23, -4, 0) + stroke('M58 70l52 14M182 70l-52 14', REX_DARK, 9);
  s += `<ellipse cx="106" cy="134" rx="4" ry="5.5" fill="${REX_DARK}"/><ellipse cx="134" cy="134" rx="4" ry="5.5" fill="${REX_DARK}"/>`;
  const teeth = (y: number) => [84, 98, 112, 126, 140, 154].map((x) => `<path d="M${x - 6} ${y + Math.round(8 - Math.abs(x - 119) / 6)}l6 10 6-10z" fill="${WHITE}"/>`).join('');
  const grin = `<path d="M74 152q46 30 92 0q-46 14-92 0z" fill="${MOUTH}"/>` + teeth(155) + stroke('M72 151q48 16 96 0', REX_DARK, 4);
  const mouths: Record<Mood, string> = {
    calm: grin,
    happy: `<path d="M72 150q48 46 96 0z" fill="${MOUTH}"/><path d="M100 172q20 14 40 0q-20-10-40 0z" fill="${PINK}"/>` + teeth(150) + stroke('M72 150h96', REX_DARK, 4),
    thinking: stroke('M92 160q30 6 60-8', REX_DARK, 5),
    found: `<ellipse cx="120" cy="162" rx="20" ry="15" fill="${MOUTH}"/>` + stroke('M100 162a20 15 0 0 1 40 0', REX_DARK, 4),
    stumped: stroke('M86 162q9-9 17 0 9 9 17 0 9-9 17 0 9 9 17 0', REX_DARK, 5),
    sleepy: stroke('M100 160q20 8 40 0', REX_DARK, 5),
  };
  return s + mouths[mood];
}

function dino(d: Dress): string {
  let s = stroke('M96 286c-42 10-70-8-74-40', REX, 28);
  for (const [x, y, r] of [[22, 250, -70], [36, 276, -40], [62, 290, -15]] as const) s += `<path d="M${x - 9} ${y}l9-17 9 17z" transform="rotate(${r} ${x} ${y})" fill="${REX_SPIKE}"/>`;
  for (const x of [96, 144]) {
    s += `<ellipse cx="${x}" cy="309" rx="24" ry="11" fill="${REX_DARK}"/>`;
    for (const dx of [-13, 0, 13]) s += `<path d="M${x + dx - 4} 314l4 7 4-7z" fill="${WHITE}"/>`;
  }
  s += d.coat
    ? trench(186, 300, 42, 54)
    : `<path d="M78 204c-8 36-6 70 6 98h72c12-28 14-62 6-98z" fill="${REX}"/><ellipse cx="120" cy="258" rx="31" ry="40" fill="${REX_BELLY}"/>`;
  const arm = d.coat ? TAN : REX;
  s += d.wave
    ? stroke('M84 216q-18-4-24-20', arm, 13) + stroke('M58 192l-8-5m11-1l-3-9', REX_DARK, 3.4) + waveMarks(52, 192, d.line)
    : stroke('M84 216q-14 4-20 16', arm, 13) + stroke('M60 228l-7 5m9 3l-5 7', REX_DARK, 3.4);
  s += d.glass ? stroke('M156 214q10 0 16 6', arm, 13) : stroke('M156 216q14 4 20 16', arm, 13) + stroke('M180 228l7 5m-9 3l5 7', REX_DARK, 3.4);
  if (!d.hat) for (const [x, y] of [[98, 52], [120, 46], [142, 52]] as const) s += `<path d="M${x - 11} ${y + 14}l11-24 11 24z" fill="${REX_SPIKE}"/>`;
  s += `<ellipse cx="120" cy="100" rx="76" ry="56" fill="${REX}"/><rect x="58" y="104" width="124" height="84" rx="38" fill="${REX}"/>`;
  s += `<circle cx="72" cy="134" r="4" fill="${REX_DARK}"/><circle cx="62" cy="120" r="3" fill="${REX_DARK}"/><circle cx="168" cy="134" r="4" fill="${REX_DARK}"/><circle cx="178" cy="120" r="3" fill="${REX_DARK}"/>`;
  s += dinoFace(d.mood);
  if (d.monocle) s += monocle(152, 96, 29);
  if (d.hat) s += fedora(-6, 0, -22);
  if (d.glass) s += heldGlass(d.line, REX);
  return s;
}

// ------------------------------------------------------------------ Robot

const STEEL = '#cbd3de';
const STEEL_DARK = '#8794a8';
const VISOR = '#1c1c20';

/** The robot's face is a screen: two lime lights for eyes and one for a mouth. */
function robotFace(mood: Mood): string {
  const light = (cx: number, w: number, h: number) => `<rect x="${cx - w / 2}" y="${108 - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2.4}" fill="${LIME}"/>`;
  const eyes: Record<Mood, string> = {
    calm: light(92, 22, 28) + light(148, 22, 28),
    happy: arcUp(92, 108, 14, LIME, 9) + arcUp(148, 108, 14, LIME, 9),
    // Working: three dots, as a screen shows it.
    thinking: `<circle cx="96" cy="108" r="8" fill="${LIME}"/><circle cx="120" cy="108" r="8" fill="${LIME}" fill-opacity=".6"/><circle cx="144" cy="108" r="8" fill="${LIME}" fill-opacity=".3"/>`,
    found: `<circle cx="92" cy="108" r="17" fill="${LIME}"/><circle cx="148" cy="108" r="17" fill="${LIME}"/><circle cx="92" cy="108" r="6" fill="${VISOR}"/><circle cx="148" cy="108" r="6" fill="${VISOR}"/>`,
    // Stumped, for a machine, is an error code.
    stumped: `<text x="120" y="122" text-anchor="middle" font-family="Bungee, 'Courier New', monospace" font-size="36" fill="${LIME}">404</text>`,
    sleepy: stroke('M80 110h24M136 110h24', LIME, 8),
  };
  const mouths: Record<Mood, string> = {
    calm: stroke('M108 134q12 8 24 0', LIME, 4.5),
    happy: stroke('M102 132q18 16 36 0', LIME, 5),
    thinking: '',
    found: `<rect x="112" y="128" width="16" height="13" rx="6" fill="${LIME}"/>`,
    stumped: stroke('M96 138h48', LIME, 3),
    sleepy: stroke('M114 136h12', LIME, 4.5),
  };
  return eyes[mood] + mouths[mood];
}

function robot(d: Dress): string {
  let s = '';
  for (const x of [100, 140]) s += `<rect x="${x - 9}" y="278" width="18" height="30" rx="5" fill="${STEEL_DARK}"/><rect x="${x - 20}" y="300" width="40" height="18" rx="9" fill="${STEEL}"/>`;
  const arm = d.coat ? TAN : STEEL_DARK;
  s += d.wave
    ? stroke('M80 212q-36-2-46-34', arm, 15) + `<circle cx="34" cy="174" r="13" fill="${STEEL}"/>` + waveMarks(34, 174, d.line)
    : stroke('M80 212q-24 20-12 48', arm, 15) + `<circle cx="68" cy="262" r="12" fill="${STEEL}"/>`;
  s += d.glass ? stroke('M160 210q14 0 14 10', arm, 15) : stroke('M160 212q24 20 12 48', arm, 15) + `<circle cx="172" cy="262" r="12" fill="${STEEL}"/>`;
  s += `<rect x="108" y="168" width="24" height="24" fill="${STEEL_DARK}"/>`;
  if (d.coat) s += trench(186, 300, 42, 54);
  else {
    s += `<rect x="70" y="186" width="100" height="106" rx="24" fill="${STEEL}"/><rect x="90" y="208" width="60" height="42" rx="9" fill="${STEEL_DARK}"/>`;
    s += `<circle cx="106" cy="229" r="9" fill="${LIME}"/><rect x="124" y="220" width="18" height="5" rx="2.5" fill="${STEEL}"/><rect x="124" y="232" width="12" height="5" rx="2.5" fill="${STEEL}"/>`;
    s += `<circle cx="84" cy="270" r="3.5" fill="${STEEL_DARK}"/><circle cx="156" cy="270" r="3.5" fill="${STEEL_DARK}"/>`;
  }
  // No hat: an aerial with a lime bulb. The hat sits over it.
  if (!d.hat) s += `<path d="M120 46V22" stroke="${STEEL_DARK}" stroke-width="5" stroke-linecap="round"/><circle cx="120" cy="16" r="9" fill="${LIME}"/>`;
  s += `<circle cx="42" cy="108" r="14" fill="${STEEL_DARK}"/><circle cx="198" cy="108" r="14" fill="${STEEL_DARK}"/>`;
  s += `<rect x="44" y="42" width="152" height="132" rx="36" fill="${STEEL}"/><rect x="60" y="68" width="120" height="86" rx="28" fill="${VISOR}"/>`;
  s += `<path d="M72 86a22 22 0 0 1 16-12" fill="none" stroke="${WHITE}" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>`;
  s += robotFace(d.mood);
  // Zoom: a reticle on the screen around one eye. Nothing is held up to the face.
  if (d.monocle) {
    s += `<circle cx="148" cy="108" r="22" fill="none" stroke="${LIME}" stroke-width="3" stroke-dasharray="7 5"/>`;
    s += stroke('M148 80v9M148 127v9M120 108h9M167 108h9', LIME, 3);
    s += `<path d="M66 82v-8h8M174 74h8v8M66 140v8h8M174 148h8v-8" fill="none" stroke="${LIME}" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if (d.hat) s += fedora(-6, 0, -18);
  // Scanner: a handset with a lime beam, where the others hold a glass.
  if (d.glass) {
    s += `<path d="M184 208L232 150l8 52z" fill="${LIME}" fill-opacity=".3"/>` + stroke('M184 208L232 150M184 208l56-6', LIME, 1.6);
    s += `<rect x="160" y="204" width="30" height="20" rx="6" fill="${STEEL_DARK}" transform="rotate(-24 175 214)"/><circle cx="183" cy="208" r="4" fill="${LIME}"/>`;
    s += `<circle cx="172" cy="220" r="11" fill="${STEEL}"/>`;
  }
  return s;
}

// ------------------------------------------------------------------ The cast, and the one function that draws it

const HAND_LENS = { glass: 'magnifying glass', monocle: 'monocle' } as const;

export const CAST: Record<Who, Member> = {
  cat: { name: 'Cat', called: 'Detective X', tools: HAND_LENS, draw: cat, eyes: [50, 50, 140], fur: CAT, eye: [155, 116, 29] },
  dino: { name: 'Dino', called: 'Detective Tobs', tools: HAND_LENS, draw: dino, eyes: [46, 38, 148], fur: REX, eye: [152, 96, 29] },
  dog: { name: 'Dog', called: 'Detective Puff', tools: HAND_LENS, draw: dog, eyes: [50, 44, 140], fur: DOG, eye: [146, 118, 21] },
  // A robot does not hold a glass to its screen. It scans, and it zooms.
  robot: { name: 'Robot', called: 'Agent 404', tools: { glass: 'scanner', monocle: 'zoom' }, draw: robot, eyes: [52, 42, 136], fur: STEEL, eye: [148, 108, 24] },
};

let uid = 0;

/** One character as SVG text. Everything in it is numbers and fixed colours, so it is safe to write into a page. */
export function character(o: Options): string {
  const m = CAST[o.who];
  if (!m) throw new Error(`No character called "${String(o.who)}". The cast is ${WHO.join(', ')}.`);
  const dark = !!o.dark;
  const view = o.view ?? 'full';
  const size = typeof o.size === 'number' && Number.isFinite(o.size) ? Math.min(4096, Math.max(1, o.size)) : 240;
  // A mood nobody has drawn falls back to the default, so a typo never draws a face with no eyes.
  const asked = o.mood && (MOODS as readonly string[]).includes(o.mood) ? o.mood : undefined;
  const mood = asked ?? (o.wave ? 'happy' : 'calm');
  const inner = m.draw({ mood, hat: !!o.hat, coat: !!o.coat, glass: !!o.glass, monocle: !!o.monocle, wave: !!o.wave, dark, line: dark ? CREAM : INK });
  const art = o.flip ? `<g transform="translate(240 0) scale(-1 1)">${inner}</g>` : inner;
  // The icon is filled edge to edge with the character's own colour.
  const back = view === 'eyes' ? m.fur : o.back;
  const [x, y, w, h] = view === 'eyes' ? [m.eyes[0], m.eyes[1], m.eyes[2], m.eyes[2]] : view === 'bust' ? [8, -14, 224, 224] : [0, -14, 240, 344];
  const rx = view === 'full' ? 0 : w * 0.23;
  const id = `ch${uid++}`;
  const fill = back ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${back}"/>` : '';
  const label = `${m.called}, ${mood}${o.wave ? ', waving' : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round((size * h) / w)}" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${label}"><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath><g clip-path="url(#${id})">${fill}${art}</g></svg>`;
}
