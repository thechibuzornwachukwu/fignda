import { readFileSync } from 'node:fs';
import { ANCHORS, MAP_H, MAP_W, PLACE_IDS, PLACES } from './world';

// The map of the street (design/sketches/the-street.html) and the places the cases are pinned to stay the same.
const sketch = readFileSync('design/sketches/the-street.html', 'utf8');
const points = Object.fromEntries([...sketch.matchAll(/data-place="([^"]+)" cx="(\d+)" cy="(\d+)"/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));

describe('the map of Lantern Row', () => {
  it('marks every place where world.ts has it, and no other', () => {
    expect(Object.keys(points).sort()).toEqual([...PLACE_IDS].sort());
    for (const id of PLACE_IDS) expect(points[id]).toEqual([...PLACES[id].at]);
  });

  it('holds every place inside the drawing, and every place away from it at an edge', () => {
    for (const id of PLACE_IDS) {
      const p = PLACES[id] as { at: readonly [number, number]; edge?: string };
      const [x, y] = p.at;
      expect(x >= 0 && x <= MAP_W && y >= 0 && y <= MAP_H).toBe(true);
      if (p.edge) expect(x < 40 || x > MAP_W - 40).toBe(true);
    }
  });

  it('has every shape a season dresses', () => {
    for (const a of ANCHORS) expect(sketch).toContain(`data-anchor="${a}"`);
  });
});
