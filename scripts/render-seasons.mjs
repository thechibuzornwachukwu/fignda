// Renders design/seasonalcelebrationetcpreview.png: the seasons a path dresses for (BUILD_PLAN section 5,
// set 5c), what each one brings and how it arrives. A sketch of the things, drawn flat as the game draws,
// for the owner to say yes or no to before any of it is built. Run: npm run seasons:render
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const INK = '#141416';
const PAPER = '#f1ece2';
const LIME = '#d4f04c';
const GOLD = '#e0a526';
const RED = '#c2462f';
const GREEN = '#5a8f3c';
const BLUE = '#6fa8dc';
const PINK = '#f5a3a8';
const WOOD = '#a17c47';
const STRAW = '#c9a36b';

// Each thing is drawn in a 64 box.
const G = {
  streamers: `<path d="M8 10c10 8 2 14 12 22M24 6c8 10-2 16 8 26M44 8c-8 10 4 16-6 28" fill="none" stroke="${LIME}" stroke-width="4" stroke-linecap="round"/><path d="M54 12c-6 8 4 12-2 20" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="48" r="3" fill="${RED}"/><circle cx="34" cy="52" r="3" fill="${GOLD}"/><circle cx="50" cy="46" r="3" fill="${LIME}"/>`,
  clock: `<circle cx="32" cy="32" r="24" fill="${PAPER}" stroke="${INK}" stroke-width="4"/><path d="M32 32V14M32 32l-7-13" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="3" fill="${RED}"/>`,
  sparkler: `<path d="M14 56L34 30" stroke="#a1a1a8" stroke-width="3" stroke-linecap="round"/><path d="M38 24V10M38 24l12-8M38 24l14 2M38 24l8 12M38 24l-12-6M38 24l-4-12" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="24" r="4" fill="${PAPER}"/>`,
  lantern: `<path d="M32 4v8M32 54v8" stroke="${GOLD}" stroke-width="3"/><ellipse cx="32" cy="32" rx="18" ry="19" fill="${RED}"/><path d="M32 13v38M22 16c-5 10-5 22 0 32M42 16c5 10 5 22 0 32" fill="none" stroke="#8f2f1f" stroke-width="2"/><rect x="22" y="10" width="20" height="5" rx="2" fill="${GOLD}"/><rect x="22" y="49" width="20" height="5" rx="2" fill="${GOLD}"/>`,
  cutting: `<rect x="14" y="14" width="36" height="36" fill="${RED}" transform="rotate(45 32 32)"/><path d="M32 18l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="${PAPER}"/>`,
  redEnvelope: `<rect x="16" y="8" width="32" height="48" rx="3" fill="${RED}"/><path d="M16 20h32" stroke="#8f2f1f" stroke-width="2"/><circle cx="32" cy="34" r="8" fill="${GOLD}"/>`,
  heart: `<path d="M32 54C8 38 10 16 22 14c6-1 9 3 10 6 1-3 4-7 10-6 12 2 14 24-10 40z" fill="${RED}"/>`,
  envelope: `<rect x="8" y="16" width="48" height="32" rx="3" fill="${PAPER}" stroke="${INK}" stroke-width="3"/><path d="M8 18l24 18 24-18" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="39" r="5" fill="${RED}"/>`,
  ribbon: `<path d="M30 32L18 56l8-4 2 8 6-26zM34 32l12 24-8-4-2 8-4-26z" fill="#e88a90"/><path d="M32 30C20 14 8 18 10 28s14 6 22 2zM32 30c12-16 24-12 22-2s-14 6-22 2z" fill="${PINK}"/><circle cx="32" cy="30" r="5" fill="${RED}"/>`,
  blossom: `<path d="M8 56c14-8 22-22 26-44" fill="none" stroke="#6b4a2b" stroke-width="4" stroke-linecap="round"/><g fill="${PINK}"><circle cx="22" cy="40" r="6"/><circle cx="34" cy="24" r="7"/><circle cx="44" cy="36" r="5"/><circle cx="26" cy="18" r="4"/></g><g fill="${GOLD}"><circle cx="22" cy="40" r="2"/><circle cx="34" cy="24" r="2"/><circle cx="44" cy="36" r="2"/></g>`,
  kite: `<path d="M34 6l16 20-16 24-16-24z" fill="${LIME}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M34 6v44M18 26h32" stroke="${INK}" stroke-width="2"/><path d="M34 50c-6 4 4 6-4 12" fill="none" stroke="${PAPER}" stroke-width="2.5" stroke-linecap="round"/>`,
  puddle: `<path d="M32 8c-5 8-7 11-7 14a7 7 0 0 0 14 0c0-3-2-6-7-14z" fill="${BLUE}"/><ellipse cx="32" cy="46" rx="24" ry="9" fill="${BLUE}"/><ellipse cx="26" cy="44" rx="8" ry="2.5" fill="#bcd9f5"/>`,
  egg: `<path d="M32 6c12 0 20 18 20 30a20 20 0 0 1-40 0C12 24 20 6 32 6z" fill="${PAPER}"/><path d="M13 30c6-4 8 4 13 0s8 4 13 0 7 3 12 0" fill="none" stroke="${RED}" stroke-width="4"/><path d="M13 42h38" stroke="${LIME}" stroke-width="5"/>`,
  lily: `<path d="M32 60V34" stroke="${GREEN}" stroke-width="4" stroke-linecap="round"/><path d="M32 50c8-2 12-8 12-12-6 0-10 4-12 12z" fill="${GREEN}"/><path d="M32 36C20 30 16 16 20 8c8 4 12 12 12 20 0-8 4-16 12-20 4 8 0 22-12 28z" fill="${PAPER}"/><path d="M32 34V22" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  basket: `<path d="M16 30c0-22 32-22 32 0" fill="none" stroke="${WOOD}" stroke-width="4"/><ellipse cx="25" cy="28" rx="6" ry="8" fill="${PINK}"/><ellipse cx="39" cy="28" rx="6" ry="8" fill="${LIME}"/><path d="M12 30h40l-5 24H17z" fill="${STRAW}"/><path d="M14 38h36M16 46h32" stroke="${WOOD}" stroke-width="2.5"/>`,
  crescent: `<path d="M40 8a26 26 0 1 0 14 40A22 22 0 0 1 40 8z" fill="${GOLD}"/><path d="M48 16l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="${PAPER}"/>`,
  fanous: `<path d="M32 4v6" stroke="${GOLD}" stroke-width="3"/><path d="M24 10h16l4 8H20z" fill="${GOLD}"/><path d="M20 18h24l-4 30H24z" fill="#3f6fb0"/><path d="M26 22h12l-2 22h-8z" fill="#f2d98a"/><path d="M22 48h20l-3 8H25z" fill="${GOLD}"/>`,
  dates: `<ellipse cx="32" cy="44" rx="26" ry="9" fill="${PAPER}" stroke="${INK}" stroke-width="3"/><g fill="#6b3a1f"><ellipse cx="22" cy="41" rx="6" ry="4"/><ellipse cx="34" cy="39" rx="6" ry="4"/><ellipse cx="44" cy="43" rx="6" ry="4"/><ellipse cx="30" cy="46" rx="6" ry="4"/></g>`,
  balloon: `<path d="M32 48c-4 6 4 8 0 14" fill="none" stroke="${PAPER}" stroke-width="2"/><ellipse cx="32" cy="24" rx="16" ry="19" fill="${RED}"/><path d="M29 43h6l-3 5z" fill="${RED}"/><ellipse cx="26" cy="17" rx="4" ry="6" fill="#e88a7a"/>`,
  chalk: `<circle cx="30" cy="28" r="11" fill="none" stroke="${PAPER}" stroke-width="3" stroke-dasharray="2 3"/><path d="M30 6v6M30 44v6M8 28h6M46 28h6M14 12l4 4M42 40l4 4M46 12l-4 4M14 44l4-4" stroke="${PAPER}" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 3"/><rect x="40" y="52" width="16" height="6" rx="2" fill="${PINK}" transform="rotate(-20 48 55)"/>`,
  crown: `<path d="M10 46l-2-26 14 12 10-18 10 18 14-12-2 26z" fill="${GOLD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="38" r="3" fill="${RED}"/><circle cx="20" cy="40" r="2.5" fill="${LIME}"/><circle cx="44" cy="40" r="2.5" fill="${LIME}"/>`,
  bunting: `<path d="M4 14c18 10 38 10 56 0" fill="none" stroke="${PAPER}" stroke-width="2.5"/><path d="M10 18l8 3-6 13z" fill="${RED}"/><path d="M22 22l8 1-3 14z" fill="${LIME}"/><path d="M34 23l8-1-1 14z" fill="${GOLD}"/><path d="M46 21l8-3-2 13z" fill="${BLUE}"/>`,
  iceCream: `<path d="M22 30l10 30 10-30z" fill="${STRAW}"/><path d="M24 36l13 6M23 31l16 9" stroke="${WOOD}" stroke-width="2"/><circle cx="32" cy="20" r="13" fill="${PINK}"/><circle cx="27" cy="15" r="3" fill="#fbd0d3"/>`,
  sun: `<circle cx="32" cy="32" r="13" fill="${GOLD}"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M13 51l6-6" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`,
  leaf: `<path d="M12 52C10 28 26 10 54 10c0 28-18 44-42 42z" fill="#c2622d"/><path d="M12 52C24 40 36 28 50 14M26 38l-8-2M34 30l-8-4M42 22l-6-4M30 34l2 8M38 26l2 8" stroke="#7a3a16" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  corn: `<path d="M20 58c-8-10-8-22 0-30 2 10 6 18 12 28zM44 58c8-10 8-22 0-30-2 10-6 18-12 28z" fill="${GREEN}"/><path d="M32 6c8 6 12 20 12 30s-6 20-12 20-12-10-12-20S24 12 32 6z" fill="${GOLD}"/><path d="M26 16h12M23 26h18M22 36h20M24 46h16M32 8v46" stroke="#b9831a" stroke-width="2"/>`,
  scarecrow: `<path d="M32 22v38M10 30h44" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/><path d="M22 30h20v16H22z" fill="${RED}"/><circle cx="32" cy="16" r="9" fill="${STRAW}"/><path d="M20 10h24l-4-8H24z" fill="#6b4a2b"/><circle cx="29" cy="16" r="1.6" fill="${INK}"/><circle cx="35" cy="16" r="1.6" fill="${INK}"/>`,
  diya: `<path d="M32 12c-7 9-8 14-8 18a8 8 0 0 0 16 0c0-4-1-9-8-18z" fill="${GOLD}"/><path d="M32 22c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z" fill="${PAPER}"/><path d="M8 40c4 14 44 14 48 0z" fill="#b5651d"/><path d="M8 40h48" stroke="#8a4a12" stroke-width="3"/>`,
  rangoli: `<g transform="translate(32 32)"><g fill="${RED}"><ellipse rx="6" ry="14" transform="translate(0 -13)"/><ellipse rx="6" ry="14" transform="rotate(90) translate(0 -13)"/><ellipse rx="6" ry="14" transform="rotate(180) translate(0 -13)"/><ellipse rx="6" ry="14" transform="rotate(270) translate(0 -13)"/></g><g fill="${GOLD}"><ellipse rx="5" ry="12" transform="rotate(45) translate(0 -11)"/><ellipse rx="5" ry="12" transform="rotate(135) translate(0 -11)"/><ellipse rx="5" ry="12" transform="rotate(225) translate(0 -11)"/><ellipse rx="5" ry="12" transform="rotate(315) translate(0 -11)"/></g><circle r="6" fill="${LIME}"/></g>`,
  marigold: `<path d="M32 60V38" stroke="${GREEN}" stroke-width="4" stroke-linecap="round"/><path d="M32 52c8-1 11-6 11-10-6 0-9 4-11 10z" fill="${GREEN}"/><circle cx="32" cy="24" r="15" fill="#e8891c"/><g fill="${GOLD}"><circle cx="24" cy="18" r="6"/><circle cx="40" cy="18" r="6"/><circle cx="24" cy="30" r="6"/><circle cx="40" cy="30" r="6"/><circle cx="32" cy="24" r="6"/></g>`,
  pumpkin: `<path d="M32 16c-3-6 0-10 4-10" fill="none" stroke="${GREEN}" stroke-width="4" stroke-linecap="round"/><ellipse cx="32" cy="38" rx="24" ry="19" fill="#e8891c"/><path d="M32 19v38M20 22c-6 10-6 22 0 32M44 22c6 10 6 22 0 32" fill="none" stroke="#b9651a" stroke-width="2.5"/><path d="M19 34l6-7 4 7zM35 34l4-7 6 7z" fill="${INK}"/><path d="M18 43c8 9 20 9 28 0l-5 2-3-3-3 3-3-3-3 3-3-3-3 3z" fill="${INK}"/>`,
  bat: `<path d="M32 24C22 14 10 16 4 26c6-2 9 0 10 4 3-3 7-2 8 2 3-3 7-2 10 4 3-6 7-7 10-4 1-4 5-5 8-2 1-4 4-6 10-4-6-10-18-12-28-2z" fill="#5b5b6b"/><path d="M27 16l2 8h6l2-8-5 4z" fill="#5b5b6b"/><circle cx="29" cy="25" r="1.6" fill="${LIME}"/><circle cx="35" cy="25" r="1.6" fill="${LIME}"/>`,
  ghost: `<path d="M4 8h56M20 8v6M44 8v6" stroke="${PAPER}" stroke-width="2"/><path d="M12 14h16v30l-4-4-4 4-4-4-4 4zM36 14h16v30l-4-4-4 4-4-4-4 4z" fill="${PAPER}"/><g fill="${INK}"><circle cx="17" cy="24" r="2"/><circle cx="23" cy="24" r="2"/><circle cx="41" cy="24" r="2"/><circle cx="47" cy="24" r="2"/></g><path d="M17 31q3 3 6 0M41 31q3 3 6 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  sweets: `<path d="M18 32L6 22v20zM46 32l12-10v20z" fill="${GOLD}"/><ellipse cx="32" cy="32" rx="14" ry="11" fill="${RED}"/><path d="M26 23c4 6 4 12 0 18M36 23c4 6 4 12 0 18" fill="none" stroke="${PAPER}" stroke-width="3"/>`,
  snow: `<g stroke="${PAPER}" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M32 6v52M9.500 19l45 26M9.500 45l45-26"/><path d="M26 10l6 6 6-6M26 54l6-6 6 6M12 26l8 2-2-8M52 38l-8-2 2 8M12 38l8-2-2 8M52 26l-8 2 2-8"/></g>`,
  gift: `<rect x="10" y="26" width="44" height="30" rx="2" fill="${RED}"/><rect x="6" y="18" width="52" height="10" rx="2" fill="#a83a26"/><path d="M32 18v38" stroke="${LIME}" stroke-width="7"/><path d="M32 18c-10-14-22-6-12 0zM32 18c10-14 22-6 12 0z" fill="${LIME}"/>`,
  manger: `<path d="M18 44v14M46 44v14M10 16l22 28M54 16L32 44" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/><path d="M8 26h48l-8 18H16z" fill="${STRAW}"/><path d="M12 26c4-6 8-2 10-6 2 4 6 0 8-5 2 5 6 1 8 5 2-4 6 0 10 6z" fill="${GOLD}"/><ellipse cx="34" cy="26" rx="12" ry="6" fill="${PAPER}"/><circle cx="24" cy="24" r="5" fill="#c68655"/><path d="M50 2l1.500 4 4 .5-3 3 1 4-3.500-2-3.500 2 1-4-3-3 4-.5z" fill="${GOLD}"/>`,
  wreath: `<circle cx="32" cy="34" r="19" fill="none" stroke="#3f7a3a" stroke-width="11"/><circle cx="32" cy="34" r="19" fill="none" stroke="${GREEN}" stroke-width="5" stroke-dasharray="6 6"/><g fill="${RED}"><circle cx="17" cy="26" r="3"/><circle cx="48" cy="30" r="3"/><circle cx="24" cy="50" r="3"/><circle cx="42" cy="50" r="3"/></g><path d="M32 16c-8-10-16-4-8 2zM32 16c8-10 16-4 8 2z" fill="${RED}"/><circle cx="32" cy="17" r="3.500" fill="#a83a26"/>`,
  lights: `<path d="M2 14c14 14 46 14 60 0" fill="none" stroke="#a1a1a8" stroke-width="2.5"/><g fill="#7d7d85"><rect x="10" y="20" width="4" height="4"/><rect x="23" y="25" width="4" height="4"/><rect x="37" y="25" width="4" height="4"/><rect x="50" y="20" width="4" height="4"/></g><ellipse cx="12" cy="30" rx="5" ry="7" fill="${RED}"/><ellipse cx="25" cy="35" rx="5" ry="7" fill="${LIME}"/><ellipse cx="39" cy="35" rx="5" ry="7" fill="${GOLD}"/><ellipse cx="52" cy="30" rx="5" ry="7" fill="${BLUE}"/>`,
};

