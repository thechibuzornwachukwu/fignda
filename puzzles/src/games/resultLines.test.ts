import { createCopy, POOLS, type PoolKey } from '../copy';
import { buildHiddenWords } from '../engine/hiddenWords';
import { dailyPool, getPuzzle } from './catalog';
import { dayHidLine, playFacts, rareLine, recordLines, skillLines, starsUpLine, todayHoldsLine, type Picker } from './resultLines';

/** Always the first line of a pool. */
const first: Picker = (key, vars) => createCopy(() => 0).pick(key, vars);
/** Every line of every pool in turn, to catch one that does not fill. */
function everyLine(run: (pick: Picker) => string | string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pick: Picker = (key, vars) => createCopy(() => (i % POOLS[key].length) / POOLS[key].length).pick(key, vars);
    out.push(...[run(pick)].flat());
  }
  return out;
}
const BROKEN = /undefined|NaN|null|\{|\}|\b0%|^\s*$|\s{2}|^[.,:]| [.,:]/;
const poolOf = (line: string, key: PoolKey, vars: Record<string, string | number>) =>
  POOLS[key].some((t) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k])) === line);

const small = buildHiddenWords({ text: 'Pat omitted a most odd note.', dict: ['atom', 'amos'] });
const long = buildHiddenWords({ text: 'We saw an extra ordinary thing, a most odd one.', dict: ['extraordinary', 'amos'] });
const deep = buildHiddenWords({ text: 'Oh, I go, a tot of fun, a most odd day.', dict: ['igoat', 'amos'] });
const found = (...keys: string[]) => keys.map((key) => ({ key, label: key.toUpperCase() }));

describe('playFacts', () => {
  it('finds the longest and the deepest of your own finds', () => {
    const f = playFacts(long, found('amos', 'extraordinary'), 0, 0);
    expect(f.longest).toEqual({ word: 'EXTRAORDINARY', len: 13 });
    expect(f.skills).toMatchObject({ longWord: true, cleanRead: true });
    expect(playFacts(deep, found('igoat'), 0, 0).deepest).toEqual({ word: 'IGOAT', joins: 3 });
  });

  it('0 found: nothing is longest or deepest and no skill is shown', () => {
    expect(playFacts(long, [], 0, 0)).toEqual({
      skills: { cleanRead: false, longWord: false, deepFind: false, noHintPerfect: false },
      longest: null,
      deepest: null,
    });
  });

  it("leaves out a teammate's finds and keys that are not answers", () => {
    const f = playFacts(long, [{ key: 'extraordinary', label: 'EXTRAORDINARY', by: 'Ada' }, ...found('amos', 'zebra')], 0, 0);
    expect(f.longest).toEqual({ word: 'AMOS', len: 4 });
    expect(f.skills).toMatchObject({ longWord: false, cleanRead: false, noHintPerfect: false });
  });
});

describe('skillLines', () => {
  const lines = (p: typeof small, keys: string[], wrongs = 0, hints = 0) => skillLines(playFacts(p, found(...keys), wrongs, hints), first);

  it('a clean read on a plain puzzle is 1 line', () => {
    expect(lines(small, ['atom', 'amos'])).toEqual([POOLS.cleanRead[0]]);
  });

  it('a wrong pick turns the clean read into a no-hint perfect, a hint removes both', () => {
    expect(lines(small, ['atom', 'amos'], 1)).toEqual([POOLS.skillNoHint[0]]);
    expect(lines(small, ['atom', 'amos'], 0, 1)).toEqual([]);
  });

  it('names the long word and its letters, the deep word and the words it runs across', () => {
    expect(lines(long, ['extraordinary'], 0, 1)).toEqual(['EXTRAORDINARY. 13 letters, and you saw it.']);
    expect(lines(deep, ['igoat'], 0, 1)).toEqual(['IGOAT ran across 4 words. You followed it.']);
  });

  it('never stacks more than 2, rarest first', () => {
    const both = buildHiddenWords({
      text: 'Oh, I go, a tot of fun. We saw an extra ordinary thing.',
      dict: ['igoat', 'extraordinary'],
    });
    const all = lines(both, ['igoat', 'extraordinary']);
    expect(all).toEqual([POOLS.cleanRead[0], 'IGOAT ran across 4 words. You followed it.']);
    expect(lines(both, ['igoat', 'extraordinary'], 0, 2)).toEqual([
      'IGOAT ran across 4 words. You followed it.',
      'EXTRAORDINARY. 13 letters, and you saw it.',
    ]);
  });

  it('a puzzle with no long or deep word, 0 found, or ended at once: no lines', () => {
    expect(lines(small, ['atom'])).toEqual([]);
    expect(lines(small, [])).toEqual([]);
    expect(lines(long, [])).toEqual([]);
    expect(skillLines(playFacts(buildHiddenWords({ text: 'Nothing here.', dict: [] }), [], 0, 0), first)).toEqual([]);
  });

  it('a long word that was missed is not yours', () => {
    expect(lines(long, ['amos'])).toEqual([]);
  });
});

