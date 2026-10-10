// Writes the brand guide (index.html) and the elements folder. Run: npm run brand:guide

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avatarSvg, DEFAULT_AVATAR, type Avatar } from '../../src/avatar/draw';
import { CAT_FUR } from '../../src/brand/cat';
import { CAST, character, CREAM, INK, LIME, MOODS, WHO, type Mood, type Who } from '../characters/characters';
import { appIcon, bubble, caseCard, eyesPattern, gameCard, mark, NIGHT, PAPER, pawDivider, previewCard, rankBadge, RANKS, stamp, stateCard, SURFACE, wordmark } from './elements';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'elements');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let files = 0;
/** Keep a piece as its own file, and hand it back for the page. */
const keep = (name: string, svg: string): string => {
  writeFileSync(join(out, `${name}.svg`), svg);
  files++;
  return svg;
};

// ------------------------------------------------------------------ What the guide says

/**
 * Who each partner is. Working names, not yet checked for trademarks. Every story follows the tone rule:
 * mischief, pride or a surprise, never harm, and no promise of a result.
 */
type Bio = { name: string; meaning: string; role: string; nature: string; story: string; wants: string; quirk: string; weak: string; line: string; never: string; use: string };
const VOICE: Record<Who, Bio> = {
  cat: {
    name: 'Detective X',
    meaning: 'Nobody knows what the X stands for.',
    role: 'The lead, and the logo',
    nature: 'Dry and sure of itself. Says little. Already knows.',
    story: 'X grew up above a newspaper office in Lagos, asleep on the proofreader\'s desk. Every night the same page was read 3 times, and every night a mistake got through. The proofreader marked each one with an X. The cat took the mark for a name, and learned where mistakes hide: in the line everyone has already read.',
    wants: 'For you to see it yourself. X could point. X would rather wait.',
    quirk: 'Never chases anything. Sits, watches, and lowers one eyelid when it knows. Signs every closed case with an X.',
    weak: 'Hates to be wrong, so when it is not sure it says nothing at all.',
    line: 'It was there the whole time.',
    never: 'I told you so. The eyelid says it.',
    use: 'The default partner. The icon, emails, anything that speaks for Gazecraft.',
  },
  dino: {
    name: 'Detective Tobs',
    meaning: 'From tobi, Yoruba for big. Tobs is not.',
    role: "A player's choice",
    nature: 'All heart, short arms. Tries hard, means well.',
    story: 'Tobs hatched late, in a museum crate marked "replica". It is the youngest thing in a building full of very old things, and it has decided to be as fearsome as the skeleton in the main hall. So far it is as fearsome as a house plant.',
    wants: 'To be taken seriously, and to find the longest word before anyone else.',
    quirk: 'Roars quietly, so as not to wake the guards. Holds the glass close, because its arms end early.',
    weak: 'Rushes. Finds the 9 letter word and walks past the 3 letter one.',
    line: 'I nearly had it.',
    never: 'Anything about the size of its arms.',
    use: 'Younger players. Cases set in the past.',
  },
  dog: {
    name: 'Detective Puff',
    meaning: 'After puff-puff, the round fried dough from home.',
    role: "A player's choice",
    nature: 'Glad you came. Pleased with every find.',
    story: 'Puff was found asleep beside a tray of puff-puff outside a bakery in Surulere, the same colour and nearly the same shape. The baker kept both. Puff has followed its nose ever since, and has never met a day it did not like.',
    wants: 'For everybody to find one. It keeps count of your good days and loses count of the rest.',
    quirk: 'The tail starts before you have found it. That is a hint, and Puff cannot help it.',
    weak: 'Celebrates too early.',
    line: 'You found one. I knew you would.',
    never: 'That was easy.',
    use: 'First days, streaks, anything that welcomes.',
  },
  robot: {
    name: 'Agent 404',
    meaning: 'Nobody gave it a badge. It printed one.',
    role: "A player's choice",
    nature: 'Exact. Counts everything, misses nothing.',
    story: 'Agent 404 was put together in Computer Village from a trader\'s calculator and a radio that only got one station. It can count the letters in a paragraph faster than you can blink. It cannot see the word hiding in them until somebody shows it, and it thinks that is the cleverest thing people do.',
    wants: 'To understand how you noticed. It writes down your answer every time.',
    quirk: 'Says the number first. Scans where the others look. Shows 404 when it is lost, and three dots while it works.',
    weak: 'Cannot round up. 7 of 8 is 7 of 8.',
    line: '4 found. 3 left.',
    never: 'Roughly.',
    use: 'Number games, scores, the facts of a result.',
  },
};

