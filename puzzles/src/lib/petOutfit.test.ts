// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MOOD, PARTNERS, partnerSrc, PET_OUTFITS } from '../engine/partners';
import { loadOutfit, OUTFIT_NEEDS, wearOutfit } from './petOutfit';

beforeEach(() => localStorage.clear());

describe('pet outfits', () => {
  it('none to start; one worn is kept; off again is none; anything stored that is not an outfit is none', () => {
    expect(loadOutfit()).toBeNull();
    wearOutfit('beanie');
    expect(loadOutfit()).toBe('beanie');
    wearOutfit(null);
    expect(loadOutfit()).toBeNull();
    localStorage.setItem('gazecraft-pet-outfit', 'fedora');
    expect(loadOutfit()).toBeNull();
  });

  it('each outfit asks for something, and has a picture for every pet, mood and bond tier', () => {
    for (const o of PET_OUTFITS) expect(OUTFIT_NEEDS[o]).toBeDefined();
    const root = join(__dirname, '..', '..', 'public');
    for (const p of PARTNERS)
      for (const m of Object.keys(MOOD) as Array<keyof typeof MOOD>)
        for (const tier of [0, 1, 2])
          for (const o of [null, ...PET_OUTFITS]) expect(existsSync(join(root, partnerSrc(p.id, m, tier, o))), partnerSrc(p.id, m, tier, o)).toBe(true);
  });

  it('a picture name carries the tier and the outfit, and an unknown outfit is left out', () => {
    expect(partnerSrc('cat', 'done', 2, 'party hat')).toBe('/pets/cat-happy-2-party-hat.svg');
    expect(partnerSrc('dog', 'empty', 0, null)).toBe('/pets/dog-calm.svg');
    expect(partnerSrc('dog', 'empty', 0, 'cape' as never)).toBe('/pets/dog-calm.svg');
  });
});
