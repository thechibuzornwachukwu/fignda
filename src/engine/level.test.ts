import { RANKS, rankOf, gapAt, levelFor } from './level';

describe('levelFor', () => {
  it('level 1 at 0, level 2 at 500', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, need: 500, rank: 'Rookie' });
    expect(levelFor(499)).toMatchObject({ level: 1, into: 499 });
    expect(levelFor(500)).toEqual({ level: 2, into: 0, need: 600, rank: 'Rookie' });
  });

  it('each gap is about 20% longer, in tidy tens', () => {
    expect([1, 2, 3, 4, 5].map(gapAt)).toEqual([500, 600, 720, 860, 1040]);
    for (let l = 1; l < 60; l++) {
      expect(gapAt(l) % 10).toBe(0);
      expect(gapAt(l + 1) / gapAt(l)).toBeGreaterThan(1.15);
      expect(gapAt(l + 1) / gapAt(l)).toBeLessThan(1.25);
    }
  });

  it('crosses a boundary exactly', () => {
    expect(levelFor(1099)).toMatchObject({ level: 2, into: 599 });
    expect(levelFor(1100)).toMatchObject({ level: 3, into: 0 });
  });

  it('climbs one level at a time and never goes backwards', () => {
    let last = 1;
    for (let p = 0; p < 200000; p += 37) {
      const { level, into, need } = levelFor(p);
      expect(level).toBeGreaterThanOrEqual(last);
      expect(level - last).toBeLessThanOrEqual(1);
      expect(into).toBeGreaterThanOrEqual(0);
      expect(into).toBeLessThan(need);
      last = level;
    }
  });

  it('ranks of 5 levels, the last one open ended', () => {
    expect([1, 5, 6, 10, 11, 16, 21, 25, 26, 99].map(rankOf)).toEqual([
      'Rookie', 'Rookie', 'Detective', 'Detective', 'Inspector', 'Chief', 'Chief', 'Chief', 'Chief', 'Chief',
    ]);
    expect(RANKS).toHaveLength(4);
  });

  it('treats bad input as 0 points', () => {
    for (const p of [-50, NaN, Infinity]) expect(levelFor(p).level).toBe(1);
    expect(levelFor(500.9).level).toBe(2);
  });
});
