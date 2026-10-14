// Clean read, worked out by the replay from the play log alone.

import { score } from '../../src/engine/score';
import { getPuzzle } from '../../src/games/catalog';
import { isCleanRead, replay, type PlayEvent } from '../src/replay';

const bnote = getPuzzle('bnote')!;
const total = bnote.answers.length;
const all = (gap = 2000): PlayEvent[] => bnote.answers.map((a, i) => ({ a: a.spans[0]![0], b: a.spans[0]![1], t: (i + 1) * gap }));
const run = (events: PlayEvent[], hints: number[] = [], daily = false) =>
  replay(bnote, { events, hints, finish: Math.max(0, ...events.map((e) => e.t), ...hints) + 500 }, daily);
const amos = (): [number, number] => {
  const i = bnote.S.indexOf('amos');
  return [i, i + 3];
};

describe('clean read from a play log', () => {
  it('every word, no wrong picks, no hints: clean, in a daily and in any other game', () => {
    expect(run(all())).toMatchObject({ ok: true, found: total, wrongs: 0, clean: true });
    expect(run(all(), [], true)).toMatchObject({ ok: true, found: total, wrongs: 0, clean: true });
  });

  it('one wrong pick spoils it, and is counted outside the daily too', () => {
    const events = [{ a: 0, b: 4, t: 500 }, ...all()];
    expect(run(events)).toMatchObject({ ok: true, found: total, wrongs: 1, misses: 0, clean: false });
    expect(run(events, [], true)).toMatchObject({ ok: true, found: total, wrongs: 1, misses: 1, clean: false });
  });

  it('a near miss and a pick under 3 letters are not wrong picks', () => {
    const [a, b] = amos();
    const events = [{ a, b: b + 1, t: 300 }, { a: 0, b: 1, t: 400 }, ...all()];
    expect(run(events)).toMatchObject({ ok: true, wrongs: 0, clean: true });
  });

  it('a hint spoils it', () => {
    expect(run(all(), [100])).toMatchObject({ ok: true, found: total, hints: 1, clean: false });
  });

  it('a word left unfound spoils it', () => {
    expect(run(all().slice(0, -1))).toMatchObject({ ok: true, found: total - 1, clean: false });
    expect(run([])).toMatchObject({ ok: true, found: 0, clean: false });
  });

  it('a room play is never one, and an empty puzzle is never one', () => {
    const r = { found: 5, total: 5, hints: 0, wrongs: 0 };
    expect(isCleanRead(r)).toBe(true);
    expect(isCleanRead(r, true)).toBe(false);
    expect(isCleanRead({ found: 0, total: 0, hints: 0, wrongs: 0 })).toBe(false);
  });

  it('adds nothing to the score: scores are what they were before clean reads existed', () => {
    const clean = run(all());
    const secs = Math.floor((total * 2000 + 500) / 1000);
    expect(clean.ok && clean.score).toBe(total * 100 + 600 - secs);
    // Outside the daily a wrong pick still costs nothing, as before.
    const wrong = run([{ a: 0, b: 4, t: 500 }, ...all()]);
    expect(wrong.ok && wrong.score).toBe(clean.ok && clean.score);
    // On the daily it costs 10, as before.
    const daily = run([{ a: 0, b: 4, t: 500 }, ...all()], [], true);
    expect(daily.ok && daily.score).toBe(score({ found: total, total, hints: 0, misses: 1, secs }));
  });
});
