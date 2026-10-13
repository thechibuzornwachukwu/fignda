// A step of a written chapter, checked on the server (BUILD_PLAN set 4a). The puzzle is made again here by the
// engine the client made it with, and the play log is replayed against it, so the stars and the score are the
// server's own. The line-up has no board: it is checked against the chapter itself.

import longSpoon from '../../design/stories/the-long-spoon.json';
import { LINEUP_TRIES, lineupStars, stepPuzzle, type Chapter } from '../../src/engine/chapter';
import { EVALUATE } from '../../src/engine/evaluate';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { buildMirror } from '../../src/engine/mirror';
import { starsFor } from '../../src/engine/stars';
import { buildSums } from '../../src/engine/sums';
import { replay, type PlayLog } from './replay';

/** Every written chapter, by id. A new file in `design/stories` is added here: a test fails until it is. */
export const CHAPTERS: Readonly<Record<string, Chapter>> = Object.fromEntries(([longSpoon] as unknown as Chapter[]).map((c) => [c.id, c]));

export type StepCheck =
  | { ok: true; stars: 1 | 2 | 3; score: number; found: number; total: number; hints: number; secs: number }
  | { ok: false; status: number; reason: string };

/**
 * Check a finished step. `named` is for the line-up only: the suspects named, in order. The culprit, when
 * named, is the last name, and nobody is named twice or after the tries ran out.
 */
export function checkStep(chapter: Chapter, step: number, log: PlayLog, named?: readonly string[]): StepCheck {
  const s = chapter.steps[step - 1];
  if (!s) return { ok: false, status: 404, reason: 'unknown_step' };

  if (s.method === 'line-up') {
    const list = named ?? [];
    const suspects = new Set(chapter.suspects.map((x) => x.who));
    if (list.length === 0 || list.length > LINEUP_TRIES || new Set(list).size !== list.length || list.some((w) => !suspects.has(w))) return { ok: false, status: 400, reason: 'bad_request' };
    const at = list.indexOf(chapter.culprit);
    if (at >= 0 ? at !== list.length - 1 : list.length !== LINEUP_TRIES) return { ok: false, status: 400, reason: 'bad_request' };
    // The line-up scores nothing: its stars say how it went, and the steps before it earned the points.
    return { ok: true, stars: lineupStars(at >= 0 ? at : LINEUP_TRIES), score: 0, found: at >= 0 ? 1 : 0, total: 1, hints: 0, secs: 0 };
  }

  if (named) return { ok: false, status: 400, reason: 'bad_request' };
  const def = stepPuzzle(chapter, step);
  if (!def) return { ok: false, status: 404, reason: 'unknown_step' };
  const r =
    def.type === 'buried-sums'
      ? replay(buildSums(def), log, false, EVALUATE['buried-sums'])
      : def.type === 'mirror'
        ? replay(buildMirror(def), log, false, EVALUATE.mirror)
        : replay(buildHiddenWords(def), log, false);
  if (!r.ok) return { ok: false, status: 422, reason: r.reason };
  // A finished game is 1 star at least.
  const stars = starsFor({ finished: true, found: r.found, total: r.total, hints: r.hints, wrongs: r.wrongs }) as 1 | 2 | 3;
  return { ok: true, stars, score: r.score, found: r.found, total: r.total, hints: r.hints, secs: r.secs };
}
