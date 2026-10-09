// Writes index.html (every character, mood, dress and view on one page) and the svg folder.
// Run: npm run characters:render

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAST, character, CREAM, LIME, MOODS, WHO, type Options, type Who } from './characters';

const here = dirname(fileURLToPath(import.meta.url));
const DARK = '#0d0d0e';
const KIT = { hat: true, coat: true } as const;

// ---- The svg folder: each character in each mood, plus its icon and its plain self.
const out = join(here, 'svg');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let files = 0;
const save = (name: string, o: Options) => {
  writeFileSync(join(out, `${name}.svg`), character({ size: 480, ...o }));
  files++;
};
for (const who of WHO) {
  for (const mood of MOODS) save(`${who}-${mood}`, { who, mood, ...KIT });
  save(`${who}-plain`, { who });
  save(`${who}-glass`, { who, ...KIT, glass: true });
  save(`${who}-wave`, { who, ...KIT, wave: true });
  save(`${who}-monocle`, { who, ...KIT, monocle: true });
  save(`${who}-icon`, { who, hat: true, view: 'eyes', size: 512 });
}

// ---- The page.
const fig = (svg: string, caption: string) => `<figure>${svg}<figcaption>${caption}</figcaption></figure>`;
/** `tile`: each drawing sits on a light tile, so ink lines show when the page itself is dark. */
const row = (items: string[], tile = false) => `<div class="row${tile ? ' tile' : ''}">${items.join('')}</div>`;

const section = (who: Who) => `<section>
  <h2>${CAST[who].called}</h2>
  <h3>Mood</h3>
  ${row(MOODS.map((mood) => fig(character({ who, mood, ...KIT, size: 150 }), mood)), true)}
  <h3>Dress and pose</h3>
  ${row([
    fig(character({ who, size: 150 }), 'none'),
    fig(character({ who, hat: true, size: 150 }), 'hat'),
    fig(character({ who, ...KIT, size: 150 }), 'hat, coat'),
    fig(character({ who, ...KIT, glass: true, size: 150 }), CAST[who].tools.glass),
    fig(character({ who, ...KIT, monocle: true, size: 150 }), CAST[who].tools.monocle),
    fig(character({ who, ...KIT, wave: true, size: 150 }), 'waving'),
    fig(character({ who, wave: true, size: 150 }), 'waving, no kit'),
    fig(character({ who, ...KIT, glass: true, flip: true, size: 150 }), 'flipped'),
  ], true)}
  <h3>View and ground</h3>
  ${row([
    fig(character({ who, ...KIT, view: 'bust', back: CREAM, size: 132 }), 'bust, light'),
    fig(character({ who, ...KIT, view: 'bust', back: DARK, dark: true, mood: 'found', size: 132 }), 'bust, dark'),
    fig(character({ who, ...KIT, view: 'bust', back: LIME, mood: 'happy', size: 132 }), 'bust, lime'),
    ...[120, 60, 29, 16].map((n) => fig(character({ who, hat: true, view: 'eyes', size: n }), `icon ${n}`)),
  ])}
  <h3>Sizes</h3>
  ${row([88, 40, 28].map((n) => fig(character({ who, ...KIT, view: 'bust', back: CREAM, size: n }), String(n))))}
</section>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gazecraft characters</title>
<style>
  :root { --bg: #f6f6f7; --fg: #111113; --muted: #55555c; --line: #d6d6db; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0d0d0e; --fg: #ededee; --muted: #a1a1a8; --line: #2a2a2f; } }
  :root[data-theme="dark"] { --bg: #0d0d0e; --fg: #ededee; --muted: #a1a1a8; --line: #2a2a2f; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 500 16px/1.5 Manrope, system-ui, "Segoe UI", sans-serif; }
  main { max-width: 1120px; margin: 0 auto; padding: 40px 16px 96px; }
  h1 { font-size: clamp(28px, 5vw, 44px); line-height: 1.05; margin: 0 0 6px; font-weight: 800; letter-spacing: -0.02em; }
  h2 { font-size: 24px; margin: 0; font-weight: 800; }
  h3 { font-size: 13px; margin: 22px 0 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
  p { margin: 0; }
  .sub { color: var(--muted); }
  section { margin-top: 48px; padding-top: 28px; border-top: 1px solid var(--line); }
  .row { display: flex; flex-wrap: wrap; gap: 14px 20px; align-items: flex-end; }
  figure { margin: 0; text-align: center; }
  svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
  .tile svg { background: #f1ece2; border-radius: 16px; padding: 8px; box-sizing: content-box; }
  figcaption { margin-top: 6px; font-size: 13px; color: var(--muted); }
  code { font-size: 14px; }
</style>
</head>
<body>
<main>
<h1>Characters</h1>
<p class="sub">The parts. Who each one is, and when to use which, is in the brand guide (<code>design/brand/index.html</code>). Built from parts. Any character, mood, dress and view combine: <code>character({ who, mood, hat, coat, glass, monocle, view, flip, dark })</code> in <code>characters.ts</code>.</p>
${row(WHO.map((who) => fig(character({ who, ...KIT, glass: true, size: 190 }), CAST[who].called)), true)}
${WHO.map(section).join('\n')}
</main>
</body>
</html>
`;
writeFileSync(join(here, 'index.html'), html);
console.log(`wrote index.html and ${files} svg files`);
