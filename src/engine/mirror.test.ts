import mirrorFile from '../../data/mirrorWords.json';
import wordsFile from '../../data/words.json';
import { evalMirror, evalWords } from './evaluate';
import { buildHiddenWords } from './hiddenWords';
import { buildMirror, mirrorClue, mirrorWordsIn, reversed } from './mirror';

const WORDS = new Set(mirrorFile.words.split(' '));

describe('mirror', () => {
  it('reads by a list of real words, 4 to 7 letters, none the same both ways, none twice', () => {
    const real = new Set(wordsFile.words.split(' '));
    const list = mirrorFile.words.split(' ');
    expect(new Set(list).size).toBe(list.length);
    for (const w of list) {
      expect(real.has(w), w).toBe(true);
      expect(w.length, w).toBeGreaterThanOrEqual(4);
      expect(w.length, w).toBeLessThanOrEqual(7);
      expect(w, w).not.toBe(reversed(w));
    }
  });

  it('finds the words that read right to left, the longer of 2 that overlap, never one that reads both ways', () => {
    expect(mirrorWordsIn('godashtothestartab', WORDS)).toEqual(['rats']);
    // "spart" backwards is traps, which holds trap and part.
    expect(mirrorWordsIn('spartan', WORDS)).toEqual(['traps']);
    expect(mirrorWordsIn('level', WORDS)).toEqual([]);
  });

  it('builds a puzzle whose answers sit where the word reads backwards', () => {
    const p = buildMirror({ text: 'Go dash to the star, Tab.', dict: ['rats', 'bats', 'tiger'] });
    expect(p.answers).toEqual([{ key: 'rats', label: 'Rats', spans: [[11, 14]] }]);
  });

  it('takes the letters in either direction of the drag, and reads them right to left', () => {
    const p = buildMirror({ text: 'Go dash to the star, Tab.', dict: ['rats'] });
    const none = new Set<string>();
    expect(evalMirror(p, 14, 11, none)).toEqual({ kind: 'hit', key: 'rats', label: 'Rats', span: [11, 14] });
    expect(evalMirror(p, 11, 14, none)).toEqual({ kind: 'hit', key: 'rats', label: 'Rats', span: [11, 14] });
    expect(evalMirror(p, 11, 14, new Set(['rats']))).toEqual({ kind: 'already' });
    expect(evalMirror(p, 11, 13, none)).toEqual({ kind: 'close' });
    expect(evalMirror(p, 0, 5, none)).toEqual({ kind: 'wrong' });
    // The hidden-words rule does not take a backwards word.
    expect(evalWords(p, 11, 14, none)).toEqual({ kind: 'wrong' });
  });

  it('has no clue for a puzzle that is not cut, or with no list to read by', () => {
    expect(mirrorClue(buildHiddenWords({ text: 'Amos met Ruth at the star.', dict: ['amos', 'ruth'] }), WORDS)).toBeNull();
  });
});
