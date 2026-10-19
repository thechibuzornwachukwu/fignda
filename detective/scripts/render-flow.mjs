// Writes design/flow.jpg from design/flow.html, so the picture of the game's flow never drifts from its source.
// Run: npm run flow:render, after any change to design/flow.html.

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(root, 'design/flow.html')).href);
await page.locator('#flow').screenshot({ path: join(root, 'design/flow.jpg'), type: 'jpeg', quality: 90 });
await browser.close();
