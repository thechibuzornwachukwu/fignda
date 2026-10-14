// A step of a written chapter, checked on the server from the play log alone, and the line-up from the chapter.

import { readdirSync, readFileSync } from 'node:fs';
import { claimPick, stepPuzzle, tornOf, trailOf, type Chapter } from '../../src/engine/chapter';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { buildMirror } from '../../src/engine/mirror';
import { buildSums } from '../../src/engine/sums';
import { PlayBody } from '../src/app';
import { CHAPTERS, checkStep } from '../src/caseStep';
import type { PlayEvent } from '../src/replay';

const spoon = CHAPTERS['the-long-spoon'] as Chapter;
type Board = { answers: ReadonlyArray<{ spans: Array<[number, number]> }> };
const picks = (p: Board): PlayEvent[] => p.answers.map((a, i) => ({ a: a.spans[0]![0], b: a.spans[0]![1], t: (i + 1) * 2000 }));
const log = (events: PlayEvent[]) => ({ events, hints: [], finish: Math.max(0, ...events.map((e) => e.t)) + 500 });
const none = log([]);

describe('the chapters the Worker is built with', () => {
  it('are every file in design/stories', () => {
    // A draft is not open to players, so the Worker does not take plays of it.
    const files = readdirSync('design/stories')
      .filter((f) => f.endsWith('.json') && !(JSON.parse(readFileSync(`design/stories/${f}`, 'utf8')) as { draft?: boolean }).draft)
      .map((f) => f.replace(/\.json$/, ''));
    expect(Object.keys(CHAPTERS).sort()).toEqual(files.sort());
  });
});

describe('a step on the server', () => {
  it('the blotter: every word found is 3 stars, with the score the engine gives', () => {
    const r = checkStep(spoon, 1, log(picks(buildMirror(stepPuzzle(spoon, 1)!))));
    expect(r).toMatchObject({ ok: true, stars: 3, found: 4, total: 4, hints: 0 });
    expect(r.ok && r.score).toBeGreaterThan(0);
  });

  it('a row of records and a hidden-words step are checked by their own rules', () => {
    const sums = buildSums(stepPuzzle(spoon, 2)!);
    expect(checkStep(spoon, 2, log(picks(sums)))).toMatchObject({ ok: true, stars: 3, found: sums.answers.length });
    const words = buildHiddenWords(stepPuzzle(spoon, 3)!);
    expect(checkStep(spoon, 3, log(picks(words)))).toMatchObject({ ok: true, stars: 3, found: 4, total: 4 });
  });

  it('finished with nothing found is 1 star and no points: the lead is given, the clearing is not', () => {
    expect(checkStep(spoon, 2, none)).toMatchObject({ ok: true, stars: 1, found: 0, score: 0 });
  });

  it('a find sent twice is refused, as in any game', () => {
    const board = buildHiddenWords(stepPuzzle(spoon, 5)!);
    const [a, b] = board.answers[0]!.spans[0]!;
    expect(checkStep(spoon, 5, log([...picks(board), { a, b, t: 20000 }]))).toEqual({ ok: false, status: 422, reason: 'duplicate_find' });
  });

  it('a step that is not there is not found, and a board step takes no names', () => {
    expect(checkStep(spoon, 0, none)).toMatchObject({ ok: false, status: 404 });
    expect(checkStep(spoon, 9, none)).toMatchObject({ ok: false, status: 404 });
    expect(checkStep(spoon, 2, none, ['the photographer'])).toMatchObject({ ok: false, status: 400 });
  });
});

describe('the line-up on the server', () => {
  const last = spoon.steps.length;

  it('the right name at once is 3 stars, after 1 wrong name 2, and out of tries 1', () => {
    expect(checkStep(spoon, last, none, ['the photographer'])).toMatchObject({ ok: true, stars: 3, score: 0 });
    expect(checkStep(spoon, last, none, ['the baker', 'the photographer'])).toMatchObject({ ok: true, stars: 2 });
    expect(checkStep(spoon, last, none, ['the baker', 'the caretaker'])).toMatchObject({ ok: true, stars: 1 });
  });

  it('refuses a list that could not have been played', () => {
    for (const named of [[], ['the pilot'], ['the baker'], ['the baker', 'the baker'], ['the photographer', 'the baker'], ['the baker', 'the caretaker', 'the photographer']])
      expect(checkStep(spoon, last, none, named), named.join()).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(spoon, last, none)).toMatchObject({ ok: false, status: 400 });
  });
});