// The table in BUILD_PLAN section 5, set 5c. Change it there first.
const SEASONS = [
  ['New Year', '31 Dec to 2 Jan', 'Streamers from 29 Dec. The clock strikes on the night.', [['streamers', 'Streamers'], ['clock', 'A clock at 5 to 12'], ['sparkler', 'Sparklers']]],
  ['Lunar New Year', 'Its date, and 2 weeks after', '1 lantern a day until the path is lit.', [['lantern', 'Red lanterns'], ['cutting', 'Paper cuttings'], ['redEnvelope', 'Red envelopes']]],
  ["Valentine's", '14 Feb', 'Envelopes from 10 Feb. Cards between friends.', [['heart', 'Paper hearts'], ['envelope', 'Sealed envelopes'], ['ribbon', 'A ribbon']]],
  ['Spring', 'March and April', 'Buds, then blossom, then petals on the ground.', [['blossom', 'Blossom'], ['kite', 'A kite'], ['puddle', 'Puddles']]],
  ['Easter', 'Its weekend', '1 more egg a day through the week before.', [['egg', 'Painted eggs'], ['lily', 'Lilies'], ['basket', 'A basket']]],
  ['Ramadan and Eid', 'The month, then Eid', 'The moon fills night by night. Every lantern is lit on Eid.', [['crescent', 'A crescent'], ['fanous', 'Lanterns'], ['dates', 'Dates on a plate']]],
  ["Children's Day", 'Its date where the player is', 'The day only.', [['balloon', 'Balloons'], ['chalk', 'Chalk drawings'], ['crown', 'A paper crown']]],
  ['Summer', 'June to August', 'Bunting first, then the cart.', [['bunting', 'Bunting'], ['iceCream', 'An ice cream cart'], ['sun', 'Long shadows']]],
  ['Harvest', 'Late Sept to November', 'A few leaves, then drifts of them.', [['leaf', 'Falling leaves'], ['corn', 'Corn and yams'], ['scarecrow', 'A scarecrow']]],
  ['Diwali', 'Its 5 days', '1 more row of lamps each evening.', [['diya', 'Clay lamps'], ['rangoli', 'Rangoli'], ['marigold', 'Marigolds']]],
  ['Halloween', '31 Oct', '1 pumpkin from 25 Oct, a patch by the day. Playful, never frightening.', [['pumpkin', 'Pumpkins'], ['bat', 'A bat'], ['ghost', 'Paper ghosts'], ['sweets', 'Sweets']]],
  ['Christmas', 'December', 'Snow starts faintly on 1 Dec and thickens. Gifts from 18 Dec. The manger on the 24th.', [['snow', 'Snow'], ['gift', 'Gift boxes'], ['manger', 'A manger'], ['wreath', 'A wreath'], ['lights', 'Lights on a string']]],
];

