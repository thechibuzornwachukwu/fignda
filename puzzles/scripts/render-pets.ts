// Writes public/pets: each pet the game ships, as a head and shoulders portrait in each mood.
// Run: npm run pets:render. The drawings come from design/characters; this only picks what the app uses.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { character, CREAM, MOODS, OUTFITS, type Who } from '../design/characters/characters';
import { outfitSlug, PARTNERS } from '../src/engine/partners';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pets');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let files = 0;
for (const p of PARTNERS) {
  const base = { who: p.id as Who, view: 'bust', back: CREAM, size: 240 } as const;
  // Bond tiers (BOND_AT in the engine): plain, a scarf at 3 packs together, its gold pin at 10 (BUILD_PLAN set 7n).
  const tiers = [{ tag: '', dress: {} }, { tag: '-1', dress: { scarf: true } }, { tag: '-2', dress: { scarf: true, pin: true } }];
  // Outfits (set 7m), each over every tier. File names: ID-MOOD[-TIER][-OUTFIT].svg (partnerSrc in the engine).
  const outfits = [{ tag: '', outfit: undefined }, ...OUTFITS.map((o) => ({ tag: `-${outfitSlug(o)}`, outfit: o }))];
  for (const t of tiers) {
    for (const o of outfits) {
      for (const mood of MOODS) {
        writeFileSync(join(out, `${p.id}-${mood}${t.tag}${o.tag}.svg`), character({ ...base, ...t.dress, outfit: o.outfit, mood }));
        files++;
      }
      writeFileSync(join(out, `${p.id}-wave${t.tag}${o.tag}.svg`), character({ ...base, ...t.dress, outfit: o.outfit, wave: true }));
      files++;
    }
  }
}
console.log(`${files} files in public/pets`);