describe('a step answered by picking, on the server', () => {
  const box = CHAPTERS['the-open-box'] as Chapter;
  const bus = CHAPTERS['the-early-bus'] as Chapter;

  it('which account fits: the right one at once is 3 stars, after 1 wrong pick 2, and after 2 it is 1', () => {
    expect(checkStep(box, 6, none, undefined, [2])).toMatchObject({ ok: true, stars: 3, score: 0, found: 1 });
    expect(checkStep(box, 6, none, undefined, [0, 2])).toMatchObject({ ok: true, stars: 2 });
    expect(checkStep(box, 6, none, undefined, [1, 0])).toMatchObject({ ok: true, stars: 1, found: 0 });
  });

  it('could it be done: the fact that decides and the verdict, both right', () => {
    expect(checkStep(bus, 4, none, undefined, [claimPick(1, true)])).toMatchObject({ ok: true, stars: 3, score: 0 });
    expect(checkStep(bus, 4, none, undefined, [claimPick(1, false), claimPick(1, true)])).toMatchObject({ ok: true, stars: 2 });
    expect(checkStep(bus, 4, none, undefined, [claimPick(0, true), claimPick(0, false)])).toMatchObject({ ok: true, stars: 1 });
  });

  it('refuses picks that could not have been played, picks on a board step, and names on a picking step', () => {
    for (const picked of [[], [0], [2, 1], [1, 1], [0, 1, 2], [3]]) expect(checkStep(box, 6, none, undefined, picked), picked.join()).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(box, 6, none)).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(box, 6, none, ['the usher'])).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(box, 1, none, undefined, [2])).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(spoon, spoon.steps.length, none, ['the photographer'], [0])).toMatchObject({ ok: false, status: 400 });
  });

  it('the board steps of the new cases are replayed like any other', () => {
    const label = buildMirror(stepPuzzle(bus, 2)!);
    expect(checkStep(bus, 2, log(picks(label)))).toMatchObject({ ok: true, stars: 3, found: 4, total: 4 });
    const card = buildHiddenWords(stepPuzzle(bus, 5)!);
    expect(checkStep(bus, 5, log(picks(card)))).toMatchObject({ ok: true, stars: 3, found: 4, total: 4 });
  });
});

describe('the missing step on the server', () => {
  const signs = CHAPTERS['the-2-signs'] as Chapter;

  it('the thing that fits at once is 3 stars, after 1 wrong pick 2, and after 2 it is 1', () => {
    expect(checkStep(signs, 3, none, undefined, [1])).toMatchObject({ ok: true, stars: 3, score: 0 });
    expect(checkStep(signs, 3, none, undefined, [0, 1])).toMatchObject({ ok: true, stars: 2 });
    expect(checkStep(signs, 3, none, undefined, [2, 0])).toMatchObject({ ok: true, stars: 1 });
    expect(checkStep(signs, 3, none, undefined, [1, 0])).toMatchObject({ ok: false, status: 400 });
  });
});