const font = (file) => readFileSync(new URL(`../node_modules/@fontsource/${file}`, import.meta.url)).toString('base64');
const face = (family, weight, file) => `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${font(file)}) format('woff2')}`;

const thing = ([key, label]) => {
  if (!G[key]) throw new Error(`no drawing for ${key}`);
  return `<figure><svg viewBox="0 0 64 64" width="92" height="92" role="img" aria-label="${label}">${G[key]}</svg><figcaption>${label}</figcaption></figure>`;
};
const card = ([name, when, arrives, things]) =>
  `<section><header><h2>${name}</h2><span>${when}</span></header><div class="things">${things.map(thing).join('')}</div><p>${arrives}</p></section>`;

// Snow arriving through December, as the path would wear it: faint on the 1st, thick by the 24th.
const flakes = (n, seed) => {
  let h = seed;
  const next = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0), h / 4294967296);
  return Array.from({ length: n }, () => `<circle cx="${(next() * 300).toFixed(1)}" cy="${(next() * 110).toFixed(1)}" r="${(1.5 + next() * 2.5).toFixed(1)}"/>`).join('');
};
const ramp = [['1 Dec', 6], ['10 Dec', 22], ['18 Dec', 55], ['24 Dec', 120]]
  .map(([day, n], i) => `<figure class="ramp"><svg viewBox="0 0 300 110" width="300" height="110"><rect width="300" height="110" rx="12" fill="#1c1c1f"/><path d="M0 86c60-18 90 14 150 0s90-14 150 0v24H0z" fill="#26262a"/><g fill="${PAPER}" opacity="${0.5 + i * 0.16}">${flakes(n, 7 + i)}</g></svg><figcaption>${day}</figcaption></figure>`)
  .join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face('Manrope', 500, 'manrope/files/manrope-latin-500-normal.woff2')}
