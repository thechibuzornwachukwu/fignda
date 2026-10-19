// Writes both maps of Lantern Row from src/map/street.ts: the plan (design/sketches/map/the-street.html) and the
// 30 degree view (the-street-iso.html), each at 3 in the afternoon, by day or by night with ?theme=dark, and their pictures, by day, at night, and in each weather.
// Run: npm run street:render, after any change to src/map/street.ts or src/engine/world.ts.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { drawPlan, drawStreet, MAP_COLOURS, type Scene, type Weather } from '../src/map/street';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'design/sketches/map');

const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const svg = (scene: Scene) =>
  `<svg width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" xmlns="http://www.w3.org/2000/svg">\n` +
  `  <g class="s-ink" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">\n` +
  scene.shapes
    .map((s) => {
      const attrs = Object.entries(s.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
      const open = `<${s.tag}${attrs}${s.cls ? ` class="${s.cls}"` : ''}${s.anchor ? ` data-anchor="${s.anchor}"` : ''}`;
      return s.text != null ? `    ${open}>${esc(s.text)}</${s.tag}>` : `    ${open}/>`;
    })
    .join('\n') +
  `\n  </g>\n` +
  `  <g fill="none" stroke="none">\n` +
  Object.entries(scene.places).map(([id, [x, y]]) => `    <circle data-place="${id}" cx="${x}" cy="${y}" r="1"/>`).join('\n') +
  `\n  </g>\n</svg>`;

const vars = (side: 0 | 1) => Object.entries(MAP_COLOURS).map(([k, v]) => `    --map-${k}: ${v[side]};`).join('\n');
const page = (scene: Scene, title = 'Lantern Row at 30 degrees', about = 'The street from the south east') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<!--
  Written by scripts/render-street.ts from src/map/street.ts. Do not edit by hand: change the module and render again.
  ${about}, by day in the light theme and at night in the dark (?theme=dark). The sun and the
  shadows follow the hour, the moon follows the date, the weather follows the case.
-->
<style>
  :root {
${vars(0)}
    --map-glow: 0;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
${vars(1)}
      --map-glow: 0.22;
    }
  }
  :root[data-theme="dark"] {
${vars(1)}
    --map-glow: 0.22;
  }
  html, body { margin: 0; background: var(--map-land); }
  svg { display: block; width: 100%; max-width: 100%; height: auto; }
