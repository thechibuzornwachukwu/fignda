// Renders the 3D street's previews into design/sketches/map/3d: every camera, by day, at dawn, at night, in weather.
// Run: npm run street3d:render. It starts the dev server, opens /__street for each shot, and photographs the canvas.

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'design/sketches/map/3d');
mkdirSync(out, { recursive: true });

const shots: Array<[string, string]> = [
  ['iso.png', 'view=iso&hour=15'],
  ['iso-dawn.png', 'view=iso&hour=7'],
  ['iso-night.png', 'view=iso&hour=22'],
  ['plan.png', 'view=plan&hour=13'],
  ['front.png', 'view=front&hour=17&x=420'],
  ['enter.png', 'view=enter&hour=9'],
  ['walk.png', 'view=walk&hour=11&x=330'],
  ['walk-night.png', 'view=walk&hour=22&x=330'],
  ['walk-rain.png', 'view=walk&hour=12&x=500&weather=rain'],
  ['walk-snow.png', 'view=walk&hour=12&x=500&weather=snow'],
  ['iso-snow.png', 'view=iso&hour=13&weather=snow'],
  ['walk-dawn.png', 'view=walk&hour=7&x=200'],
  ['walk-storm.png', 'view=enter&hour=17&weather=storm'],
  ['iso-storm.png', 'view=iso&hour=17&weather=storm'],
  ['iso-flood.png', 'view=iso&hour=11&weather=flood'],
];

const server = await createServer({ root, server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
// Name shots to render only those: npm run street3d:render -- walk-storm iso-storm
const only = process.argv.slice(2);
for (const [file, q] of shots.filter(([f]) => only.length === 0 || only.includes(f.replace(/\.png$/, '')))) {
  // The first visit compiles three.js, which is slow; after that each shot is quick.
  await page.goto(`http://localhost:5199/__street?bare&w=1600&h=900&${q}`, { waitUntil: 'domcontentloaded', timeout: 600_000 });
  await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 600_000 });
  await page.locator('canvas').screenshot({ path: join(out, file) });
}
await browser.close();
await server.close();