${face('Manrope', 800, 'manrope/files/manrope-latin-800-normal.woff2')}
${face('Bungee', 400, 'bungee/files/bungee-latin-400-normal.woff2')}
*{box-sizing:border-box}
body{margin:0;padding:48px;width:1680px;background:#0d0d0e;color:#ededee;font-family:Manrope,system-ui,sans-serif;font-weight:500}
h1{margin:0 0 8px;font-family:Bungee,sans-serif;font-weight:400;font-size:40px;line-height:1.05;color:#c0c0c1}
.lead{margin:0 0 32px;max-width:980px;font-size:18px;line-height:1.5;color:#a1a1a8}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
section{display:flex;flex-direction:column;gap:16px;padding:24px;background:#151517;border:1px solid #34343a;border-radius:16px}
header{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h2{margin:0;font-size:24px;font-weight:800}
header span{font-size:14px;font-weight:800;color:#7d7d85;text-align:right}
.things{display:flex;flex-wrap:wrap;gap:12px}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px;width:112px}
figure svg{display:block;padding:10px;background:#1c1c1f;border-radius:12px;width:112px;height:112px}
figcaption{font-size:13px;font-weight:800;text-align:center;line-height:1.25}
section p{margin:0;font-size:14px;line-height:1.45;color:#a1a1a8}
h3{margin:40px 0 16px;font-size:24px;font-weight:800}
.ramps{display:flex;gap:20px}
figure.ramp{width:300px}
figure.ramp svg{width:300px;height:110px;padding:0;background:none}
.foot{margin:32px 0 0;max-width:1100px;font-size:15px;line-height:1.5;color:#a1a1a8}
</style></head><body>
<h1>What a path wears, season by season</h1>
<p class="lead">12 seasons, what each one brings to the path and how it arrives. A sketch to say yes or no to: none of this is built. Drawn flat, as the game draws. Never over a board being read, and off under reduced motion.</p>
<div class="grid">${SEASONS.map(card).join('')}</div>
<h3>A season arrives slowly: snow through December</h3>
<div class="ramps">${ramp}</div>
<p class="foot">A season that belongs to one country or one faith is offered, never forced: it shows where the player is or where they chose, and Settings can turn dress off. Somebody who does not keep Christmas still gets snow in December and no manger. Moving dates (Lunar New Year, Easter, Ramadan and Eid, Diwali) are set a year ahead, never worked out in the browser.</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = new URL('../design/seasonalcelebrationetcpreview.png', import.meta.url);
await page.screenshot({ path: process.platform === 'win32' ? decodeURIComponent(out.pathname.slice(1)) : decodeURIComponent(out.pathname), fullPage: true });
await browser.close();
console.log('design/seasonalcelebrationetcpreview.png');
