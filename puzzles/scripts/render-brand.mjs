// Renders brand files from the one official logo (SPEC section 1). Never redraw: the shapes come from logoPaths.ts.
//   public/favicon.svg                 app icon, vector
//   public/brand/icon-{32,180,512}.png  app icon: the cat's eyes up close, fur to every edge, radius 25%
//   public/brand/email-lockup.png      wordmark on the light email background, 211x24 at 2x
//   The identity itself is in design/brand (npm run brand:guide).
// Run: npm run brand:render

import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { CAT, CAT_EYES_BOX, CAT_FUR, CAT_IN_WORDMARK, WORDMARK_BOX } from '../src/brand/cat.ts';
import { LOGO_G, LOGO_REST } from '../src/components/logoPaths.ts';

const LIGHT = { bg: '#f6f6f7', fg: '#111113', muted: '#6a6a72', line: '#d9d9de' };

const cat = CAT.map((s) => `<${s.tag} ${Object.entries(s.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
const wordmark = (ink, height) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(height * WORDMARK_BOX[2]) / WORDMARK_BOX[3]}" height="${height}" viewBox="${WORDMARK_BOX.join(' ')}"><g transform="${CAT_IN_WORDMARK}">${cat}</g><path d="${LOGO_G + LOGO_REST}" fill="${ink}"/></svg>`;

// App icon: the eyes up close. The fur runs to every edge, corners at 25%.
const icon = (size) => {
  const [x, y, w] = CAT_EYES_BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${x} ${y} ${w} ${w}"><clipPath id="i${size}"><rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${w / 4}"/></clipPath><g clip-path="url(#i${size})"><rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${CAT_FUR}"/>${cat}</g></svg>`;
};

mkdirSync('public/brand', { recursive: true });
writeFileSync('public/favicon.svg', icon(64).replace(' width="64" height="64"', '') + '\n');

const b = await chromium.launch();

for (const size of [32, 180, 512]) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0;background:transparent">${icon(size).replace('<svg ', '<svg style="display:block" ')}</body>`);
  await p.screenshot({ path: `public/brand/icon-${size}.png`, omitBackground: true });
  await p.close();
}

// Email lockup: the wordmark 24 high, ink on the light email background. Rendered at 2x.
const email = await b.newPage({ viewport: { width: 211, height: 24 }, deviceScaleFactor: 2 });
await email.setContent(`<body style="margin:0;background:${LIGHT.bg}">${wordmark(LIGHT.fg, 24).replace('<svg ', '<svg style="display:block" ')}</body>`);
await email.screenshot({ path: 'public/brand/email-lockup.png', clip: { x: 0, y: 0, width: 211, height: 24 } });
await email.close();

await b.close();
console.log('Brand files written.');
