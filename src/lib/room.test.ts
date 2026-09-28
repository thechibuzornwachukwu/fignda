import { rankRoom, type Row } from './room';

const r = (name: string, finds: number, pace: number, hints: number): Row => ({ id: name, name, finds, pace, hints });

describe('room scoreboard', () => {
  it('most words first, then fastest per word, then fewest hints', () => {
    const order = rankRoom([r('slow', 3, 40, 0), r('most', 5, 60, 3), r('fast', 3, 20, 2), r('fastFewer', 3, 20, 1), r('none', 0, 0, 0)]);
    expect(order.map((x) => x.name)).toEqual(['most', 'fastFewer', 'fast', 'slow', 'none']);
  });

  it('a player with no finds never outranks one with finds on pace', () => {
    expect(rankRoom([r('zero', 0, 0, 0), r('one', 1, 90, 5)])[0]!.name).toBe('one');
  });
});
