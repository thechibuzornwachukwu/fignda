// Brand elements: the logo and the pieces built from it and from the cast, ready to be carried into the game.
// Every function returns SVG text made of numbers and fixed colours only.
// Text in these uses Bungee and Manrope by name: inside the app and the guide the fonts are loaded,
// a file opened by itself falls back to the system face.
//
// Run `npm run brand:guide` to write index.html and the elements folder beside this file.

import { CAT, CAT_BOX, CAT_EYES_BOX, CAT_FUR, CAT_IN_WORDMARK, WORDMARK_BOX } from '../../src/brand/cat';
import { LOGO_G, LOGO_REST } from '../../src/components/logoPaths';
import { character, CREAM, INK, LIME, WHITE, type Mood, type Who } from '../characters/characters';

export const PAPER = '#f6f6f7';
export const NIGHT = '#0d0d0e';
export const SURFACE = '#151517';
export const FOG = '#a1a1a8';
const GOLD = '#e0a526';
const TAN = '#c9a36b';
const TAN_DARK = '#a17c47';

const X = 'xmlns="http://www.w3.org/2000/svg"';
const cat = CAT.map((s) => `<${s.tag} ${Object.entries(s.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
/** Text is data: a title or a name may hold anything, so it is escaped before it goes into SVG. */
export const esc = (t: unknown): string =>
  String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** A whole number in a range. Anything that is not a number is the low end. */
export const clamp = (n: unknown, lo: number, hi: number): number => (typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo);
/** Cut a line to `max` characters, ending in "..." when it was cut. */
export const fit = (t: unknown, max: number): string => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
};

type TextOptions = { face?: 'Bungee' | 'Manrope'; weight?: number; anchor?: string; opacity?: number; max?: number };
/**
 * One line of text. With `max`, a line that would run wider than `max` is squeezed to fit, so a long title
 * never leaves its card. Widths are estimated from the face: Bungee is wide, Manrope is not.
 */
const text = (x: number, y: number, t: string, size: number, fill: string, o: TextOptions = {}) => {
  const wide = t.length * size * (o.face === 'Bungee' ? 0.74 : 0.56);
  const squeeze = o.max && wide > o.max ? ` textLength="${o.max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="${x}" y="${y}"${squeeze} font-family="${o.face ?? 'Manrope'}, system-ui, sans-serif" font-size="${size}" font-weight="${o.weight ?? (o.face === 'Bungee' ? 400 : 700)}" fill="${fill}" text-anchor="${o.anchor ?? 'start'}" fill-opacity="${o.opacity ?? 1}">${esc(t)}</text>`;
};
/** A drawing placed inside another: the inner SVG text, moved and sized. */
const place = (inner: string, x: number, y: number) => inner.replace('<svg ', `<svg x="${x}" y="${y}" `);

// ------------------------------------------------------------------ The logo

/** The mark: the cat's head. */
export const mark = (h: number): string => {
  const height = clamp(h, 1, 4096);
  return `<svg ${X} width="${(height * CAT_BOX[2]) / CAT_BOX[3]}" height="${height}" viewBox="${CAT_BOX.join(' ')}" role="img" aria-label="Gazecraft">${cat}</svg>`;
};

/** The wordmark: the cat, then GAZECRAFT in ink. */
export const wordmark = (ink: string, h: number): string => {
  const height = clamp(h, 1, 4096);
  return `<svg ${X} width="${(height * WORDMARK_BOX[2]) / WORDMARK_BOX[3]}" height="${height}" viewBox="${WORDMARK_BOX.join(' ')}" role="img" aria-label="Gazecraft"><g transform="${CAT_IN_WORDMARK}">${cat}</g><path d="${LOGO_G + LOGO_REST}" fill="${esc(ink)}"/></svg>`;
};

/** The app icon. The cat's is the product's. The others are a player's choice of home screen icon. */
export function appIcon(who: Who, px: number): string {
  const size = clamp(px, 1, 4096);
  if (who !== 'cat') return character({ who, hat: true, view: 'eyes', size });
  const [x, y, w] = CAT_EYES_BOX;
  return `<svg ${X} width="${size}" height="${size}" viewBox="${x} ${y} ${w} ${w}" role="img" aria-label="Gazecraft"><clipPath id="ai${size}"><rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${w / 4}"/></clipPath><g clip-path="url(#ai${size})"><rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${CAT_FUR}"/>${cat}</g></svg>`;
}

