import { MAP_H, MAP_W, PLACE_IDS, PLACES } from './world';

describe('the places of Lantern Row', () => {
  it('holds every place on the plan, and every place away from it at an edge', () => {
    for (const id of PLACE_IDS) {
      const p = PLACES[id] as { at: readonly [number, number]; edge?: string };
      const [x, y] = p.at;
      expect(x >= 0 && x <= MAP_W && y >= 0 && y <= MAP_H).toBe(true);
      if (p.edge) expect(x < 40 || x > MAP_W - 40).toBe(true);
    }
  });
});
