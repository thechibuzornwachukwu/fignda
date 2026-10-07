import { MARK, shareText, storyMarks } from './shareText';

const F = MARK.find;
const M = MARK.miss;
const H = MARK.hint;

describe('text result', () => {
  it('tells the game in order: finds, misses and hints by time', () => {
    const marks = storyMarks(
      [
        { a: 10, b: 13, t: 1000 }, // find
        { a: 40, b: 30, t: 2000 }, // miss (dragged backwards)
        { a: 23, b: 20, t: 4000 }, // find, dragged backwards
        { a: 5, b: 6, t: 4500 }, // 2 letters: never a guess
      ],
      [3000],
      [[10, 13], [20, 23]],
    );
    expect(marks).toEqual([F, M, H, F]);
  });

  it('counts each answer once: picking a found word again is a miss', () => {
    expect(storyMarks([{ a: 1, b: 4, t: 1 }, { a: 1, b: 4, t: 2 }], [], [[1, 4]])).toEqual([F, M]);
  });

  it('a puzzle prints the total, rows of 10, and the link last', () => {
    const t = shareText({ title: 'Books of the Bible', found: 12, total: 30, secs: 161, score: 1420, marks: Array(12).fill(F), url: 'https://x.test/play/bible?vs=ada' });
    expect(t.split('\n')).toEqual(['Fignda · Books of the Bible', '12/30 · 2:41 · 1,420', F.repeat(10), F.repeat(2), 'Beat it: https://x.test/play/bible?vs=ada']);
  });

  it('a daily never prints the total or anything about the words', () => {
    const t = shareText({ title: 'Nigerian names', daily: 281, found: 18, total: 26, secs: 95, score: 900, marks: [F, M], url: 'https://x.test/d/281' });
    expect(t).toContain('Fignda Daily #281\n18 found · 1:35 · 900');
    expect(t).not.toMatch(/26|Nigerian|names/);
    expect(t).not.toMatch(/[!—]/);
  });

  it('long games are capped at 40 marks', () => {
    const t = shareText({ title: 'x', found: 1, total: 2, secs: 1, score: 1, marks: Array(90).fill(M), url: 'u' });
    expect(t.split('\n')).toHaveLength(2 + 4 + 1);
  });
});