// ------------------------------------------------------------------ Background pieces

/**
 * The watermark: the cat, large and faint, running off the corner of a card. `opacity` between 0.06 and 0.14.
 * It sits behind text, so it is always low and never under the words a player has to read closely.
 */
export const watermark = (w: number, h: number, opacity = 0.1, scale = 1.25): string => {
  // Never loud: whatever is asked for, it stays between 4% and 16%.
  const faint = clamp(opacity, 0.04, 0.16);
  const side = h * scale;
  const k = side / CAT_BOX[3];
  return `<g opacity="${faint}" transform="translate(${w - CAT_BOX[2] * k * 0.78} ${h - side * 0.86}) scale(${k}) translate(${-CAT_BOX[0]} ${-CAT_BOX[1]})">${cat}</g>`;
};

/** A tile of the cat's eyes, for a quiet repeating ground. */
export const eyesPattern = (w: number, h: number, back: string, opacity = 0.5): string =>
  `<svg ${X} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="eyes" width="120" height="84" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">` +
  `<g transform="translate(14 22) scale(.42)" fill="${LIME}" fill-opacity="${opacity}"><path d="M0 20c6-32 46-32 58 0-10 25-48 25-58 0z"/><path d="M70 20c6-32 46-32 58 0-10 25-48 25-58 0z"/></g>` +
  `<g transform="translate(74 64) scale(.42)" fill="${LIME}" fill-opacity="${opacity * 0.55}"><path d="M0 20c6-32 46-32 58 0-10 25-48 25-58 0z"/><path d="M70 20c6-32 46-32 58 0-10 25-48 25-58 0z"/></g>` +
  `</pattern></defs><rect width="${w}" height="${h}" fill="${back}"/><rect width="${w}" height="${h}" fill="url(#eyes)"/></svg>`;

/** A rule with paw prints walking along it. */
export const pawDivider = (w: number, ink: string): string => {
  const paw = (x: number, y: number, r: number) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse cx="0" cy="3" rx="5" ry="4.2"/><circle cx="-5.500" cy="-3" r="2.200"/><circle cx="-1.800" cy="-6" r="2.200"/><circle cx="2.200" cy="-6" r="2.200"/><circle cx="5.800" cy="-3" r="2.200"/></g>`;
  let s = '';
  for (let x = 20, i = 0; x < w - 10; x += 34, i++) s += paw(x, i % 2 ? 9 : 19, i % 2 ? 78 : 102);
  return `<svg ${X} width="${w}" height="28" viewBox="0 0 ${w} 28" fill="${ink}" fill-opacity=".35">${s}</svg>`;
};

// ------------------------------------------------------------------ Marks of progress

/** A rubber stamp, set at an angle. */
export const stamp = (label: string, ink: string, size = 200): string => {
  const word = fit(label, 14);
  return `<svg ${X} width="${size}" height="${size}" viewBox="0 0 200 200"><g transform="rotate(-10 100 100)" fill="none" stroke="${ink}"><circle cx="100" cy="100" r="88" stroke-width="7"/><circle cx="100" cy="100" r="74" stroke-width="2.500"/>` +
  `<path d="M34 86h132M34 118h132" stroke-width="2.500"/></g><g transform="rotate(-10 100 100)">${text(100, 109, word, 19, ink, { face: 'Bungee', anchor: 'middle', max: 128 })}` +
  `<g transform="translate(100 56) scale(.2) translate(-120 -100)" opacity=".9">${cat}</g></g></svg>`;
};

export const RANKS = ['Rookie', 'Detective', 'Inspector', 'Chief'] as const;

/** A rank badge: a shield, one more bar per rank, the cat's eyes at the top once you are Chief. */
export function rankBadge(level: number, size = 120): string {
  // A rank below the first is the first, and one above the last is the last.
  const rank = Math.round(clamp(level, 0, RANKS.length - 1));
  const bars = Array.from({ length: rank + 1 }, (_, i) => `<rect x="34" y="${70 - i * 13 + rank * 6.5}" width="52" height="7" rx="3.500" fill="${rank === 3 ? LIME : CREAM}"/>`).join('');
  const eyes = rank === 3 ? `<g transform="translate(47 24) scale(.2)" fill="${LIME}"><path d="M0 20c6-32 46-32 58 0-10 25-48 25-58 0z"/><path d="M70 20c6-32 46-32 58 0-10 25-48 25-58 0z"/></g>` : '';
  return `<svg ${X} width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${RANKS[rank]}"><path d="M60 8l40 12v38c0 28-18 44-40 54-22-10-40-26-40-54V20z" fill="${rank === 3 ? CAT_FUR : SURFACE}" stroke="${rank === 0 ? FOG : GOLD}" stroke-width="5" stroke-linejoin="round"/>${eyes}${bars}</svg>`;
}