/** Which face goes with which moment. One mood per moment, so a player learns to read them. */
const MOMENTS: Array<[Mood, string]> = [
  ['calm', 'Waiting for you. The start of a case, a game in play.'],
  ['happy', 'A find. A streak kept. A wave hello.'],
  ['thinking', 'Anything loading. A puzzle being made.'],
  ['found', 'The last word. A rare find. A case closed.'],
  ['stumped', 'A wrong pick. A search with no results. An error.'],
  ['sleepy', 'Done for today. Nothing here yet.'],
];

const COLOURS: Array<[string, string, string]> = [
  ['Night', NIGHT, 'The dark ground'],
  ['Paper', PAPER, 'The light ground'],
  ['Ink', '#111113', 'Text on light, and the wordmark'],
  ['Lime', LIME, 'Found. Success. The eyes'],
  ['Fur', CAT_FUR, 'The cat, and the app icon'],
  ['Cream', CREAM, 'Tiles behind the characters'],
  ['Tan', '#c9a36b', 'The coat and the hat'],
  ['Gold', '#e0a526', 'Buckles, monocles, ranks'],
];

const DO = ['Let Detective X speak for Gazecraft.', 'Give each character tools that suit it. A robot scans. It does not hold a glass to a screen.', 'Give each moment its one mood.', 'Keep the watermark between 6% and 14%.', 'Keep lime for what is found, and for the eyes.', 'Use a light tile behind a character on a dark screen.'];
const DONT = ['Redraw, recolour or stretch the cat.', 'Put the watermark under puzzle text a player must read closely.', 'Use a character as decoration with nothing to say.', 'Show two characters reacting at once.', 'Let a character promise a result: no memory, focus or brain claims.'];

// ------------------------------------------------------------------ Pieces

const you = (o: Partial<Avatar>) => avatarSvg({ ...DEFAULT_AVATAR, ...o }, 96);
const fig = (svg: string, caption = '') => `<figure>${svg}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
const row = (items: string[], cls = '') => `<div class="row ${cls}">${items.join('')}</div>`;
const pair = (light: string, dark: string) => `<div class="pair"><div class="on light">${light}</div><div class="on dark">${dark}</div></div>`;

keep('mark', mark(240));
keep('wordmark-ink', wordmark('#111113', 96));
keep('wordmark-white', wordmark('#ededee', 96));
for (const who of WHO) keep(`app-icon-${who}`, appIcon(who, 512));
keep('pattern-eyes-night', eyesPattern(480, 240, NIGHT, 0.5));
keep('pattern-eyes-fur', eyesPattern(480, 240, CAT_FUR, 0.6));
keep('paw-divider', pawDivider(480, '#111113'));
keep('stamp-case-closed', stamp('Case closed', '#111113'));
keep('stamp-found', stamp('Found', '#111113'));
RANKS.forEach((r, i) => keep(`rank-${i + 1}-${r.toLowerCase()}`, rankBadge(i)));

const STATES: Array<[string, Mood, string, string]> = [
  ['empty', 'sleepy', 'Nothing here yet', 'Play one and it will show up.'],
  ['loading', 'thinking', 'Working on it', 'Making your puzzle.'],
  ['error', 'stumped', 'That did not work', 'Try again in a moment.'],
  ['done', 'found', 'Case closed', 'Every word found.'],
];

const castCard = (who: Who) => {
  const v = VOICE[who];
  return `<div class="cast">
  <div class="on cream">${character({ who, hat: true, coat: true, glass: true, size: 150 })}</div>
  <div>
    <h3>${v.name} <span class="kind">the ${CAST[who].name.toLowerCase()}</span></h3>
    <p class="role">${v.role} · ${v.meaning}</p>
    <p>${v.story}</p>
    <dl>
      <dt>Nature</dt><dd>${v.nature}</dd>
      <dt>Wants</dt><dd>${v.wants}</dd>
      <dt>Quirk</dt><dd>${v.quirk}</dd>
      <dt>Weak spot</dt><dd>${v.weak}</dd>
      <dt>Says</dt><dd class="say">"${v.line}"</dd>
      <dt>Never says</dt><dd>${v.never}</dd>
      <dt>Use for</dt><dd>${v.use}</dd>
    </dl>
    ${row(MOODS.map((mood) => fig(character({ who, mood, hat: true, coat: true, view: 'bust', back: CREAM, size: 58 }), mood)), 'tight')}
  </div>
