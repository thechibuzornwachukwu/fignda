import { readFileSync } from 'node:fs';
import { ANCHORS, PLACE_IDS } from '../engine/world';
import { drawStreet, moonPhase, sunAt } from './street';

// The 30 degree map of the street (BUILD_PLAN set 1-map), drawn from the plan.
describe('the street at 30 degrees', () => {
  const day = drawStreet({ hour: 15 });

  it('pins every place inside the picture', () => {
    for (const id of PLACE_IDS) {
      const [x, y] = day.places[id];
      expect(x >= 0 && x <= day.width && y >= 0 && y <= day.height).toBe(true);
    }
  });

  it('has every shape a season dresses', () => {
    const anchors = new Set(day.shapes.map((s) => s.anchor).filter(Boolean));
    // The library's door faces the street, away from this view: its step is in the plan only.
    for (const a of ANCHORS.filter((a) => a !== 'door-library')) expect(anchors).toContain(a);
  });

  it('the sun rises at 6, is highest at noon and sets at 18', () => {
    expect(sunAt(5).up).toBe(false);
    expect(sunAt(12).elevation).toBeGreaterThan(sunAt(8).elevation);
    expect(sunAt(19).up).toBe(false);
  });

  it('the moon goes new, half, full, half and new over 29 and a half days', () => {
    const at = (days: number) => moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14) + days * 86_400_000));
    expect(at(0)).toBeCloseTo(0, 2);
    expect(at(7.38)).toBeCloseTo(0.25, 2);
    expect(at(14.77)).toBeCloseTo(0.5, 2);
    expect(at(22.15)).toBeCloseTo(0.75, 2);
  });

  it('weather that falls comes from cloud: no sun, moon or stars', () => {
    for (const weather of ['rain', 'fog', 'snow', 'storm', 'flood'] as const) {
      const cls = new Set(drawStreet({ hour: 12, weather }).shapes.map((s) => s.cls));
      expect(cls.has('f-sun') || cls.has('f-moon') || cls.has('f-star')).toBe(false);
    }
  });

  it('the sketch is the module, rendered', () => {
    const sketch = readFileSync('design/sketches/map/the-street-iso.html', 'utf8');
    expect(sketch).toContain(`viewBox="0 0 ${day.width} ${day.height}"`);
    expect(sketch.match(/<(polygon|circle|ellipse|line|path|text)\b/g)!.length).toBe(day.shapes.length + PLACE_IDS.length);
  });

  it('the street carries its name on its signs, and each front door its number', () => {
    const words = day.shapes.filter((s) => s.tag === 'text').map((s) => s.text);
    expect(words.filter((w) => w === 'Lantern Row')).toHaveLength(2);
    expect(words).toEqual(expect.arrayContaining(['1', '3', '5']));
  });
});
