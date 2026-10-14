import gamesFile from '../../data/games.json';
import { answerDepth, joinsOf } from './depth';
import { buildHiddenWords } from './hiddenWords';
import { readPast, revealParts } from './reveal';
import { toChars } from './text';

const games = (gamesFile as unknown as { games: Array<{ id: string; text: string; dict: string[] }> }).games;
const bible = buildHiddenWords(games.find((g) => g.id === 'bible')!);
const answer = (key: string) => bible.answers.find((a) => a.key === key)!;

const spanIn = (text: string, word: string) => {
  const { chars, S } = toChars(text);
  const i = S.indexOf(word);
  return { chars, span: [i, i + word.length - 1] as [number, number] };
};

describe('joinsOf', () => {
  it.each([
    ['Pat omitted nothing', 'atom', 1],
    ['is a most remarkable', 'amos', 1],
    ['Luca, I rode home', 'cairo', 2],
    ['a chrome bumper', 'rome', 0],
    // Several marks between the same two letters are one join.
    ['he ran... domestic', 'random', 1],
    // An apostrophe is inside a word.
    ["we don't know", 'ont', 0],
    ['a well-known tale', 'llk', 1],
    ['Go.\n\nLdfish', 'gold', 1],
  ])('%s hides %s across %i', (text, word, joins) => {
    const { chars, span } = spanIn(text, word);
    expect(joinsOf(chars, span)).toBe(joins);
  });

  it('a join at the edge of the span is not crossed', () => {
    const { chars, span } = spanIn('at a most odd', 'most');
    expect(joinsOf(chars, span)).toBe(0);
  });
});

describe('answerDepth', () => {
  it('reads the join count and the length from the puzzle', () => {
    expect(answerDepth(bible, answer('amos'))).toEqual({ joins: 1, length: 4 });
  });

  it('takes the shallowest place when a word hides twice', () => {
    const p = buildHiddenWords({ text: 'Pat omitted it. An atom is small.', dict: ['atom'] });
    expect(p.answers[0]!.spans).toHaveLength(2);
    expect(answerDepth(p, p.answers[0]!)).toEqual({ joins: 0, length: 4 });
  });

  it('holds for every answer in the catalogue', () => {
    for (const g of games) {
      const p = buildHiddenWords(g);
      for (const a of p.answers) {
        const d = answerDepth(p, a);
        expect(d.length, `${g.id} ${a.key}`).toBe(a.key.length);
        expect(d.joins, `${g.id} ${a.key}`).toBeGreaterThanOrEqual(0);
        expect(d.joins, `${g.id} ${a.key}`).toBeLessThan(a.key.length);
      }
    }
  });
});

describe('revealParts', () => {
  it.each([
    ['This is a most remarkable puzzle', 'amos', [['a mos', true], ['t', false]]],
    ['Pat omitted nothing', 'atom', [['P', false], ['at om', true], ['itted', false]]],
    ['"Luca, I rode home."', 'cairo', [['Lu', false], ['ca, I ro', true], ['de', false]]],
    ['Rome.', 'rome', [['Rome', true]]],
  ])('%s shows %s', (text, word, parts) => {
    const { chars, span } = spanIn(text, word);
    expect(revealParts(chars, span).map((p) => [p.text, p.hit])).toEqual(parts);
  });

  it('gives nothing for a span that is not in the text', () => {
    expect(revealParts(toChars('abc').chars, [5, 9])).toEqual([]);
  });

  it('the marked part spells the answer for every answer in the catalogue', () => {
    for (const g of games) {
      const p = buildHiddenWords(g);
      for (const a of p.answers) {
        const hit = revealParts(p.chars, a.spans[0]!).filter((x) => x.hit);
        expect(hit, `${g.id} ${a.key}`).toHaveLength(1);
        expect(hit[0]!.text.toLowerCase().replace(/[^a-z]/g, ''), `${g.id} ${a.key}`).toBe(a.key);
      }
    }
  });
});

describe('readPast', () => {
  const missed: Array<[number, number]> = [
    [10, 13],
    [40, 45],
  ];

  it('counts missed spans a selection ran across, in either direction', () => {
    expect(readPast([{ a: 8, b: 11 }], missed)).toBe(1);
    expect(readPast([{ a: 50, b: 44 }], missed)).toBe(1);
    expect(readPast([{ a: 0, b: 60 }], missed)).toBe(2);
  });

  it('counts a span once however many selections crossed it', () => {
    expect(readPast([{ a: 9, b: 12 }, { a: 10, b: 13 }, { a: 13, b: 20 }], missed)).toBe(1);
  });

  it('is 0 with no selections, no misses, or selections elsewhere', () => {
    expect(readPast([], missed)).toBe(0);
    expect(readPast([{ a: 0, b: 60 }], [])).toBe(0);
    expect(readPast([{ a: 14, b: 39 }], missed)).toBe(0);
  });
});
