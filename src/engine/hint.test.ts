import { hintAnswer } from './hint';

const answers = [
  { key: 'amos', spans: [[2, 5]] },
  { key: 'job', spans: [[20, 22]] },
  { key: 'philemon', spans: [[40, 47]] },
  { key: 'acts', spans: [[60, 63]] },
] as const;
const none = new Set<string>();

describe('hintAnswer', () => {
  it('marks the first unfound answer unless told another way', () => {
    expect(hintAnswer(answers, none)?.key).toBe('amos');
    expect(hintAnswer(answers, new Set(['amos']))?.key).toBe('job');
  });

  it('marks the longest, the shortest, or the nearest to the last find', () => {
    expect(hintAnswer(answers, none, 'longest')?.key).toBe('philemon');
    expect(hintAnswer(answers, none, 'shortest')?.key).toBe('job');
    expect(hintAnswer(answers, new Set(['philemon']), 'near', 40)?.key).toBe('job');
    expect(hintAnswer(answers, new Set(['philemon', 'job']), 'near', 40)?.key).toBe('acts');
  });

  it('gives ties to the earlier one, and the first when there is no last find', () => {
    expect(hintAnswer(answers, new Set(['philemon', 'job']), 'longest')?.key).toBe('amos');
    expect(hintAnswer(answers, none, 'near', null)?.key).toBe('amos');
  });

  it('never marks a found answer, and has nothing to mark when all are found', () => {
    for (const kind of ['first', 'longest', 'shortest', 'near'] as const) {
      expect(hintAnswer(answers, new Set(['amos', 'job', 'philemon']), kind, 3)?.key).toBe('acts');
      expect(hintAnswer(answers, new Set(answers.map((a) => a.key)), kind, 3)).toBeNull();
    }
  });
});