// ------------------------------------------------------------------ Cards

/** A character saying one line. The bubble's tail points at the speaker. */
export function bubble(who: Who, mood: Mood, line: string, dark = false): string {
  const fg = dark ? '#ededee' : '#111113';
  const fill = dark ? SURFACE : WHITE;
  const edge = dark ? '#34343a' : '#c4c4ca';
  // One line if it fits, two if it does not, and the second is cut if there is still more.
  const words = fit(line, 64).split(' ');
  const rows: string[] = [''];
  for (const w of words) {
    if ((rows[rows.length - 1] + ' ' + w).trim().length <= 30 || rows.length === 2) rows[rows.length - 1] = (rows[rows.length - 1] + ' ' + w).trim();
    else rows.push(w);
  }
  const said = rows.length === 1 ? text(176, 82, rows[0]!, 17, fg, { weight: 700, max: 256 }) : text(176, 70, rows[0]!, 17, fg, { weight: 700, max: 256 }) + text(176, 94, fit(rows[1]!, 30), 17, fg, { weight: 700, max: 256 });
  return `<svg ${X} width="460" height="150" viewBox="0 0 460 150">${place(character({ who, mood, hat: true, coat: true, view: 'bust', size: 132, dark }), 4, 10)}` +
    `<path d="M168 34h268a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14H168a14 14 0 0 1-14-14V86l-16-10 16-8V48a14 14 0 0 1 14-14z" fill="${fill}" stroke="${edge}" stroke-width="1.500"/>` +
    `<path d="M154 114h296" stroke="${edge}" stroke-width="5" stroke-linecap="round"/>${said}</svg>`;
}

/** A screen state with a character in it: nothing here, working, went wrong, done. */
export function stateCard(who: Who, mood: Mood, title: string, line: string, dark = false): string {
  const fg = dark ? '#ededee' : '#111113';
  const muted = dark ? FOG : '#55555c';
  return `<svg ${X} width="280" height="300" viewBox="0 0 280 300"><rect width="280" height="300" rx="20" fill="${dark ? SURFACE : WHITE}" stroke="${dark ? '#2a2a2f' : '#d6d6db'}"/>` +
    place(character({ who, mood, hat: true, coat: true, size: 118, dark }), 81, 22) +
    `${text(140, 232, fit(title, 28), 17, fg, { face: 'Bungee', anchor: 'middle', max: 244 })}${text(140, 258, fit(line, 40), 14, muted, { weight: 600, anchor: 'middle', max: 244 })}</svg>`;
}

/** A case file: a folder with the case on it, how far through it you are, and who is on it with you. */
export function caseCard(title: string, kicker: string, found: number, of: number, who: Who, closed = false): string {
  // A case has at least 1 clue and shows at most 9 dots. What is found is never more than there is.
  const total = Math.round(clamp(of, 1, 99));
  const done = Math.round(clamp(found, 0, total));
  const shown = Math.min(total, 9);
  const lit = Math.round((done / total) * shown);
  const dots = Array.from({ length: shown }, (_, i) => `<circle cx="${32 + i * 22}" cy="150" r="7" fill="${i < lit ? LIME : 'none'}" stroke="${i < lit ? LIME : '#5a5a63'}" stroke-width="2.500"/>`).join('');
  return `<svg ${X} width="340" height="200" viewBox="0 0 340 200"><path d="M10 34a12 12 0 0 1 12-12h92l16 18h188a12 12 0 0 1 12 12v126a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12z" fill="${TAN}"/>` +
    `<path d="M10 58h320v120a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12z" fill="${SURFACE}"/><path d="M10 190h320" stroke="${TAN_DARK}" stroke-width="6" stroke-linecap="round"/>` +
    `${text(24, 88, fit(kicker, 34), 12, FOG, { weight: 700, max: 200 })}${text(24, 116, fit(title, 24), 19, '#ededee', { face: 'Bungee', max: 204 })}${dots}` +
    `${text(24, 178, closed ? 'Case closed' : `${done} of ${total} clues`, 13, closed ? LIME : FOG, { weight: 700 })}` +
    place(character({ who, mood: closed ? 'happy' : 'calm', hat: true, coat: true, view: 'bust', size: 96, dark: true }), 232, 66) +
    (closed ? `<g transform="translate(146 116) scale(.37)">${stamp('Case closed', LIME).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>` : '') + `</svg>`;
}

