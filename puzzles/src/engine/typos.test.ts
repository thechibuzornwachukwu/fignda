import { games, getPassage, getPuzzle, MIRROR_WORDS } from '../games/catalog';
import { evalTypos } from './evaluate';
import { TYPOS_N, typoSeed } from './journey';
import { seeded } from './seed';
import { toChars } from './text';
import { buildTypos, misspell, typoClue, TYPOS, wordsOf } from './typos';

describe('typo hunt', () => {
  it('splits words on anything that is not a letter', () => {
    expect(wordsOf(toChars("It's a bright-blue day.").chars).map((w) => w.text)).toEqual(['It', 's', 'a', 'bright', 'blue', 'day']);
  });

  it('a typo keeps the first and last letter and is never a real word', () => {
    const random = seeded(7);
    for (const w of ['garden', 'morning', 'yellow', 'kitchen', 'quietly']) {
      const t = misspell(w, random, MIRROR_WORDS)!;
      expect(t).not.toBe(w);
      expect(t[0]).toBe(w[0]);
      expect(t.at(-1)).toBe(w.at(-1));
      expect(MIRROR_WORDS.has(t)).toBe(false);
    }
  });

  it('every cut pack gets one, the same each time, with its typos where the answers say', () => {
    let made = 0;
    for (const g of games) {
      const p = getPuzzle(g.id)!;
      const clue = typoClue(p, MIRROR_WORDS, typoSeed(g.id));
      if (!clue) continue;
      made++;
      expect(typoClue(p, MIRROR_WORDS, typoSeed(g.id))).toEqual(clue);
      const built = buildTypos(clue);
      expect(built.answers).toHaveLength(TYPOS);
      for (const a of built.answers) {
        const [x, y] = a.spans[0]!;
        expect(evalTypos(built, x, y, new Set())).toMatchObject({ kind: 'hit', key: a.key });
        expect(evalTypos(built, x, y, new Set([a.key]))).toEqual({ kind: 'already' });
        expect(evalTypos(built, x, y - 1, new Set())).toEqual({ kind: 'close' });
      }
      expect(getPassage(g.id, TYPOS_N)?.def.type).toBe('typos');
    }
    // Nearly every pack is long enough for one.
    expect(made).toBeGreaterThan(games.length * 0.8);
  });

  it('a word spelled right is wrong', () => {
    const b = buildTypos({ text: 'The gardne was quiet.', dict: ['gardne=garden'] });
    expect(b.answers.map((a) => [a.key, a.label])).toEqual([['garden', 'Garden']]);
    expect(evalTypos(b, 0, 2, new Set())).toEqual({ kind: 'wrong' });
  });
});
