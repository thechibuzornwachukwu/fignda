import { toChars } from './text';
import { wordRuns } from './wordRuns';

describe('wordRuns', () => {
  it('splits on spaces and punctuation and numbers the letter stream', () => {
    const runs = wordRuns(toChars('Pat omitted, nothing.').chars);
    expect(runs.map((r) => [r.text, r.a, r.b])).toEqual([
      ['pat', 0, 2],
      ['omitted', 3, 9],
      ['nothing', 10, 16],
    ]);
  });

  it('keeps an apostrophe inside its word, and drops a quote at the edge', () => {
    expect(wordRuns(toChars("we don't 'know'").chars).map((r) => r.text)).toEqual(['we', 'dont', 'know']);
  });

  it('is empty with no letters', () => {
    expect(wordRuns(toChars(' 12 ... ').chars)).toEqual([]);
  });
});