${Object.keys(MAP_COLOURS).map((k) => `  .f-${k} { fill: var(--map-${k}); }`).join('\n')}
  .s-ink { stroke: var(--map-ink); }
  .f-star, .f-shadow, .f-sun, .f-sun-dawn, .f-moon, .f-moon-dark, .f-wet, .f-puddle, .f-fog, .f-snow-cap, .f-snow-ground, .f-slush, .f-flake, .f-flood, .f-water, .f-grass, .f-pavement, .f-moss, .f-grime, .f-leaf-light, .f-camera-eye, .f-crack, .f-weed, .f-weed-2, .f-shadow-storm, .glow { stroke: none; }
  .f-funnel-dust { stroke-width: 1.4; }
  .f-cone { stroke: var(--map-blue); stroke-width: 1; stroke-dasharray: 4 4; }
  .f-camera { stroke-width: 1.2; }
  .sign-words { fill: #f3ead9; stroke: none; font-family: Manrope, 'Segoe UI', Arial, sans-serif; font-weight: 700; letter-spacing: 0.02em; }
  .plaque-words { fill: #2a2622; stroke: none; font-family: Manrope, 'Segoe UI', Arial, sans-serif; font-weight: 800; }
  .picket { stroke: var(--map-ink); stroke-width: 1.4; }
  .fence-plan { stroke: var(--map-ink); stroke-width: 2.5; stroke-dasharray: 2 3; }
  .weed { stroke: var(--map-weed); stroke-width: 1.6; }
  .twig { stroke: var(--map-bark); stroke-width: 1.4; }
  .snow-line { stroke: var(--map-snow-cap); stroke-width: 2; }
  .branch { stroke: var(--map-bark); stroke-width: 2.5; }
  .f-fruit-red, .f-fruit-orange { stroke-width: 1; }
  .f-battens { stroke-width: 1; }
  .f-cloud, .f-cloud-grey, .f-funnel, .f-wall-cloud, .f-dust { stroke-width: 1.4; }
  .f-land, .f-lot, .f-cloud-shadow { stroke: none; }
  .cloud-edge { stroke-width: 5; }
  .cloud-fill { stroke: none; }
  .f-dial, .f-dial-grey { stroke-width: 2.5; }
  .shaft { stroke: var(--map-cloud-grey); stroke-width: 6; opacity: 0.55; }
  .band { stroke: var(--map-ink); stroke-width: 1.2; opacity: 0.35; }
  .bird { stroke: var(--map-ink); stroke-width: 1.8; }
  .ripple { stroke: var(--map-ink); stroke-width: 1.2; opacity: 0.35; }
  .shade-1 { fill: #000; opacity: 0.07; stroke: none; }
  .shade-2 { fill: #000; opacity: 0.17; stroke: none; }
  .thin { stroke-width: 1.5; }
  .thick { stroke-width: 4; }
  .fence { stroke-width: 1.2; opacity: 0.6; }
  .trunk { stroke: var(--map-wood); stroke-width: 5; }
  .post { stroke-width: 3; }
  .rain { stroke: var(--map-blue); stroke-width: 1.6; opacity: 0.7; }
  .glow { fill: var(--map-ochre); opacity: var(--map-glow); }
</style>
<script>if (new URLSearchParams(location.search).get('theme') === 'dark') document.documentElement.dataset.theme = 'dark';</script>
</head>
<body>
${svg(scene)}
</body>
</html>
`;

/** A drawing as 1 .svg file on its own: its colours fixed to day or night, so it opens anywhere at any zoom. */
const standalone = (scene: Scene, dark: boolean) => {
  const css = page(scene).match(/<style>([\s\S]*?)<\/style>/)![1]!;
  const side = Object.entries(MAP_COLOURS).map(([k, v]) => `--map-${k}: ${v[dark ? 1 : 0]};`).join(' ');
  const rules = css.split('\n').filter((l) => /^\s{2}\./.test(l)).join('\n');
  return svg(scene).replace('<svg ', `<svg style="${side} --map-glow: ${dark ? 0.22 : 0}; background: var(--map-land)" `).replace('>\n', `>\n<style>\n${rules}\n</style>\n`);
};

const day = drawStreet({ hour: 15 });
writeFileSync(join(out, 'the-street-iso.html'), page(day));
const plan = drawPlan({ hour: 15 });
const planPage = (p: Scene) => page(p, 'Map of Lantern Row', 'The street straight down, the plan routes are drawn on');
writeFileSync(join(out, 'the-street.html'), planPage(plan));

const shots: Array<{ file: string; hour: number; weather: Weather; dark: boolean; fenced?: number[] }> = [
  { file: 'the-street-iso.png', hour: 15, weather: 'clear', dark: false },
  { file: 'the-street-iso-dark.png', hour: 22, weather: 'clear', dark: true },
  { file: 'the-street-iso-rain.png', hour: 10, weather: 'rain', dark: false },
  { file: 'the-street-iso-dawn.png', hour: 7, weather: 'clear', dark: false },
  { file: 'the-street-iso-fog.png', hour: 8, weather: 'fog', dark: false },
  { file: 'the-street-iso-fog-dark.png', hour: 23, weather: 'fog', dark: true },
  { file: 'the-street-iso-snow.png', hour: 13, weather: 'snow', dark: false },
  { file: 'the-street-iso-snow-dark.png', hour: 21, weather: 'snow', dark: true },
  { file: 'the-street-iso-storm.png', hour: 17, weather: 'storm', dark: false },
  { file: 'the-street-iso-flood.png', hour: 11, weather: 'flood', dark: false },
  // A case that has fenced 2 houses: their fronts carry a picket fence.
  { file: 'the-street-iso-fenced.png', hour: 15, weather: 'clear', dark: false, fenced: [6, 8] },
];
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: day.width, height: day.height } });
for (const s of shots) {
  await tab.emulateMedia({ colorScheme: s.dark ? 'dark' : 'light' });
  await tab.setContent(page(drawStreet({ hour: s.hour, weather: s.weather, fenced: s.fenced })));
  await tab.locator('svg').screenshot({ path: join(out, s.file), type: 'png' });
  // The same picture as vector, to open and zoom without losing sharpness.
  writeFileSync(join(out, s.file.replace(/\.png$/, '.svg')), standalone(drawStreet({ hour: s.hour, weather: s.weather, fenced: s.fenced }), s.dark));
}
await tab.setViewportSize({ width: plan.width, height: plan.height });
for (const [file, dark] of [['the-street.png', false], ['the-street-dark.png', true]] as const) {
  await tab.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
  await tab.setContent(planPage(drawPlan({ hour: dark ? 22 : 15 })));
  await tab.locator('svg').screenshot({ path: join(out, file), type: 'png' });
  writeFileSync(join(out, file.replace(/\.png$/, '.svg')), standalone(drawPlan({ hour: dark ? 22 : 15 }), dark));
}
await browser.close();
