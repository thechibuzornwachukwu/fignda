import { evalSums } from './evaluate';
import { buildSums, runsTo, sumsClue, SUMS_LEVELS, sumsTarget } from './sums';

describe('buried sums', () => {
  it('finds every run of 2 or more digits that reaches the target', () => {
    expect(runsTo([3, 8, 4, 1, 6, 2, 7], 15)).toEqual([
      [0, 2],
      [4, 6],
    ]);
    expect(runsTo([9, 9], 9)).toEqual([]);
  });

  it('makes the same row for the same seed, and another for another', () => {
    expect(sumsClue('bible~21')).toEqual(sumsClue('bible~21'));
    expect(sumsClue('bible~21').text).not.toBe(sumsClue('lagos~21').text);
  });

  it.each([0, 1, 2])('level %i hides exactly its count of runs, none sharing a digit, in digits 1 to 9', (level) => {
    for (let i = 0; i < 300; i++) {
      const def = sumsClue(`seed-${i}`, level);
      const p = buildSums(def);
      expect(p.S).toMatch(/^[1-9]+$/);
      expect(p.S.length).toBe(SUMS_LEVELS[level]!.digits);
      expect(p.answers.length).toBe(SUMS_LEVELS[level]!.runs);
      p.answers.forEach((a, k) => {
        const [x, y] = a.spans[0]!;
        expect([...p.S.slice(x, y + 1)].reduce((n, d) => n + Number(d), 0)).toBe(sumsTarget(def));
        if (k > 0) expect(x).toBeGreaterThan(p.answers[k - 1]!.spans[0]![1]);
      });
    }
  });

  it('builds a board: digits carry an index, spaces point at their neighbours, answers read as sums', () => {
    const p = buildSums({ text: '3 8 4 1', dict: ['15'] });
    expect(p.S).toBe('3841');
    expect(p.chars[1]).toEqual({ ch: ' ', li: -1, prev: 0, next: 1 });
    expect(p.answers).toEqual([{ key: '0-2', label: '3 + 8 + 4', spans: [[0, 2]] }]);
  });

  it('takes the run itself in either direction, and nothing else', () => {
    const p = buildSums({ text: '3 8 4 1 6 2 7', dict: ['15'] });
    const none = new Set<string>();
    expect(evalSums(p, 2, 0, none)).toEqual({ kind: 'hit', key: '0-2', label: '3 + 8 + 4', span: [0, 2] });
    expect(evalSums(p, 0, 2, new Set(['0-2']))).toEqual({ kind: 'already' });
    expect(evalSums(p, 4, 4, none)).toEqual({ kind: 'ignore' });
    // One digit short or long at one end is a near miss. Anything else is wrong.
    expect(evalSums(p, 0, 1, none)).toEqual({ kind: 'close' });
    expect(evalSums(p, 0, 3, none)).toEqual({ kind: 'close' });
    expect(evalSums(p, 3, 6, none)).toEqual({ kind: 'close' });
    expect(evalSums(p, 1, 4, none)).toEqual({ kind: 'wrong' });
    expect(evalSums(p, 0, 1, new Set(['0-2']))).toEqual({ kind: 'wrong' });
  });
});
