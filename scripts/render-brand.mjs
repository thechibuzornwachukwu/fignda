// Renders brand PNGs from the one official mark (SPEC section 1). Never redraw: the SVG below is the spec path.
//   public/favicon.svg                 app icon, vector
//   public/brand/icon-{16,32,180,512}.png  app icon: mark 72% on #0d0d0e, radius 25%
//   public/brand/email-lockup.png      mark + "fignda" on the light email background, 2x
// Run: node scripts/render-brand.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PATH = 'M40 30V14a10 10 0 0 1 10-10h3M40 20h12M40 30v15a11 11 0 0 1-11 11h-5';
const mark = (stroke, lens, size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(1 2)"><circle cx="27" cy="30" r="13" fill="${lens}" stroke="${stroke}" stroke-width="7"/><path d="${PATH}" stroke="${stroke}" stroke-width="7"/></g></svg>`;

// Vector favicon: ink tile, 25% radius, mark at 72%.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0d0d0e"/><g transform="translate(8.96 8.96) scale(0.72)"><g transform="translate(1 2)" fill="none"><circle cx="27" cy="30" r="13" fill="#d4f04c" stroke="#ededee" stroke-width="7"/><path d="${PATH}" stroke="#ededee" stroke-width="7"/></g></g></svg>\n`;

mkdirSync('public/brand', { recursive: true });
writeFileSync('public/favicon.svg', favicon);

const font = readFileSync('node_modules/@fontsource/manrope/files/manrope-latin-800-normal.woff2').toString('base64');
const b = await chromium.launch();

for (const size of [16, 32, 180, 512]) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(
    `<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${size / 4}px;background:#0d0d0e;display:flex;align-items:center;justify-content:center">${mark('#ededee', '#d4f04c', Math.round(size * 0.72))}</div></body>`,
  );
  await p.screenshot({ path: `public/brand/icon-${size}.png`, omitBackground: true });
  await p.close();
}

// Email lockup: mark 30 + "fignda" 18/800, gap 10, ink on the light email background. Rendered at 2x.
const p = await b.newPage({ viewport: { width: 112, height: 30 }, deviceScaleFactor: 2 });
await p.setContent(
  `<style>@font-face{font-family:Manrope;font-weight:800;src:url(data:font/woff2;base64,${font}) format('woff2')}</style>` +
    `<body style="margin:0;background:#f6f6f7"><div style="display:inline-flex;align-items:center;gap:10px;color:#111113">${mark('#111113', '#d4f04c', 30)}` +
    `<span style="font:800 18px/1 Manrope;letter-spacing:-0.03em">fignda</span></div></body>`,
);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: 'public/brand/email-lockup.png', clip: { x: 0, y: 0, width: 112, height: 30 } });
await b.close();
console.log('Brand assets written.');
