import gamesFile from '../../data/games.json';
import secretsFile from '../../data/secrets.json';
import { buildHiddenWords } from './hiddenWords';
import type { CatalogueItem } from './journey';
import { buildPath } from './journey';
import { caseSecrets, culpritOf, cutSecret, FALLBACK_SECRET, hashOf, PIECE_MAX, pieceSlots, revealSecret, SECRET_MIN, usableWords } from './secret';

const games = (gamesFile as unknown as { games: CatalogueItem[] }).games;
const things = (secretsFile as { things: string[] }).things;
const cases = buildPath(games).cases.map((c) => ({ id: c.id, clues: c.clues.length }));
const secrets = caseSecrets(cases, things);
const whole = (pieces: ReadonlyArray<{ at: number; text: string }>) =>
  [...pieces].sort((a, b) => a.at - b.at).map((p) => p.text).join('');

describe('the pool', () => {
  it('is single words in capitals, long enough, none twice', () => {
    expect(things.length).toBeGreaterThan(100);
    for (const w of things) expect(w).toMatch(/^[A-Z]{4,}$/);
    expect(new Set(things).size).toBe(things.length);
    expect(usableWords(things)).toEqual(things);
  });

  it('drops what is not a word', () => {
    expect(usableWords(['bell', ' Drum ', 'BELL', 'ab', 'two words', 'café', 7, null, ''])).toEqual(['BELL', 'DRUM']);
  });
});

describe('caseSecrets, against the catalogue', () => {
  it('every case has a secret from the pool, and no 2 cases share one', () => {
    expect(secrets.size).toBe(games.length);
    const words = [...secrets.values()].map((s) => s.word);
    for (const w of words) expect(things).toContain(w);
    expect(new Set(words).size).toBe(words.length);
  });

  it('every clue gives a piece, the pieces are the word and nothing else, and none gives the word away', () => {
    for (const c of cases) {
      const s = secrets.get(c.id)!;
      expect(s.pieces).toHaveLength(c.clues);
      expect(whole(s.pieces)).toBe(s.word);
      expect(s.pieces.flatMap(pieceSlots).sort((a, b) => a - b)).toEqual([...s.word].map((_, i) => i));
      for (const p of s.pieces) {
        expect(p.text.length).toBeGreaterThanOrEqual(1);
        expect(p.text.length).toBeLessThanOrEqual(PIECE_MAX);
        expect(s.word.slice(p.at, p.at + p.text.length)).toBe(p.text);
      }
      expect(s.word.length).toBeGreaterThanOrEqual(SECRET_MIN);
    }
  });

  it('is the same every time, whatever order the cases arrive in', () => {
    expect(caseSecrets(cases, things)).toEqual(secrets);
    expect(caseSecrets([...cases].reverse(), things)).toEqual(secrets);
  });

  it('a puzzle whose text changes keeps its secret: only the id and the count of clues are read', () => {
    const edited = games.map((g, i) => (i === 0 ? { ...g, text: g.text.replace(/\.$/, '') + '. One more sentence, hiding nothing.' } : g));
    const again = buildPath(edited).cases.map((c) => ({ id: c.id, clues: c.clues.length }));
    expect(again.find((c) => c.id === games[0]!.id)!.clues).toBe(cases.find((c) => c.id === games[0]!.id)!.clues);
    expect(caseSecrets(again, things)).toEqual(secrets);
    // And the hidden words play no part at all.
    expect(buildHiddenWords(edited[0]!).answers.length).toBeGreaterThan(0);
  });

  it('a case whose count of clues changes still has a whole secret, and the other cases keep theirs', () => {
    const id = cases[0]!.id;
    for (const clues of [1, 2, 5, 9]) {
      const changed = caseSecrets(cases.map((c) => (c.id === id ? { ...c, clues } : c)), things);
      const s = changed.get(id)!;
      expect(s.pieces).toHaveLength(clues);
      expect(whole(s.pieces)).toBe(s.word);
      for (const c of cases) if (c.id !== id && changed.get(c.id)!.word !== s.word && secrets.get(id)!.word !== changed.get(c.id)!.word) expect(changed.get(c.id)).toEqual(secrets.get(c.id));
    }
  });
});

