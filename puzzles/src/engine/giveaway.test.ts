import gamesFile from '../../data/games.json';
import { giveaways, readsBadly } from './giveaway';
import { buildHiddenWords } from './hiddenWords';

const build = (text: string, dict: string[]) => buildHiddenWords({ text, dict });

describe('giveaways: plain', () => {
  it('flags an answer that is also a whole word', () => {
    const p = build('Pat omitted a note. Then an atom fell.', ['atom']);
    expect(giveaways(p)).toEqual([{ kind: 'plain', key: 'atom' }]);
  });

  it('a hidden answer that appears only across a join is fine', () => {
    expect(giveaways(build('Pat omitted a note.', ['atom']))).toEqual([]);
  });

  it('an answer inside a longer word is not a whole word', () => {
    expect(giveaways(build('Pat omitted a chrome bumper.', ['rome', 'atom']))).toEqual([]);
  });

  it('does not mind capitals or an apostrophe word', () => {
    expect(giveaways(build("Atom, they said. Don't stop.", ['atom']))).toEqual([{ kind: 'plain', key: 'atom' }]);
  });
});

describe('giveaways: repeat', () => {
  const text = 'It is a most odd day. She has a mole. We keep a rare cat. He met a tiny dog.';
  it('flags a small word eaten by 3 answers', () => {
    const p = build(text, ['amos', 'amole', 'arare']);
    expect(p.answers).toHaveLength(3);
    expect(giveaways(p)).toEqual([{ kind: 'repeat', word: 'a', keys: ['amos', 'amole', 'arare'] }]);
  });

  it('2 uses of the same trick are allowed', () => {
    expect(giveaways(build(text, ['amos', 'amole']))).toEqual([]);
  });

  it('3 answers that each eat a different word are allowed', () => {
    const p = build('Pat omitted it. We saw an extra ordinary man go on.', ['atom', 'extraordinary', 'mango']);
    expect(p.answers).toHaveLength(3);
    expect(giveaways(p)).toEqual([]);
  });

  it('an answer inside one word eats nothing', () => {
    expect(giveaways(build('A chrome bumper, a chrome door, a chrome rim.', ['rome']))).toEqual([]);
  });
});

describe('readsBadly', () => {
  it('is false for an empty puzzle and true for any giveaway', () => {
    expect(readsBadly(build('Nothing here.', ['zebra']))).toBe(false);
    expect(readsBadly(build('An atom, an atom.', ['atom']))).toBe(true);
  });

  it('runs on the catalogue: these packs are clean, and the check does flag the ones that repeat a trick', () => {
    const { games } = gamesFile as unknown as { games: Array<{ id: string; text: string; dict: string[] }> };
    const flagged = (id: string) => giveaways(buildHiddenWords(games.find((g) => g.id === id)!));
    for (const id of ['science', 'history', 'space', 'fruits', 'animals', 'cities']) expect(flagged(id), id).toEqual([]);
    expect(flagged('eagles').some((x) => x.kind === 'repeat')).toBe(true);
  });
});
