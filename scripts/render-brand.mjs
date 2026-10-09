// Renders brand files from the one official logo (SPEC section 1). Never redraw: the paths come from logoPaths.ts.
//   public/favicon.svg                 app icon, vector
//   public/brand/icon-{16,32,180,512}.png  app icon: mark 62% high on #0d0d0e, radius 25%
//   public/brand/email-lockup.png      wordmark on the light email background, 180x24 at 2x
//   design/brand-preview.png           the identity on one sheet: wordmark, mark, icon, colour, type
// Run: npm run brand:render

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { LOGO_G, LOGO_REST, LOGO_SHADE, MARK_BOX, WORDMARK_BOX } from '../src/components/logoPaths.ts';

const DARK = { bg: '#0d0d0e', fg: '#ededee', muted: '#a1a1aa', line: '#2c2c31' };
const LIGHT = { bg: '#f6f6f7', fg: '#111113', muted: '#6a6a72', line: '#d9d9de' };
const LIME = '#d4f04c';

const art = (box, letters, ink, height, shade = LIME) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(height * box[2]) / box[3]}" height="${height}" viewBox="${box.join(' ')}"><path d="${LOGO_SHADE}" fill="${shade}"/><path d="${letters}" fill="${ink}"/></svg>`;
const mark = (ink, height) => art(MARK_BOX, LOGO_G, ink, height);
const wordmark = (ink, height) => art(WORDMARK_BOX, LOGO_G + LOGO_REST, ink, height);

// App icon: ink tile, 25% radius, the mark 62% of the tile high and centred on its own box.
const icon = (size) => {
  const k = (size * 0.62) / MARK_BOX[3];
  const x = (size - MARK_BOX[2] * k) / 2 - MARK_BOX[0] * k;
  const y = (size - MARK_BOX[3] * k) / 2 - MARK_BOX[1] * k;
  const n = (v) => Number(v.toFixed(4));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size / 4}" fill="${DARK.bg}"/><g transform="translate(${n(x)} ${n(y)}) scale(${n(k)})"><path d="${LOGO_SHADE}" fill="${LIME}"/><path d="${LOGO_G}" fill="${DARK.fg}"/></g></svg>`;
};

mkdirSync('public/brand', { recursive: true });
writeFileSync('public/favicon.svg', icon(64).replace(' width="64" height="64"', '') + '\n');

const b = await chromium.launch();

for (const size of [16, 32, 180, 512]) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0;background:transparent">${icon(size).replace('<svg ', '<svg style="display:block" ')}</body>`);
  await p.screenshot({ path: `public/brand/icon-${size}.png`, omitBackground: true });
  await p.close();
}

// Email lockup: the wordmark 24 high, ink on the light email background. Rendered at 2x.
const email = await b.newPage({ viewport: { width: 180, height: 24 }, deviceScaleFactor: 2 });
await email.setContent(`<body style="margin:0;background:${LIGHT.bg}">${wordmark(LIGHT.fg, 24).replace('<svg ', '<svg style="display:block" ')}</body>`);
await email.screenshot({ path: 'public/brand/email-lockup.png', clip: { x: 0, y: 0, width: 180, height: 24 } });
await email.close();

// Identity sheet.
const face = (file) => readFileSync(`node_modules/@fontsource/${file}`).toString('base64');
const fonts =
  `@font-face{font-family:Manrope;font-weight:500;src:url(data:font/woff2;base64,${face('manrope/files/manrope-latin-500-normal.woff2')}) format('woff2')}` +
  `@font-face{font-family:Manrope;font-weight:800;src:url(data:font/woff2;base64,${face('manrope/files/manrope-latin-800-normal.woff2')}) format('woff2')}` +
  `@font-face{font-family:Bungee;font-weight:400;src:url(data:font/woff2;base64,${face('bungee/files/bungee-latin-400-normal.woff2')}) format('woff2')}`;
const label = (t, text) => `<div style="font:500 13px Manrope;color:${t.muted};margin:0 0 14px">${text}</div>`;
const row = (cells, gap = 28, align = 'flex-end') => `<div style="display:flex;align-items:${align};gap:${gap}px;margin:0 0 40px;flex-wrap:wrap">${cells.join('')}</div>`;
const swatch = (t, hex, name) => `<div style="font:500 13px Manrope;color:${t.muted}"><div style="width:120px;height:72px;border-radius:8px;background:${hex};border:1px solid ${t.line};margin-bottom:8px"></div>${name}<br>${hex}</div>`;
const panel = (t) => `<div style="background:${t.bg};color:${t.fg};padding:56px 64px">
${label(t, 'Wordmark. Bungee Regular. The G is the mark: one letter found, lifted on a lime block shade.')}
${row([wordmark(t.fg, 132)])}
${label(t, 'Wordmark at 64, 40, 28, 22 (header), 16')}
${row([64, 40, 28, 22, 16].map((h) => wordmark(t.fg, h)), 36)}
${label(t, 'Mark at 240, 96, 48, 30, 24, 16')}
${row([240, 96, 48, 30, 24, 16].map((h) => mark(t.fg, h)), 36)}
${label(t, 'App icon at 180, 64, 32, 16')}
${row([180, 64, 32, 16].map(icon), 28)}
${label(t, 'One colour: ink only, where lime cannot print')}
${row([art(WORDMARK_BOX, LOGO_G + LOGO_REST, t.fg, 40, 'none'), art(MARK_BOX, LOGO_G, t.fg, 40, 'none')], 36)}
${label(t, 'Colour. Lime is the shade and what is found. Never text, never a large fill.')}
${row([swatch(t, t.bg, 'Paper'), swatch(t, t.fg, 'Ink'), swatch(t, LIME, 'Lime')], 20)}
${label(t, 'Type. Bungee for headings, capitals only. Manrope for everything read, typed or counted.')}
<div style="font:400 44px/1 Bungee;letter-spacing:-0.02em;opacity:.8;margin:0 0 14px">Find it.</div>
<div style="font:500 16px/1.55 Manrope;max-width:560px">Looking closely is a craft you get better at. <span style="font-weight:800">Gazecraft level 12.</span> My Gazecraft league.</div>
</div>`;
const sheet = await b.newPage({ viewport: { width: 1280, height: 600 }, deviceScaleFactor: 2 });
await sheet.setContent(`<style>${fonts}</style><body style="margin:0">${panel(DARK)}${panel(LIGHT)}</body>`);
await sheet.evaluate(() => document.fonts.ready);
await sheet.screenshot({ path: 'design/brand-preview.png', fullPage: true });
await b.close();
console.log('Brand files written.');