describe('caseSecrets, edge cases', () => {
  it('no cases, no secrets', () => {
    expect(caseSecrets([], things).size).toBe(0);
  });

  it('an empty or broken pool falls back to one word, so a case is never without a secret', () => {
    for (const pool of [[], ['ab', 3, null]]) {
      const s = caseSecrets([{ id: 'a', clues: 3 }], pool).get('a')!;
      expect(s.word).toBe(FALLBACK_SECRET);
      expect(whole(s.pieces)).toBe(FALLBACK_SECRET);
    }
  });

  it('more cases than words: words repeat, and every case still has one', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, clues: 2 }));
    const s = caseSecrets(many, ['BELL', 'DRUM']);
    expect(s.size).toBe(5);
    expect(new Set([...s.values()].map((x) => x.word))).toEqual(new Set(['BELL', 'DRUM']));
  });

  it('more clues than any word has letters: the longest word, empty pieces, and the unmasking still gives one', () => {
    const s = caseSecrets([{ id: 'long', clues: 9 }], ['BELL', 'CROWN']).get('long')!;
    expect(s.word).toBe('CROWN');
    expect(s.pieces).toHaveLength(9);
    expect(whole(s.pieces)).toBe('CROWN');
    expect(s.pieces[8]!.text).not.toBe('');
  });

  it('a clue count that is not a count is 1', () => {
    for (const clues of [0, -3, Number.NaN, 1.9]) {
      const s = caseSecrets([{ id: 'x', clues }], things).get('x')!;
      expect(s.pieces).toHaveLength(1);
      expect(s.pieces[0]).toEqual({ at: 0, text: s.word });
    }
  });

  it('the same id twice is one case', () => {
    expect(caseSecrets([{ id: 'a', clues: 3 }, { id: 'a', clues: 4 }], things).size).toBe(1);
  });
});

describe('cutSecret', () => {
  it('cuts as even as it goes, in an order that comes from the seed alone', () => {
    const a = cutSecret('LANTERN', 3, 'bible');
    expect(a.map((p) => p.text.length).sort()).toEqual([2, 2, 3]);
    expect(cutSecret('LANTERN', 3, 'bible')).toEqual(a);
    const orders = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((seed) => cutSecret('LANTERN', 3, seed).map((p) => p.at).join()));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('revealSecret', () => {
  const s = { word: 'TROPHY', pieces: [{ at: 4, text: 'HY' }, { at: 0, text: 'TR' }, { at: 2, text: 'OP' }] };

  it('fills the slots of the pieces held, each in its true place', () => {
    expect(revealSecret(s, [])).toEqual(['', '', '', '', '', '']);
    expect(revealSecret(s, [true])).toEqual(['', '', '', '', 'H', 'Y']);
    expect(revealSecret(s, [true, false, true])).toEqual(['', '', 'O', 'P', 'H', 'Y']);
    expect(revealSecret(s, [true, true, true]).join('')).toBe('TROPHY');
  });

  it('ignores flags for clues the case does not have', () => {
    expect(revealSecret(s, [false, false, false, true, true])).toEqual(['', '', '', '', '', '']);
  });
});

describe('culpritOf', () => {
  it('is the same every time, inside the lists, and not the same for every case', () => {
    const all = cases.map((c) => culpritOf(c.id, 6, 14));
    all.forEach((k, i) => {
      expect(k).toEqual(culpritOf(cases[i]!.id, 6, 14));
      expect(k.seed).toBe(`culprit-${cases[i]!.id}`);
      expect(k.disguise).toBeGreaterThanOrEqual(0);
      expect(k.disguise).toBeLessThan(6);
      expect(k.who).toBeLessThan(14);
    });
    expect(new Set(all.map((k) => k.disguise)).size).toBeGreaterThan(2);
    expect(new Set(all.map((k) => k.who)).size).toBeGreaterThan(4);
  });

  it('empty lists give 0, never NaN', () => {
    expect(culpritOf('a', 0, 0)).toEqual({ seed: 'culprit-a', disguise: 0, who: 0 });
  });

  it('the hash is steady', () => {
    expect(hashOf('')).toBe(0x811c9dc5);
    expect(hashOf('bible')).toBe(hashOf('bible'));
    expect(hashOf('bible')).not.toBe(hashOf('bibel'));
  });
});
