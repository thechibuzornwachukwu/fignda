// Writes public/pets: each pet the game ships, as a head and shoulders portrait in each mood.
// Run: npm run pets:render. The drawings come from design/characters; this only picks what the app uses.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { character, CREAM, MOODS, type Who } from '../design/characters/characters';
import { PARTNERS } from '../src/engine/partners';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pets');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let files = 0;
for (const p of PARTNERS) {
  const base = { who: p.id as Who, view: 'bust', back: CREAM, size: 240 } as const;
  // Bond tiers (BOND_AT in the engine). No story: no hat, coat, glass or monocle, so every tier is drawn plain
  // until the pets have plain things of their own to gain (BUILD_PLAN set 7).
  const tiers = [{ tag: '', dress: {} }, { tag: '-1', dress: {} }, { tag: '-2', dress: {} }];
  for (const t of tiers) {
    for (const mood of MOODS) {
      writeFileSync(join(out, `${p.id}-${mood}${t.tag}.svg`), character({ ...base, ...t.dress, mood }));
      files++;
    }
    writeFileSync(join(out, `${p.id}-wave${t.tag}.svg`), character({ ...base, ...t.dress, wave: true }));
    files++;
  }
}
console.log(`${files} files in public/pets`);