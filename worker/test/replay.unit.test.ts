import { getPuzzle } from '../../src/games/catalog';
import { MAX_LOG_EVENTS, replay, type PlayEvent } from '../src/replay';

const bnote = getPuzzle('bnote')!;
const span = (w: string): [number, number] => {
  const i = bnote.S.indexOf(w);
  return [i, i + w.length - 1];
};
/** A human-paced, honest log finding every answer. */
function honest(gap = 2000): PlayEvent[] {
  return bnote.answers.map((a, i) => ({ a: a.spans[0]![0], b: a.spans[0]![1], t: (i + 1) * gap }));
}

describe('replay: honest logs', () => {
  it('scores a full clear with the time bonus', () => {
    const events = honest();
    const r = replay(bnote, { events, hints: [], finish: events.at(-1)!.t + 500 }, false);
    const total = bnote.answers.length;
    const secs = Math.floor((events.at(-1)!.t + 500) / 1000);
    expect(r).toMatchObject({ ok: true, found: total, total, hints: 0, misses: 0, secs, score: total * 100 + 600 - secs });
    // Every word comes back with the time it was picked, for room plays.
    expect(r.ok && r.finds).toEqual(bnote.answers.map((a, i) => ({ k: a.key, t: events[i]!.t })));
  });

  it('accepts reversed selections', () => {
    const [a, b] = span('amos');
    const r = replay(bnote, { events: [{ a: b, b: a, t: 1000 }], hints: [], finish: 2000 }, false);
    expect(r).toMatchObject({ ok: true, found: 1 });
  });

  it('counts hints and daily wrong picks, but not near misses', () => {
    const [a, b] = span('amos');
    const events = [
      { a: 0, b: 4, t: 500 }, // wrong
      { a, b: b + 1, t: 900 }, // "amosb": near miss
      { a, b, t: 1500 },
    ];
    const daily = replay(bnote, { events, hints: [100, 200], finish: 3000 }, true);
    expect(daily).toMatchObject({ ok: true, found: 1, hints: 2, misses: 1 });
    const free = replay(bnote, { events, hints: [100], finish: 3000 }, false);
    expect(free).toMatchObject({ ok: true, misses: 0 });
  });

  it('under-3-letter selections are ignored, not misses', () => {
    const r = replay(bnote, { events: [{ a: 0, b: 1, t: 500 }], hints: [], finish: 1000 }, true);
    expect(r).toMatchObject({ ok: true, misses: 0, found: 0 });
  });
});

describe('replay: tampered logs are rejected', () => {
  it('duplicate finds', () => {
    const [a, b] = span('amos');
    const r = replay(bnote, { events: [{ a, b, t: 1000 }, { a, b, t: 3000 }], hints: [], finish: 4000 }, false);
    expect(r).toEqual({ ok: false, reason: 'duplicate_find' });
  });

  it('finds faster than 150ms apart', () => {
    const r = replay(bnote, { events: honest(100), hints: [], finish: 10_000 }, false);
    expect(r).toEqual({ ok: false, reason: 'too_fast' });
  });

  it('a first find within 150ms of the start', () => {
    const [a, b] = span('amos');
    expect(replay(bnote, { events: [{ a, b, t: 20 }], hints: [], finish: 1000 }, false)).toEqual({
      ok: false,
      reason: 'too_fast',
    });
  });

  it('finish before the last event', () => {
    const events = honest();
    expect(replay(bnote, { events, hints: [], finish: 10 }, false)).toEqual({ ok: false, reason: 'finish_before_last_event' });
    expect(replay(bnote, { events: [], hints: [5000], finish: 100 }, false)).toEqual({
      ok: false,
      reason: 'finish_before_last_event',
    });
  });

  it('events out of order (rewritten timestamps)', () => {
    const e = honest().reverse();
    expect(replay(bnote, { events: e, hints: [], finish: 60_000 }, false)).toEqual({ ok: false, reason: 'out_of_order' });
  });

  it('logs over 500 events', () => {
    const events = Array.from({ length: MAX_LOG_EVENTS + 1 }, (_, i) => ({ a: 0, b: 0, t: i }));
    expect(replay(bnote, { events, hints: [], finish: 10_000 }, false)).toEqual({ ok: false, reason: 'log_too_long' });
  });

  it('selections outside the text', () => {
    const r = replay(bnote, { events: [{ a: 0, b: 99999, t: 1000 }], hints: [], finish: 2000 }, false);
    expect(r).toEqual({ ok: false, reason: 'index_out_of_range' });
  });
});
