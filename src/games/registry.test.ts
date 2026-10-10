import { games } from './catalog';
import { FAMILIES, FAMILY_LABEL, familyOf, registry } from './registry';

describe('game families', () => {
  it('every registry type belongs to one of the 3 families, and each family has a name', () => {
    for (const mod of Object.values(registry)) expect(FAMILIES).toContain(mod.family);
    expect(FAMILIES.map((f) => FAMILY_LABEL[f])).toEqual(['Verbal', 'Quantitative', 'Non-verbal']);
  });

  it('hidden words is verbal, and so is every puzzle in the catalogue today', () => {
    expect(familyOf('hidden-words')).toBe('verbal');
    expect(new Set(games.map((g) => familyOf(g.type)))).toEqual(new Set(['verbal']));
  });
});