describe('sweep the room on the server', () => {
  const hall = CHAPTERS['the-light-in-the-hall'] as Chapter;
  const room = hall.steps[0]!.room!;
  const evidence = room.things.flatMap((t, i) => (t.evidence ? [i] : []));
  const clock = room.things.findIndex((t) => t.name === 'The clock');

  it('every piece found with no tip-off and no wrong tap is 3 stars, and tip-offs come from the log', () => {
    expect(checkStep(hall, 1, none, undefined, evidence)).toMatchObject({ ok: true, stars: 3, found: 6, total: 6 });
    expect(checkStep(hall, 1, none, undefined, [clock, ...evidence])).toMatchObject({ ok: true, stars: 2 });
    expect(checkStep(hall, 1, { events: [], hints: [1000], finish: 5000 }, undefined, evidence)).toMatchObject({ ok: true, stars: 2, hints: 1 });
    expect(checkStep(hall, 1, none, undefined, evidence.slice(0, 2))).toMatchObject({ ok: true, stars: 1, found: 2 });
  });

  it('refuses taps nobody could have made', () => {
    for (const picked of [[0, 0], [room.things.length], [-1]]) expect(checkStep(hall, 1, none, undefined, picked), picked.join()).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(hall, 1, none, ['the usher'], evidence)).toMatchObject({ ok: false, status: 400 });
  });
});

describe('the torn page on the server', () => {
  const spoon2 = CHAPTERS['the-other-spoon'] as Chapter;
  const right = tornOf(spoon2, 2)!.order;

  it('every line whole is 3 stars, 1 set wrong is 2, and more is 1', () => {
    expect(checkStep(spoon2, 2, none, undefined, right)).toMatchObject({ ok: true, stars: 3, found: 4, total: 4, score: 0 });
    const one = [...right];
    one[0] = (one[0]! + 1) % 4;
    expect(checkStep(spoon2, 2, none, undefined, one)).toMatchObject({ ok: true, stars: 2 });
    expect(checkStep(spoon2, 2, none, undefined, right.map((p) => (p + 1) % 4))).toMatchObject({ ok: true, stars: 1 });
  });

  it('refuses a page that could not have been set', () => {
    for (const picked of [[], right.slice(1), [...right, 0], [9, 0, 1, 2]]) expect(checkStep(spoon2, 2, none, undefined, picked), picked.join()).toMatchObject({ ok: false, status: 400 });
  });
});

describe('the trail on the server', () => {
  const year = CHAPTERS['the-year-that-is-missing'] as Chapter;
  const right = trailOf(year, 5)!.finds.map((f) => f.place);

  it('every find in its place is 3 stars, 1 misplaced is 2, and more is 1', () => {
    expect(checkStep(year, 5, none, undefined, right)).toMatchObject({ ok: true, stars: 3, found: 4, total: 4, score: 0 });
    const one = [...right];
    one[0] = (one[0]! + 1) % 4;
    expect(checkStep(year, 5, none, undefined, one)).toMatchObject({ ok: true, stars: 2, found: 3 });
    expect(checkStep(year, 5, none, undefined, right.map((p) => (p + 1) % 4))).toMatchObject({ ok: true, stars: 1, found: 0 });
  });

  it('refuses a walk that is short, long or off the line', () => {
    for (const picked of [[], right.slice(1), [...right, 0], [9, 0, 1, 2]]) expect(checkStep(year, 5, none, undefined, picked), picked.join()).toMatchObject({ ok: false, status: 400 });
    expect(checkStep(year, 5, none)).toMatchObject({ ok: false, status: 400 });
  });
});

describe('the request', () => {
  const body = (game: unknown, more: object = {}) => PlayBody.safeParse({ game, log: none, ...more }).success;

  it('takes a step of a chapter, and names only with it', () => {
    expect(body({ type: 'case', id: 'the-long-spoon', step: 2 })).toBe(true);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 6, named: ['the baker', 'the photographer'] })).toBe(true);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 0 })).toBe(false);
    expect(body({ type: 'case', id: 'The Long Spoon', step: 1 })).toBe(false);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 1, named: ['a', 'b', 'c'] })).toBe(false);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 1, extra: 1 })).toBe(false);
    expect(body({ type: 'case', id: 'the-open-box', step: 6, picked: [0, 2] })).toBe(true);
    expect(body({ type: 'case', id: 'the-open-box', step: 6, picked: Array.from({ length: 41 }, (_, i) => i % 4) })).toBe(false);
    expect(body({ type: 'case', id: 'the-open-box', step: 6, picked: [40] })).toBe(false);
  });
});
