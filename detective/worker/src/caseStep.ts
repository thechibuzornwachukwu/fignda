// A step of a written chapter, checked on the server (BUILD_PLAN set 4a). The puzzle is made again here by the
// engine the client made it with, and the play log is replayed against it, so the stars and the score are the
// server's own. The line-up and a step answered by picking have no board: they are checked against the chapter.

import { STORIES } from '../../src/games/stories';
import { LINEUP_TRIES, lineupStars, pickStep, pickWrongs, pieceStars, pieceWrongs, piecesOf, stepPuzzle, talkStars, talkWrongs, sweepResult, tornOf, tornStars, tornWrongs, trailOf, trailStars, trailWrongs, type Chapter } from '../../src/engine/chapter';
import { EVALUATE } from '../../src/engine/evaluate';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { buildMirror } from '../../src/engine/mirror';
import { starsFor } from '../../src/engine/stars';
import { buildSums } from '../../src/engine/sums';
import { replay, type PlayLog } from './replay';

/** Every written chapter, by id: the same list the app ships (`src/games/stories.ts`), less the drafts nobody can play yet. */
export const CHAPTERS: Readonly<Record<string, Chapter>> = Object.fromEntries(STORIES.filter((c) => !c.draft).map((c) => [c.id, c]));

export type StepCheck =
  | { ok: true; stars: 1 | 2 | 3; score: number; found: number; total: number; hints: number; secs: number }
  | { ok: false; status: number; reason: string };

/**
 * Check a finished step. `named` is for the line-up only: the suspects named, in order. The culprit, when
 * named, is the last name, and nobody is named twice or after the tries ran out. `picked` is for a step
 * answered by picking only ("which account fits", "could it be done"): the picks made, in order, by the same rule.
 */
export function checkStep(chapter: Chapter, step: number, log: PlayLog, named?: readonly string[], picked?: readonly number[]): StepCheck {
  const s = chapter.steps[step - 1];
  if (!s) return { ok: false, status: 404, reason: 'unknown_step' };

  if (s.method === 'line-up') {
    if (picked) return { ok: false, status: 400, reason: 'bad_request' };
    const list = named ?? [];
    const suspects = new Set(chapter.suspects.map((x) => x.who));
    if (list.length === 0 || list.length > LINEUP_TRIES || new Set(list).size !== list.length || list.some((w) => !suspects.has(w))) return { ok: false, status: 400, reason: 'bad_request' };
    const at = list.indexOf(chapter.culprit);
    if (at >= 0 ? at !== list.length - 1 : list.length !== LINEUP_TRIES) return { ok: false, status: 400, reason: 'bad_request' };
    // The line-up scores nothing: its stars say how it went, and the steps before it earned the points.
    return { ok: true, stars: lineupStars(at >= 0 ? at : LINEUP_TRIES), score: 0, found: at >= 0 ? 1 : 0, total: 1, hints: 0, secs: 0 };
  }

  if (named) return { ok: false, status: 400, reason: 'bad_request' };

  if (s.method === 'sweep') {
    // The things tapped, in order. Tip-offs are in the log, as in any game.
    const r = s.room ? sweepResult(s.room, picked ?? []) : null;
    if (!r || named) return { ok: false, status: 400, reason: 'bad_request' };
    const stars = starsFor({ finished: true, found: r.found, total: r.total, hints: log.hints.length, wrongs: r.wrongs }) as 1 | 2 | 3;
    return { ok: true, stars, score: 0, found: r.found, total: r.total, hints: log.hints.length, secs: 0 };
  }

  if (s.method === 'piece') {
    const pieces = piecesOf(chapter, step);
    const wrong = pieces ? pieceWrongs(pieces, picked ?? []) : -1;
    if (!pieces || wrong < 0 || named) return { ok: false, status: 400, reason: 'bad_request' };
    return { ok: true, stars: pieceStars(wrong), score: 0, found: pieces.count - wrong, total: pieces.count, hints: 0, secs: 0 };
  }
  if (s.method === 'question') {
    const wrong = s.talk ? talkWrongs(s.talk, step - 1, picked ?? []) : -1;
    if (wrong < 0 || named) return { ok: false, status: 400, reason: 'bad_request' };
    return { ok: true, stars: talkStars(wrong), score: 0, found: 1, total: 1, hints: 0, secs: 0 };
  }
  if (s.method === 'torn') {
    const torn = tornOf(chapter, step);
    const wrong = torn ? tornWrongs(torn, picked ?? []) : -1;
    if (!torn || wrong < 0 || named) return { ok: false, status: 400, reason: 'bad_request' };
    return { ok: true, stars: tornStars(wrong), score: 0, found: torn.lefts.length - wrong, total: torn.lefts.length, hints: 0, secs: 0 };
  }

  if (s.method === 'trail') {
    const trail = trailOf(chapter, step);
    const wrong = trail ? trailWrongs(trail, picked ?? []) : -1;
    if (!trail || wrong < 0) return { ok: false, status: 400, reason: 'bad_request' };
    return { ok: true, stars: trailStars(wrong), score: 0, found: trail.finds.length - wrong, total: trail.finds.length, hints: 0, secs: 0 };
  }

  const choice = pickStep(s);
  if (choice) {
    const wrong = pickWrongs(choice, picked ?? []);
    if (wrong < 0) return { ok: false, status: 400, reason: 'bad_request' };
    // Like the line-up, it scores nothing: the stars say how it went.
    return { ok: true, stars: choice.stars(wrong), score: 0, found: wrong < choice.tries ? 1 : 0, total: 1, hints: 0, secs: 0 };
  }
  if (picked) return { ok: false, status: 400, reason: 'bad_request' };
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
