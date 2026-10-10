import { buildHiddenWords } from '../engine/hiddenWords';
import { passages } from '../engine/passages';
import { hasTabBar, isPuzzle } from '../lib/routes';
import { games, getGameDef, getPassage, getPuzzle } from './catalog';

describe('a passage as a game of its own', () => {
  it.each(games.map((g) => [g.id] as const))('%s: every passage is the same puzzle with the passage as its text', (id) => {
    const cut = passages(getPuzzle(id)!);
    for (let n = 1; n <= cut.length; n++) {
      const p = getPassage(id, n)!;
      expect(p.part).toEqual({ n, count: cut.length });
      expect(p.def).toMatchObject({ id, title: getGameDef(id)!.title, noun: getGameDef(id)!.noun, category: getGameDef(id)!.category, text: cut[n - 1]!.text });
      expect(buildHiddenWords(p.def).answers.map((a) => a.key).sort()).toEqual([...cut[n - 1]!.answers].sort());
    }
    expect(getPassage(id, cut.length + 1)).toBeUndefined();
  });

  it('is the same object each time, so a screen built on it does not rebuild', () => {
    expect(getPassage('bible', 2)).toBe(getPassage('bible', 2));
    expect(getPassage('bible', 2)!.def).not.toBe(getPassage('bible', 3)!.def);
  });

  it('has no passage for a number that is not one, or a puzzle that is not ours', () => {
    for (const n of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(getPassage('bible', n)).toBeUndefined();
    expect(getPassage('no-such-game', 1)).toBeUndefined();
  });
});

describe('the sitting route', () => {
  it('is a puzzle screen, with its own bottom bar and no dock', () => {
    expect(isPuzzle('/play/bible/2')).toBe(true);
    expect(isPuzzle('/play/bible/2/')).toBe(true);
    expect(hasTabBar('/play/bible/2')).toBe(false);
    expect(isPuzzle('/play/bible')).toBe(true);
    expect(isPuzzle('/play/bible/two')).toBe(false);
    expect(isPuzzle('/play/bible/2/3')).toBe(false);
    expect(isPuzzle('/play')).toBe(false);
  });
});