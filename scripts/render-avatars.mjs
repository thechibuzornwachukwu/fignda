// Renders design/avatars-preview.png: every avatar choice, straight from the part lists, so a new
// hairstyle or outfit shows up here without touching this file. Run: npm run avatars:render
import { chromium } from 'playwright';
import { avatarSvg, DEFAULT_AVATAR, PARTS } from '../src/avatar/draw.ts';

// Vary skin, hair colour and background along each row so the sheet shows the range, not one face.
const SKIN = [3, 4, 2, 5, 1, 0];
const BACK = [2, 3, 4, 5, 0, 1];
const sample = (key, i) => ({
  ...DEFAULT_AVATAR,
  skin: key === 'skin' ? i : SKIN[i % SKIN.length],
  back: key === 'back' ? i : BACK[i % BACK.length],
  hair: key === 'hair' ? i : [0, 1, 9, 16, 11, 26][i % 6],
  colour: key === 'colour' ? i : 0,
  [key]: i,
  // Hair ties only show on hair that can take them.
  ...(key === 'tie' ? { hair: [1, 13, 4][i % 3] } : {}),
});

const players = [
  ['@ada', 1840, { back: 1, skin: 4, hair: 3, eyes: 1, mouth: 1 }],
  ['@chidi', 1710, { back: 0, skin: 5, hair: 7, mouth: 3, face: 1, extra: 3, item: 1, outfit: 1 }],
  ['@bisi', 1525, { back: 4, skin: 3, hair: 6, eyes: 3, extra: 2, mark: 3, outfit: 5 }],
  ['@zainab', 1410, { back: 5, skin: 2, hair: 8, eyes: 1 }],
  ['@temi', 1390, { back: 3, skin: 4, hair: 22, eyes: 2, mouth: 1, tie: 1, extra: 2, outfit: 4 }],
  ['@emeka', 1275, { back: 2, skin: 5, hair: 18, face: 3, mouth: 3, item: 2, mark: 5, outfit: 2 }],
  ['@emma', 1180, { back: 3, skin: 0, hair: 11, colour: 3, eyes: 2, mouth: 1, extra: 1, mark: 4, outfit: 9 }],
  ['@liam', 990, { back: 2, skin: 1, hair: 10, colour: 4, face: 1, mouth: 3, mark: 1, outfit: 7 }],
].map(([handle, score, parts]) => ({ handle, score, a: { ...DEFAULT_AVATAR, ...parts } }));

const cell = (svg, label) => `<div style="text-align:center;width:104px">${svg}<div style="font-size:12px;margin-top:6px;color:#d4d4d8">${label}</div></div>`;
const row = (title, cells) => `<h2 style="font-size:14px;color:#a1a1aa;font-weight:600;margin:24px 0 12px">${title}</h2><div style="display:flex;gap:14px 10px;flex-wrap:wrap">${cells.join('')}</div>`;
const total = PARTS.reduce((n, p) => n * p.names.length, 1);

const html = `<body style="margin:0;padding:40px;background:#0e0e10;color:#f4f4f5;font-family:Manrope,system-ui,sans-serif">
<h1 style="font-size:28px;margin:0 0 6px">Gazecraft avatars</h1>
<p style="margin:0;color:#a1a1aa;font-size:15px">${PARTS.length} things to choose, ${total.toLocaleString('en-US')} combinations. Every look is free.</p>
${PARTS.map((p) => row(`${p.title} (${p.names.length})`, p.names.map((name, i) => cell(avatarSvg(sample(p.key, i), 96), name)))).join('')}
${row('A few players', players.map((p) => cell(avatarSvg(p.a, 96), p.handle)))}
<h2 style="font-size:14px;color:#a1a1aa;font-weight:600;margin:26px 0 12px">On a leaderboard, at real size</h2>
<div style="width:420px;border-top:2px solid #f4f4f5">${players.slice(0, 3).map((p, i) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #2c2c31;font-weight:700"><span style="color:#71717a;width:18px">${i + 1}</span>${avatarSvg(p.a, 36)}<span style="flex:1">${p.handle}</span><span>${p.score.toLocaleString('en-US')}</span></div>`).join('')}</div>
</body>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1260, height: 600 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.screenshot({ path: 'design/avatars-preview.png', fullPage: true });
await browser.close();
console.log('wrote design/avatars-preview.png');
