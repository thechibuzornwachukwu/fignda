// A step of a written chapter, checked on the server from the play log alone, and the line-up from the chapter.

import { readdirSync } from 'node:fs';
import { stepPuzzle, type Chapter } from '../../src/engine/chapter';
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
    const files = readdirSync('design/stories').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
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

describe('the request', () => {
  const body = (game: unknown, more: object = {}) => PlayBody.safeParse({ game, log: none, ...more }).success;

  it('takes a step of a chapter, and names only with it', () => {
    expect(body({ type: 'case', id: 'the-long-spoon', step: 2 })).toBe(true);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 6, named: ['the baker', 'the photographer'] })).toBe(true);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 0 })).toBe(false);
    expect(body({ type: 'case', id: 'The Long Spoon', step: 1 })).toBe(false);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 1, named: ['a', 'b', 'c'] })).toBe(false);
    expect(body({ type: 'case', id: 'the-long-spoon', step: 1, extra: 1 })).toBe(false);
  });
});
