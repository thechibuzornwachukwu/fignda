import { cameraFor } from './street3d';
import { focus, spotsOf } from './pins';
import { PLACE_IDS, PLACES } from '../engine/world';
import { chapters } from '../games/chapters';

describe('the pins on the street', () => {
  it('puts every case inside the picture, none on top of another', () => {
    const spots = spotsOf(cameraFor('iso', 16 / 10, 0), chapters.map((c) => PLACES[c.where].at));
    for (const s of spots) expect(s.left >= 6 && s.left <= 94 && s.top >= 6 && s.top <= 94).toBe(true);
    for (const [i, a] of spots.entries()) for (const b of spots.slice(i + 1)) expect(Math.abs(a.left - b.left) >= 4 || Math.abs(a.top - b.top) >= 4).toBe(true);
  });

  it('on a phone, brings the open case to the middle', () => {
    for (const id of PLACE_IDS.filter((p) => !('edge' in PLACES[p]))) {
      const camera = cameraFor('iso', 4 / 5, 0);
      focus(camera, PLACES[id].at, 1.3);
      const [s] = spotsOf(camera, [PLACES[id].at], 0);
      expect(Math.abs(s!.left - 50)).toBeLessThan(12);
      expect(Math.abs(s!.top - 50)).toBeLessThan(20);
    }
  });
});
