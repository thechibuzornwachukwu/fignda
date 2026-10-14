import { buildHiddenWords } from './hiddenWords';
import { cleanReadOf, skillsOf } from './skill';

const key = (k: string) => ({ key: k });
const play = (puzzle: ReturnType<typeof buildHiddenWords>, found: string[], wrongs = 0, hints = 0) =>
  skillsOf({ puzzle, found: found.map(key), wrongs, hints });

const small = buildHiddenWords({ text: 'Pat omitted a most odd note.', dict: ['atom', 'amos'] });
const long = buildHiddenWords({ text: 'We saw an extra ordinary thing, a most odd one.', dict: ['extraordinary', 'amos'] });
const deep = buildHiddenWords({ text: 'Oh, I go, a tot of fun, a most odd day.', dict: ['igoat', 'amos'] });

describe('cleanReadOf', () => {
  it('needs every word, none from a teammate, no hint and no wrong pick', () => {
    expect(cleanReadOf({ found: [key('a'), key('b')], wrongs: 0, hints: 0 }, 2)).toBe(true);
    expect(cleanReadOf({ found: [key('a')], wrongs: 0, hints: 0 }, 2)).toBe(false);
    expect(cleanReadOf({ found: [key('a'), key('b')], wrongs: 1, hints: 0 }, 2)).toBe(false);
    expect(cleanReadOf({ found: [key('a'), key('b')], wrongs: 0, hints: 1 }, 2)).toBe(false);
    expect(cleanReadOf({ found: [key('a'), { key: 'b', by: 'Ada' }], wrongs: 0, hints: 0 }, 2)).toBe(false);
    expect(cleanReadOf({ found: [], wrongs: 0, hints: 0 }, 0)).toBe(false);
  });
});

describe('skillsOf', () => {
  it('a full play with no help is a clean read and a no-hint perfect', () => {
    expect(play(small, ['atom', 'amos'])).toMatchObject({ cleanRead: true, noHintPerfect: true });
  });

  it('a wrong pick costs the clean read but not the no-hint perfect', () => {
    expect(play(small, ['atom', 'amos'], 2)).toMatchObject({ cleanRead: false, noHintPerfect: true });
  });

  it('a hint costs both', () => {
    expect(play(small, ['atom', 'amos'], 0, 1)).toMatchObject({ cleanRead: false, noHintPerfect: false });
  });

  it('a missed word costs both', () => {
    expect(play(small, ['atom'])).toMatchObject({ cleanRead: false, noHintPerfect: false });
  });

  it('a long word counts only when it was found', () => {
    expect(long.answers.map((a) => a.key)).toContain('extraordinary');
    expect(play(long, ['extraordinary']).longWord).toBe(true);
    expect(play(long, ['amos']).longWord).toBe(false);
    expect(play(small, ['atom', 'amos']).longWord).toBe(false);
  });

  it('a deep find needs 3 joins', () => {
    expect(deep.answers.map((a) => a.key)).toContain('igoat');
    expect(play(deep, ['igoat']).deepFind).toBe(true);
    expect(play(deep, ['amos']).deepFind).toBe(false);
    expect(play(deep, []).deepFind).toBe(false);
  });

  it('nothing found, or an empty puzzle, earns nothing', () => {
    expect(play(small, [])).toEqual({ cleanRead: false, longWord: false, deepFind: false, noHintPerfect: false });
    expect(play(buildHiddenWords({ text: 'Nothing here.', dict: ['zebra'] }), [])).toEqual({
      cleanRead: false, longWord: false, deepFind: false, noHintPerfect: false,
    });
  });
});
