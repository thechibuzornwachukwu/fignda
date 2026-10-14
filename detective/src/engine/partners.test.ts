import { DEFAULT_PARTNER, HINT_OF, MOOD, parsePartner, partnerName, partnerSrc, PARTNERS } from './partners';

describe('the pets', () => {
  it('are 4, in a fixed order, each with a name and a way of choosing what a tip-off marks', () => {
    expect(PARTNERS.map((p) => p.id)).toEqual(['cat', 'dino', 'dog', 'robot']);
    expect(PARTNERS.map((p) => partnerName(p.id))).toEqual(['Detective X', 'Detective Tobs', 'Detective Puff', 'Agent 404']);
    expect(Object.keys(HINT_OF).sort()).toEqual(['cat', 'dino', 'dog', 'robot']);
  });

  it('anything stored that is not a pet is the default pet', () => {
    expect(parsePartner('dog')).toBe('dog');
    for (const bad of [null, undefined, '', 'cow', 3, {}, ['cat']]) expect(parsePartner(bad)).toBe(DEFAULT_PARTNER);
  });

  it('each moment is a picture of its own mood', () => {
    expect(partnerSrc('robot', 'found')).toBe('/pets/robot-found.svg');
    expect(new Set(Object.values(MOOD)).size).toBe(Object.keys(MOOD).length);
  });
});