describe('starsUpLine', () => {
  it('is said only when the stars went up', () => {
    expect(starsUpLine(3, true, first)).toBe('New best here: 3 of 3 stars.');
    expect(starsUpLine(1, true, first)).toBe('New best here: 1 of 3 stars.');
    expect(starsUpLine(2, false, first)).toBe('');
  });

  it.each([0, 4, -1, NaN, 1.5])('%s stars is no line', (n) => {
    expect(starsUpLine(n, true, first)).toBe('');
  });
});

describe('dayHidLine', () => {
  const sized = (n: number) =>
    buildHiddenWords({ text: 'Pat omitted a most odd note, a cat sat.', dict: ['atom', 'amos', 'cats', 'stod'].slice(0, n) });

  it('sets today against a usual day', () => {
    const [two, three, four] = [sized(2), sized(3), sized(4)];
    expect([two, three, four].map((p) => p.answers.length)).toEqual([2, 3, 4]);
    expect(dayHidLine(four, [two, three, four], first)).toBe('Today hid 4. Most days hide 3.');
    expect(dayHidLine(three, [two, three, four], first)).toBe('Today hid 3. That is a usual day.');
  });

  it('counts today as one of the days when the pool does not hold it', () => {
    const [two, three, four] = [sized(2), sized(3), sized(4)];
    expect(dayHidLine(four, [two, three], first)).toBe('Today hid 4. Most days hide 3.');
  });

  it('a pool too small for a usual count is no line', () => {
    const [two, four] = [sized(2), sized(4)];
    expect(dayHidLine(four, [], first)).toBe('');
    expect(dayHidLine(four, [four], first)).toBe('');
    expect(dayHidLine(four, [two, four], first)).toBe('');
    expect(dayHidLine(four, [two], first)).toBe('');
  });

  it('a day that hides nothing is no line', () => {
    const none = buildHiddenWords({ text: 'Nothing here.', dict: [] });
    expect(dayHidLine(none, [sized(2), sized(3), none], first)).toBe('');
    expect(dayHidLine(sized(2), [none, none, none], first)).toBe('');
  });

  it('every daily in the catalogue gets a whole line', () => {
    const pool = dailyPool.map((id) => getPuzzle(id)!);
    for (const p of pool) {
      const line = dayHidLine(p, pool, first);
      expect(line).toMatch(/^Today hid \d+\. (Most days hide \d+|That is a usual day)\.$/);
    }
  });
});

