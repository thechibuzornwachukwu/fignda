// Writes design/sheet/current.html and current.png: the whole look of the game on 1 page. The pets in every mood,
// a few players, every choice once, the elements and the seasons.
// Every drawing comes from the code that draws it in the game, so the sheet never drifts from what ships. Not
// every combination of a player's look. Run: npm run sheet:render

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { avatarSvg, DEFAULT_AVATAR, PARTS } from '../../src/avatar/draw';
import { appIcon, bubble, caseCard, mark, pawDivider, rankBadge, RANKS, stamp, wordmark } from '../brand/elements';
import { CAST, character, INK, MOODS, WHO } from '../characters/characters';
import { G, ramp, SEASONS } from './seasons';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const PAPER = '#f6f6f7';
const MUTED = '#5c5c64';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cell = (svg: string, label = '', sub = '') =>
  `<figure>${svg}${label ? `<figcaption><b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</figcaption>` : ''}</figure>`;
const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;
const row = (cells: string[], title = '') => `${title ? `<h3>${esc(title)}</h3>` : ''}<div class="row">${cells.join('')}</div>`;

// ---- The logo
const logo = row([cell(wordmark(INK, 56)), cell(mark(96)), ...WHO.map((who) => cell(appIcon(who, 96), CAST[who].called, 'app icon'))]);

// ---- The pets, in every mood
const pets = WHO.map((who) => row([cell(character({ who, size: 120 }), 'plain'), ...MOODS.map((mood) => cell(character({ who, mood, hat: true, coat: true, size: 120 }), mood))], CAST[who].called)).join('');

// ---- The player: the starting look and a few players. Not every combination.
const players: Array<[string, Partial<typeof DEFAULT_AVATAR>]> = [
  ['the starting look', {}],
  ['@ada', { back: 1, skin: 4, hair: 3, eyes: 1, mouth: 1 }],
  ['@chidi', { back: 0, skin: 5, hair: 7, mouth: 3, face: 1, extra: 3, item: 1, outfit: 1 }],
  ['@bisi', { back: 4, skin: 3, hair: 6, eyes: 3, extra: 2, mark: 3, outfit: 5 }],
  ['@zainab', { back: 5, skin: 2, hair: 8, eyes: 1 }],
  ['@temi', { back: 3, skin: 4, hair: 22, eyes: 2, mouth: 1, tie: 1, extra: 2, outfit: 4 }],
  ['@emeka', { back: 2, skin: 5, hair: 18, face: 3, mouth: 3, item: 2, mark: 5, outfit: 2 }],
  ['@emma', { back: 3, skin: 0, hair: 11, colour: 3, eyes: 2, mouth: 1, extra: 1, mark: 4, outfit: 9 }],
  ['@liam', { back: 2, skin: 1, hair: 10, colour: 4, face: 1, mouth: 3, mark: 1, outfit: 7 }],
];
const people = row(players.map(([name, parts]) => cell(avatarSvg({ ...DEFAULT_AVATAR, ...parts }, 96), name)));

// ---- Every choice a player has, each shown once on the starting look. Not the combinations.
const SKIN = [3, 4, 2, 5, 1, 0];
const BACK = [2, 3, 4, 5, 0, 1];
const sample = (key: string, i: number) => ({
  ...DEFAULT_AVATAR,
  skin: key === 'skin' ? i : SKIN[i % SKIN.length]!,
  back: key === 'back' ? i : BACK[i % BACK.length]!,
  hair: key === 'hair' ? i : [0, 1, 9, 16, 11, 26][i % 6]!,
  [key]: i,
  // Hair ties only show on hair that can take them.
  ...(key === 'tie' ? { hair: [1, 13, 4][i % 3]! } : {}),
});
const choices = PARTS.map((p) => row(p.names.map((name, i) => cell(avatarSvg(sample(p.key, i), 56), name)), `${p.title} (${p.names.length})`)).join('');

// ---- Elements
const elements =
  row(RANKS.map((r, i) => cell(rankBadge(i, 110), r)), 'Ranks') +
  row([cell(stamp('Case closed', INK, 170)), cell(stamp('Found', INK, 170)), cell(stamp('Not them', INK, 170))], 'Stamps') +
  row([cell(caseCard('The long spoon', 'Case 1 · 6 steps', 3, 6, 'cat')), cell(caseCard('The open box', 'Case 2 · 6 steps', 6, 6, 'dog', true))], 'Case cards') +
  row([cell(bubble('cat', 'found', 'That one. Look again.')), cell(bubble('robot', 'thinking', 'Scanning the row.'))], 'The pet says') +
  row([cell(pawDivider(520, INK))], 'Divider');

// ---- The link preview a shared page shows, as it ships. A picture, so it is the same on both sheets.
const og = readFileSync(join(root, 'public', 'og', 'default.png')).toString('base64');
const shared = row([cell(`<img src="data:image/png;base64,${og}" width="600" height="315" alt="">`, 'Link preview', '1200 by 630')]);

// ---- Seasons on the path: not built yet. Each thing on the dark tile it was drawn for.
const tile = (key: string) => `<svg viewBox="0 0 64 64" width="72" height="72" style="padding:8px;background:#1c1c1f;border-radius:12px">${G[key]}</svg>`;
const seasons =
  SEASONS.map(([name, when, , things]) => row(things.map(([key, label]) => cell(tile(key), label)), `${name} · ${when}`)).join('') +
  `<h3>Snow through December</h3><div class="row">${ramp}</div>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Gazecraft sheet</title>
<style>
  body { margin: 0; padding: 48px; background: ${PAPER}; color: ${INK}; font-family: Manrope, system-ui, sans-serif; }
  h1 { margin: 0 0 32px; font-size: 32px; }
  section { margin: 0 0 40px; padding-top: 24px; border-top: 2px solid ${INK}; }
  h2 { margin: 0 0 16px; font-size: 22px; }
  h3 { margin: 20px 0 10px; color: ${MUTED}; font-size: 14px; font-weight: 700; }
  .row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 18px 22px; }
  figure { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 0; }
  figcaption { display: flex; flex-direction: column; align-items: center; font-size: 13px; }
  figcaption span { color: ${MUTED}; }
</style></head>
<body>
<h1>Gazecraft, as it is drawn today</h1>
${section('The logo', logo)}
${section('The pets', pets)}
${section('The player', people)}
${section('Every choice, once', choices)}
${section('Elements', elements)}
${section('Shared', shared)}
${section('Seasons on the path', seasons)}
</body></html>`;

writeFileSync(join(here, 'current.html'), html);
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await tab.setContent(html);
await tab.screenshot({ path: join(here, 'current.png'), fullPage: true });
await browser.close();
console.log('wrote design/sheet/current.html and current.png');