// ------------------------------------------------------------------ Preview screens

/** The link preview, 1200 by 630: the wordmark, two lines, and the cat faint in the corner behind them. */
export function previewCard(kicker: string, first: string, second: string, foot: string, size = 600): string {
  return `<svg ${X} width="${size}" height="${(size * 630) / 1200}" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${NIGHT}"/>${watermark(1200, 630, 0.13, 1.3)}` +
    place(wordmark('#ededee', 46), 72, 64) +
    `${text(72, 232, fit(kicker, 60), 26, LIME, { weight: 700, max: 1056 })}${text(72, 330, fit(first, 28), 92, '#ededee', { weight: 800, max: 1056 })}${text(72, 430, fit(second, 28), 92, '#7d7d85', { weight: 800, max: 1056 })}` +
    `<path d="M72 496h1056" stroke="#2a2a2f" stroke-width="2"/>${text(72, 548, fit(foot, 80), 26, '#ededee', { weight: 700, max: 1056 })}</svg>`;
}

/** A game screen at a glance: the title, a count, the paragraph, and the cat very faint behind it all. */
export function gameCard(dark: boolean, size = 420): string {
  const fg = dark ? '#ededee' : '#111113';
  const muted = dark ? FOG : '#55555c';
  const back = dark ? SURFACE : WHITE;
  // Each run of text is given an exact width, so a highlight sits exactly under its letters.
  const CH = 10.3;
  const run = (parts: Array<[string, boolean]>, y: number) => {
    let x = 28;
    let out = '';
    for (const [t, found] of parts) {
      const w = t.length * CH;
      if (found) out += `<rect x="${x - 1}" y="${y - 19}" width="${w + 2}" height="26" rx="4" fill="${LIME}"/>`;
      out += `<text x="${x}" y="${y}" xml:space="preserve" textLength="${w}" lengthAdjust="spacingAndGlyphs" font-family="Manrope, system-ui, sans-serif" font-size="19" font-weight="${found ? 700 : 600}" fill="${found ? INK : fg}">${t}</text>`;
      x += w;
    }
    return out;
  };
  return `<svg ${X} width="${size}" height="${(size * 300) / 420}" viewBox="0 0 420 300"><clipPath id="gc${dark ? 1 : 0}"><rect width="420" height="300" rx="22"/></clipPath><g clip-path="url(#gc${dark ? 1 : 0})">` +
    `<rect width="420" height="300" fill="${back}"/>${watermark(420, 300, dark ? 0.09 : 0.07, 1.15)}` +
    `${text(28, 50, 'Around the world', 19, fg, { face: 'Bungee' })}${text(392, 50, '2 / 8', 17, muted, { weight: 800, anchor: 'end' })}` +
    `<path d="M28 68h364" stroke="${dark ? '#2a2a2f' : '#d6d6db'}" stroke-width="2"/><path d="M28 68h91" stroke="${fg}" stroke-width="2"/>` +
    run([['The sou', false], ['p, a ris', true], ['otto was cold.', false]], 112) +
    run([['It came f', false], ['rom e', true], ['very kitchen in', false]], 148) +
    run([['town, and nobody asked why.', false]], 184) + run([['It sat there in plain sight.', false]], 220) +
    `${text(28, 268, '6 more are hiding.', 14, muted, { weight: 700 })}</g></svg>`;
}