describe('todayHoldsLine', () => {
  it('says what today holds, never how much, the deep one first', () => {
    expect(todayHoldsLine({ longWord: true, deepWord: false }, first)).toBe('Today hides a long one.');
    expect(todayHoldsLine({ longWord: false, deepWord: true }, first)).toBe('Today hides a deep one.');
    expect(todayHoldsLine({ longWord: true, deepWord: true }, first)).toBe('Today hides a deep one.');
    for (const k of ['todayLong', 'todayDeep'] as const) for (const l of POOLS[k]) expect(l).not.toMatch(/\d|\{/);
  });

  it('a puzzle with no long or deep word says nothing', () => {
    expect(todayHoldsLine({ longWord: false, deepWord: false }, first)).toBe('');
  });
});

describe('rareLine', () => {
  it('says "Only" when half or fewer found it, and the share plainly above that', () => {
    expect(rareLine({ pct: 8 }, 'Habakkuk', first)).toBe('Only 8% found Habakkuk. You did.');
    expect(rareLine({ pct: 50 }, 'Amos', first)).toBe('Only 50% found Amos. You did.');
    expect(rareLine({ pct: 51 }, 'Amos', first)).toBe('Your rarest find: Amos. 51% of players found it.');
    expect(rareLine({ pct: 100 }, 'Amos', first)).toBe('Your rarest find: Amos. 100% of players found it.');
    for (const l of POOLS.rarestFind) expect(l).not.toMatch(/only/i);
  });

  it('no stats, no word or a share that is not one: no line at all', () => {
    expect(rareLine(null, 'Amos', first)).toBe('');
    expect(rareLine({ pct: 8 }, undefined, first)).toBe('');
    expect(rareLine({ pct: 8 }, null, first)).toBe('');
    expect(rareLine({ pct: 8 }, ' ', first)).toBe('');
    expect(rareLine({ pct: 0 }, 'Amos', first)).toBe('');
    expect(rareLine({ pct: NaN }, 'Amos', first)).toBe('');
    expect(rareLine({ pct: 140 }, 'Amos', first)).toBe('');
    expect(rareLine({} as never, 'Amos', first)).toBe('');
  });
});

describe('recordLines', () => {
  it('gives each new record its own line', () => {
    expect(recordLines([{ kind: 'clean', pack: 'Bible', secs: 75 }], first)).toEqual(['Your fastest clean read in Bible: 1:15.']);
    expect(recordLines([{ kind: 'daily', found: 11 }], first)).toEqual(['11 found. Your most in a daily.']);
    expect(recordLines([{ kind: 'long', word: 'Deuteronomy', len: 11 }], first)).toEqual(['Deuteronomy. Your longest find yet, 11 letters.']);
  });

  it('shows 2 at most: clean read, then the daily, then the word', () => {
    const all = recordLines([{ kind: 'long', word: 'Amos', len: 4 }, { kind: 'daily', found: 9 }, { kind: 'clean', pack: 'Bible', secs: 5 }], first);
    expect(all).toEqual(['Your fastest clean read in Bible: 0:05.', '9 found. Your most in a daily.']);
  });

  it('no records, or records with holes in them: no lines', () => {
    expect(recordLines([], first)).toEqual([]);
    expect(
      recordLines(
        [
          { kind: 'clean', pack: '', secs: 5 },
          { kind: 'clean', pack: 'Bible', secs: NaN },
          { kind: 'daily', found: 0 },
          { kind: 'daily', found: undefined as never },
          { kind: 'long', word: '', len: 4 },
          { kind: 'long', word: 'Amos', len: NaN },
        ],
        first,
      ),
    ).toEqual([]);
  });
});

describe('no line is ever half filled', () => {
  it('every wording of every pool fills, for every helper', () => {
    const lines = everyLine((pick) => [
      ...skillLines(playFacts(long, found('amos', 'extraordinary'), 0, 0), pick),
      ...skillLines(playFacts(deep, found('igoat', 'amos'), 2, 0), pick),
      ...skillLines(playFacts(deep, found('igoat'), 0, 1), pick),
      starsUpLine(1, true, pick),
      starsUpLine(3, true, pick),
      dayHidLine(getPuzzle(dailyPool[0]!)!, dailyPool.map((id) => getPuzzle(id)!), pick),
      todayHoldsLine({ longWord: true, deepWord: false }, pick),
      todayHoldsLine({ longWord: false, deepWord: true }, pick),
      rareLine({ pct: 1 }, 'Habakkuk', pick),
      rareLine({ pct: 100 }, 'Amos', pick),
      ...recordLines([{ kind: 'clean', pack: 'Bible', secs: 0 }, { kind: 'daily', found: 1 }], pick),
      ...recordLines([{ kind: 'long', word: 'Amos', len: 4 }], pick),
    ]);
    expect(lines.length).toBeGreaterThan(36);
    for (const l of lines) expect(l, l).not.toMatch(BROKEN);
  });

  it('the pools the helpers use carry only the values they are given', () => {
    const used: Record<string, string[]> = {
      starsUp: ['n'], skillNoHint: [], skillDeep: ['w', 'n'], skillLong: ['w', 'n'], dayHid: ['n', 'm'],
      dayHidSame: ['n'], todayLong: [], todayDeep: [], rareFind: ['p', 'w'], rarestFind: ['p', 'w'], recordClean: ['w', 't'],
      recordDaily: ['n'], recordLong: ['w', 'n'], cleanRead: [],
    };
    for (const [key, vars] of Object.entries(used)) {
      for (const line of POOLS[key as PoolKey]) {
        for (const m of line.matchAll(/\{(\w+)\}/g)) expect(vars, `${key}: ${line}`).toContain(m[1]);
      }
    }
    expect(poolOf('New best here: 2 of 3 stars.', 'starsUp', { n: 2 })).toBe(true);
  });
});
