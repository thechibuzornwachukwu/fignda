// Screenshots of the new clue types at phone and desktop width, for a look before release.
// Usage: serve a build on :4174 (npx vite preview --port 4174), then node design/screens.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'design/screenshots/2026-10-new-games';
mkdirSync(OUT, { recursive: true });
const shots = [
  ['liar', '/play/bible/34'],
  ['relay', '/play/bible/32'],
  ['series', '/play/bible/33'],
];
const browser = await chromium.launch();
for (const [w, h] of [[320, 740], [1280, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const [name, path] of shots) {
    await page.goto(`http://localhost:4174${path}`);
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log('saved to', OUT);
