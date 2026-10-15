// A sums clue and a Mirror clue, replayed by their own rules from the play log alone.

import { EVALUATE } from '../../src/engine/evaluate';
import { buildMirror, mirrorClue } from '../../src/engine/mirror';
import { buildSums, sumsClue } from '../../src/engine/sums';
import { getPassage, getPuzzle, MIRROR_WORDS } from '../../src/games/catalog';
import { replay, type PlayEvent } from '../src/replay';

type Board = { answers: ReadonlyArray<{ spans: Array<[number, number]> }> };
const picks = (p: Board, backwards = false): PlayEvent[] =>
  p.answers.map((a, i) => ({ a: a.spans[0]![backwards ? 1 : 0], b: a.spans[0]![backwards ? 0 : 1], t: (i + 1) * 2000 }));
const log = (events: PlayEvent[]) => ({ events, hints: [], finish: Math.max(0, ...events.map((e) => e.t)) + 500 });

describe('a sums clue on the server', () => {
  const sums = buildSums(sumsClue('bible~21', 0));

  it('is the row the player saw: made again from the same name', () => {
    const seen = getPassage('bible', 21)!.def;
    expect({ text: sums.text, dict: sums.dict }).toEqual({ text: seen.text, dict: seen.dict });
  });

  it('every run found is a clean read', () => {
    const r = replay(sums, log(picks(sums)), false, EVALUATE['buried-sums']);
    expect(r).toMatchObject({ ok: true, found: 3, total: 3, wrongs: 0, clean: true });
  });

  it('a run that does not add up is a wrong pick, one digit off is not, and a run sent twice is refused', () => {
    const [a, b] = sums.answers[0]!.spans[0]!;
    const far: PlayEvent = { a, b: Math.min(sums.S.length - 1, b + 3), t: 500 };
    const near: PlayEvent = { a, b: b + 1, t: 700 };
    const r = replay(sums, log([far, near, ...picks(sums)]), false, EVALUATE['buried-sums']);
    expect(r).toMatchObject({ ok: true, found: 3, wrongs: 1, clean: false });
    const twice = replay(sums, log([...picks(sums), { a, b, t: 9000 }]), false, EVALUATE['buried-sums']);
    expect(twice).toEqual({ ok: false, reason: 'duplicate_find' });
  });

  it('the hidden-words rule finds nothing in it', () => {
    const r = replay(sums, log(picks(sums)), false);
    expect(r).toMatchObject({ ok: true, found: 0 });
  });
});

describe('a Mirror clue on the server', () => {
  const made = mirrorClue(getPuzzle('bible')!, MIRROR_WORDS)!;
  const mirror = buildMirror(made);

  it('is the clue the player saw', () => {
    const seen = getPassage('bible', 31)!.def;
    expect(made).toEqual({ text: seen.text, dict: seen.dict });
  });

  it('every word found, dragged from either end, is a clean read', () => {
    for (const backwards of [false, true]) {
      const r = replay(mirror, log(picks(mirror, backwards)), false, EVALUATE.mirror);
      expect(r).toMatchObject({ ok: true, found: mirror.answers.length, total: mirror.answers.length, clean: true });
    }
  });

  it('the hidden-words rule does not take a word that reads right to left', () => {
    const r = replay(mirror, log(picks(mirror)), false);
    expect(r).toMatchObject({ ok: true, found: 0 });
  });
});
