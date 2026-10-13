import { BADGES } from './notifications';
import { MEDAL_KINDS, medalsOf } from './medals';

const of = (codes: string[], counts = {}) => Object.fromEntries(medalsOf(codes, counts).map((m) => [m.key, m]));

describe('medals', () => {
  it('every badge the server can give is a tier of a medal, and every tier is a badge', () => {
    const tiers = MEDAL_KINDS.flatMap((k) => k.tiers.map((n) => k.code(n))).sort();
    expect(tiers).toEqual(BADGES.map((b) => b.code).sort());
  });

  it('nothing earned: 4 outlines, each showing its first tier', () => {
    const m = medalsOf([]);
    expect(m.map((x) => x.key)).toEqual(['run', 'cases', 'points', 'first']);
    expect(m.every((x) => x.tier === -1 && x.metal === null)).toBe(true);
    expect(m.map((x) => x.face)).toEqual(['7', '1', '1K', '1']);
    expect(m.map((x) => x.name)).toEqual(['7 day run', 'First case', '1K points', 'First step']);
  });

  it('a medal is worn at the highest tier earned, in the metal of that tier', () => {
    const m = of(['streak_7', 'streak_30', 'cases_1', 'points_1000', 'points_5000', 'points_10000', 'points_25000', 'points_50000', 'points_100000', 'first_game', 'perfect_daily', 'nope']);
    expect(m.run).toMatchObject({ tier: 1, metal: 'silver', face: '30', name: '30 day run' });
    expect(m.cases).toMatchObject({ tier: 0, metal: 'bronze', face: '1', name: 'First case' });
    // More tiers than metals: the last metal holds.
    expect(m.points).toMatchObject({ tier: 5, metal: 'onyx', face: '100K', name: '100K points' });
    expect(m.first).toMatchObject({ tier: 0, metal: 'bronze', name: 'First step' });
  });

  it('with a count it says how far to the next tier, and at the top tier there is nothing to count', () => {
    const m = of(['streak_7', 'points_100000'], { run: 12, cases: 0, points: 250000 });
    expect(m.run).toMatchObject({ progress: 12 / 30, toward: '12 of 30' });
    expect(m.cases).toMatchObject({ tier: -1, progress: 0, toward: '0 of 1' });
    expect(m.points).toMatchObject({ progress: null, toward: '' });
    expect(of([], { run: 99 }).run).toMatchObject({ progress: 1, toward: '7 of 7' });
    expect(of([], { run: Number.NaN }).run!.progress).toBeNull();
  });
});
