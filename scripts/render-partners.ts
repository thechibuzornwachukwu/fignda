// Writes public/partners: each partner the game ships, as a head and shoulders portrait in each mood.
// Run: npm run partners:render. The drawings come from design/characters; this only picks what the app uses.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { character, CREAM, MOODS, type Who } from '../design/characters/characters';
import { PARTNERS } from '../src/engine/partners';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'partners');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let files = 0;
for (const p of PARTNERS) {
  const base = { who: p.id as Who, hat: true, coat: true, view: 'bust', back: CREAM, size: 240 } as const;
  for (const mood of MOODS) {
    writeFileSync(join(out, `${p.id}-${mood}.svg`), character({ ...base, mood }));
    files++;
  }
  writeFileSync(join(out, `${p.id}-wave.svg`), character({ ...base, wave: true }));
  files++;
}
console.log(`${files} files in public/partners`);