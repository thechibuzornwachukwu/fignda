// Writes a sketch's picture from its source: node scripts/render-sketch.mjs design/sketches/the-street.html
// The .png lands beside the .html, at the drawing's own size (its first <svg>).

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
if (files.length === 0) throw new Error('Name the sketch: node scripts/render-sketch.mjs design/sketches/<name>.html');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of files) {
  const src = resolve(root, f);
  await page.goto(pathToFileURL(src).href);
  await page.locator('svg').first().screenshot({ path: src.replace(/\.html$/, '.png') });
}
await browser.close();