</div>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gazecraft brand guide</title>
<style>
  @font-face { font-family: Bungee; font-weight: 400; src: url(../../node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2) format('woff2'); }
  ${[500, 600, 700, 800].map((w) => `@font-face { font-family: Manrope; font-weight: ${w}; src: url(../../node_modules/@fontsource/manrope/files/manrope-latin-${w}-normal.woff2) format('woff2'); }`).join(' ')}
  :root { --bg: ${PAPER}; --surface: #ffffff; --line: #d6d6db; --fg: #111113; --muted: #55555c; --subtle: #6a6a72; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: ${NIGHT}; --surface: ${SURFACE}; --line: #2a2a2f; --fg: #ededee; --muted: #a1a1a8; --subtle: #7d7d85; } }
  :root[data-theme="dark"] { --bg: ${NIGHT}; --surface: ${SURFACE}; --line: #2a2a2f; --fg: #ededee; --muted: #a1a1a8; --subtle: #7d7d85; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 500 16px/1.5 Manrope, system-ui, "Segoe UI", sans-serif; }
  main { max-width: 1080px; margin: 0 auto; padding: 48px 16px 96px; }
  h1 { font: 400 clamp(30px, 6vw, 56px)/1 Bungee, sans-serif; letter-spacing: -0.02em; margin: 24px 0 10px; opacity: 0.88; }
  h2 { font: 400 22px/1.1 Bungee, sans-serif; margin: 0 0 6px; opacity: 0.9; }
  h3 { font-size: 17px; font-weight: 800; margin: 0; }
  h4 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--subtle); margin: 26px 0 10px; }
  p { margin: 0; }
  .num { color: var(--subtle); font-weight: 800; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; }
  .sub { color: var(--muted); max-width: 66ch; margin-bottom: 18px; }
  section { margin-top: 60px; padding-top: 30px; border-top: 1px solid var(--line); }
  svg { display: block; max-width: 100%; height: auto; }
  figure { margin: 0; text-align: center; }
  figure svg { margin: 0 auto; }
  figcaption { margin-top: 6px; font-size: 13px; color: var(--muted); }
  .row { display: flex; flex-wrap: wrap; gap: 16px 22px; align-items: flex-end; }
  .row.tight { gap: 8px 10px; margin-top: 14px; }
  .row.four { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); align-items: start; margin-bottom: 16px; }
  .row.tight figcaption { font-size: 11px; margin-top: 3px; }
  .on { border-radius: 16px; padding: 22px; border: 1px solid var(--line); display: grid; place-items: center; }
  .on.light { background: ${PAPER}; color: #111113; }
  .on.dark { background: ${NIGHT}; color: #ededee; }
  .on.cream { background: ${CREAM}; }
  .pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
  .pair.two { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 700px) { .pair.two { grid-template-columns: 1fr; } }
  .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  .card ul { margin: 6px 0 0; padding-left: 18px; color: var(--muted); font-size: 15px; }
  .card li { margin: 4px 0; }
  .swatch { font-size: 13px; color: var(--muted); }
  .swatch i { display: block; width: 100%; height: 64px; border-radius: 10px; border: 1px solid var(--line); margin-bottom: 8px; }
  .swatch b { display: block; color: var(--fg); font-weight: 800; }
  .cast { display: grid; grid-template-columns: minmax(150px, 200px) 1fr; gap: 20px; align-items: start; margin-top: 18px; padding: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
  @media (max-width: 620px) { .cast { grid-template-columns: 1fr; } }
  .role { color: var(--subtle); font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
  .say { font-weight: 800; }
  .kind { color: var(--subtle); font-weight: 600; font-size: 14px; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 12px 0 0; font-size: 15px; }
  dt { color: var(--subtle); font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; padding-top: 3px; }
  dd { margin: 0; color: var(--muted); }
  dd.say { color: var(--fg); }
  .use { color: var(--muted); font-size: 15px; }
  table { border-collapse: collapse; width: 100%; font-size: 15px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  td { padding: 8px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; color: var(--muted); }
  tr:last-child td { border-bottom: 0; }
  td:first-child { width: 1%; }
  td b { color: var(--fg); }
  .type-b { font: 400 40px/1 Bungee, sans-serif; letter-spacing: -0.02em; opacity: 0.85; }
  .type-m { font-weight: 800; font-size: 28px; letter-spacing: -0.02em; }
  code { font-size: 13px; }
</style>
</head>
<body>
<main>
<p class="num">Gazecraft brand guide</p>
${wordmark('currentColor', 44)}
<h1>Look closer.</h1>
<p class="sub">A few minutes of real detective work, in place of scrolling. The brand is a cat that has already worked it out, the partners a player can choose, and the player. Everything here is built from the same parts as the game.</p>

<section>
  <p class="num">1</p>
  <h2>The logo</h2>
  <p class="sub">The cat. Dark fur, lime eyes, one lid lowered. Its eyes are the only lime in the logo. Never redrawn, recoloured or stretched: every use reads <code>src/brand/cat.ts</code>.</p>
  ${pair(wordmark('#111113', 64), wordmark('#ededee', 64))}
  <h4>The mark, and the app icon</h4>
  ${row([240, 96, 48, 28, 16].map((n) => fig(mark(n), String(n))).concat([180, 64, 32, 16].map((n) => fig(appIcon('cat', n), `icon ${n}`))))}
  <h4>Sizes and space</h4>
  <div class="grid">
    <div class="card"><h3>Sizes</h3><ul><li>Smallest wordmark 16. Smallest mark 16.</li><li>The size for each place it appears is set once, in <code>SPEC.md</code> section 1.</li></ul></div>
    <div class="card"><h3>Space</h3><ul><li>Keep about 12% of the height clear on every side.</li><li>The letters are ink or white. They never take a colour.</li><li>The app icon is the eyes up close, fur to every edge, corners at 25%.</li></ul></div>
  </div>
</section>

<section>
  <p class="num">2</p>
  <h2>Colour</h2>
  <p class="sub">Two grounds, one ink, one accent. Lime means found, and it is the colour of the eyes. It is never body text and never a large fill.</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
    ${COLOURS.map(([name, hex, use]) => `<div class="swatch"><i style="background:${hex}"></i><b>${name}</b>${hex}<br>${use}</div>`).join('')}
  </div>
</section>

<section>
  <p class="num">3</p>
  <h2>Type</h2>
  <p class="sub">Bungee for headings, capitals only. Manrope for everything read, typed or counted.</p>
  <div class="grid">
    <div class="card"><p class="type-b">Case closed</p><p class="sub" style="margin:8px 0 0">Bungee Regular. Headings and stamps.</p></div>
    <div class="card"><p class="type-m">4 found. 3 left.</p><p class="sub" style="margin:8px 0 0">Manrope 500 to 800. Text, numbers, buttons.</p></div>
  </div>
</section>

<section>
  <p class="num">4</p>
  <h2>The cast</h2>
  <p class="sub">Four partners and the player. The four work a case beside you: a new player picks 1, free, and can switch to another once it is unlocked with points. Detective X leads, and is the logo. Each has tools of its own: the animals hold a magnifying glass and wear a monocle, and Agent 404 scans and zooms.</p>
  ${WHO.map(castCard).join('\n')}
  <div class="cast">
    <div class="on cream">${row([you({ back: 3, skin: 4, hair: 33, eyes: 1 }), you({ back: 2, skin: 5, hair: 26, face: 1 }), you({ back: 5, skin: 1, hair: 8, eyes: 1 })].map((s) => fig(s)), 'tight')}</div>
    <div>
      <h3>You</h3>
      <p class="role">The detective</p>
      <p>The player's own avatar, built from parts. It is their face, so the case is theirs.</p>
      <p>The only one with no story written for them. Theirs is the run of cases they close.</p>
      <dl>
        <dt>Rule</dt><dd class="say">The partner stands beside the player. It never replaces them.</dd>
        <dt>Use for</dt><dd>Boards, rooms, profiles. Detective pieces (badge, hat, coat, glass) are earned by rank.</dd>
      </dl>
    </div>
  </div>
</section>

<section>
  <p class="num">5</p>
  <h2>Mood</h2>
  <p class="sub">Six faces, and one moment for each. Every character has all six.</p>
  <table>
    ${MOMENTS.map(([mood, when]) => `<tr><td>${character({ who: 'cat', mood, hat: true, coat: true, view: 'bust', back: CREAM, size: 56 })}</td><td><b>${mood}</b></td><td>${when}</td></tr>`).join('\n    ')}
  </table>
  <h4>Poses and dress</h4>
  ${row([
    fig(character({ who: 'cat', size: 120, back: CREAM }), 'plain'),
    fig(character({ who: 'cat', hat: true, coat: true, size: 120, back: CREAM }), 'on the case'),
    fig(character({ who: 'cat', hat: true, coat: true, glass: true, size: 120, back: CREAM }), 'looking'),
    fig(character({ who: 'cat', hat: true, coat: true, monocle: true, size: 120, back: CREAM }), 'monocle'),
    fig(character({ who: 'cat', hat: true, coat: true, wave: true, size: 120, back: CREAM }), 'hello'),
  ])}
  <h4>Every partner says hello</h4>
  ${row(WHO.map((who) => fig(character({ who, hat: true, coat: true, wave: true, size: 120, back: CREAM }), VOICE[who].name)))}
  <h4>Each with its own tools</h4>
  ${row(WHO.flatMap((who) => [fig(character({ who, hat: true, coat: true, glass: true, size: 120, back: CREAM }), `${VOICE[who].name}: ${CAST[who].tools.glass}`), fig(character({ who, hat: true, coat: true, monocle: true, size: 120, back: CREAM }), CAST[who].tools.monocle)]))}
</section>

<section>
  <p class="num">6</p>
  <h2>Elements</h2>
  <p class="sub">Pieces made from the logo and the cast, kept as files in <code>design/brand/elements</code>, ready to carry into the game.</p>
  <h4>A character with something to say</h4>
  <div class="pair two">
    ${WHO.map((who, i) => `<div class="on ${i % 2 ? 'dark' : 'light'}">${keep(`bubble-${who}`, bubble(who, who === 'dog' ? 'happy' : who === 'dino' ? 'stumped' : 'calm', VOICE[who].line, i % 2 === 1))}</div>`).join('')}
  </div>
  <h4>Screen states</h4>
  <p class="sub">Each state in each character. The screen shows the player's own partner.</p>
  ${WHO.map((who) => row(STATES.map(([name, mood, title, line]) => fig(keep(`state-${name}-${who}`, stateCard(who, mood, title, line)), `${name}, ${VOICE[who].name}`)), 'four')).join('')}
  <h4>Case files</h4>
  ${row([
    fig(keep('case-open-cat', caseCard('The missing trophy', 'Case 3 · Football', 2, 5, 'cat')), 'open, cat'),
    fig(keep('case-closed-dog', caseCard('The last reel', 'Case 2 · Nollywood', 5, 5, 'dog', true)), 'closed, dog'),
    fig(keep('case-open-dino', caseCard('The lost bone', 'Case 7 · The past', 1, 4, 'dino')), 'open, dino'),
    fig(keep('case-closed-robot', caseCard('The wrong sum', 'Case 5 · Numbers', 6, 6, 'robot', true)), 'closed, robot'),
  ])}
  <h4>Ranks and stamps</h4>
  ${row(RANKS.map((r, i) => fig(rankBadge(i, 96), r)).concat([fig(`<div class="on cream" style="padding:8px">${stamp('Case closed', '#111113', 120)}</div>`, 'stamp'), fig(`<div class="on dark" style="padding:8px">${stamp('Found', LIME, 120)}</div>`, 'stamp, dark')]))}
  <h4>Grounds and rules</h4>
  ${row([fig(eyesPattern(300, 150, NIGHT, 0.5), 'eyes, night'), fig(eyesPattern(300, 150, CAT_FUR, 0.6), 'eyes, fur'), fig(`<div class="on light" style="padding:14px">${pawDivider(300, INK)}</div>`, 'paw rule')])}
  <h4>A player's choice of home screen icon</h4>
  ${row(WHO.map((who) => fig(appIcon(who, 96), VOICE[who].name)))}
</section>

<section>
  <p class="num">7</p>
  <h2>Preview screens</h2>
  <p class="sub">The cat sits large and faint in the corner, behind the words: 13% on a link preview, 7% to 9% on a game card. It runs off the edge, and it is never under text a player has to read letter by letter.</p>
  ${row([
    fig(keep('preview-home', previewCard('Gazecraft', 'Slow down.', 'Look closer.', 'One paragraph a day. Words hidden in plain sight.', 520)), 'link preview, home'),
    fig(keep('preview-daily', previewCard('Daily #282 · 9 October', 'Find the hidden', 'cities.', 'One try. The count is hidden.', 520)), 'link preview, daily'),
  ])}
  <h4>Game card</h4>
  ${row([fig(keep('game-card-light', gameCard(false)), 'light'), fig(keep('game-card-dark', gameCard(true)), 'dark')])}
</section>

<section>
  <p class="num">8</p>
  <h2>Do, and do not</h2>
  <div class="grid">
    <div class="card"><h3>Do</h3><ul>${DO.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="card"><h3>Do not</h3><ul>${DONT.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  </div>
</section>
</main>
</body>
</html>
`;
writeFileSync(join(here, 'index.html'), html);
console.log(`wrote index.html and ${files} element files`);
