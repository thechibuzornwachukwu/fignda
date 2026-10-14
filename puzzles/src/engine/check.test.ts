import { getPuzzle } from '../games/catalog';
import { check, isClose } from './check';

const bible = getPuzzle('bible')!;
const at = (word: string) => {
  const i = bible.S.indexOf(word);
  return [i, i + word.length - 1] as const;
};

describe('check', () => {
  it('"a most" is Amos', () => {
    const [a, b] = at('amost');
    const r = check(bible, a, a + 3, new Set());
    expect(r).toMatchObject({ kind: 'hit', answer: { key: 'amos', label: 'Amos' } });
    expect(b).toBeGreaterThan(a);
  });

  it('accepts either direction', () => {
    const [a, b] = at('amos');
    expect(check(bible, b, a, new Set()).kind).toBe('hit');
  });

  it('reports already found', () => {
    const [a, b] = at('amos');
    expect(check(bible, a, b, new Set(['amos'])).kind).toBe('already');
  });

  it('ignores selections under 3 letters', () => {
    expect(check(bible, 0, 0, new Set()).kind).toBe('ignore');
    expect(check(bible, 0, 1, new Set()).kind).toBe('ignore');
  });

  it('flags 3+ letter misses as wrong with the string', () => {
    expect(check(bible, 0, 2, new Set())).toEqual({ kind: 'wrong', str: bible.S.slice(0, 3) });
  });
});

describe('isClose', () => {
  const keys = ['amos', 'job', 'judges'];
  it.each([
    ['amoz', true], // same length, one letter off
    ['amo', true], // one short at the end
    ['mos', true], // one short at the start
    ['amost', true], // one long at the end
    ['judge', true],
    ['udges', true],
    ['jugdes', false], // two letters off
    ['mo', false], // two short
    ['jox', false], // "job" is under 4 letters, never close
    ['abcd', false],
  ] as const)('%s -> %s', (sel, want) => {
    expect(isClose(sel, keys)).toBe(want);
  });
});
