// What a finished play shows about the player's eye. Four skills, each a yes or no.
// Badges, records and bonus points build on these.

import type { Answer } from './hiddenWords';
import { answerDepth } from './depth';
import type { Char } from './text';

export const LONG_WORD = 9;
export const DEEP_JOINS = 3;

export type PlayInput = {
  puzzle: { chars: readonly Char[]; answers: readonly Answer[] };
  /** Answers found, in any order. `by` is a teammate's name: a find that was not the player's own. */
  found: ReadonlyArray<{ key: string; by?: string }>;
  /** Wrong picks, counted in every game. */
  wrongs: number;
  hints: number;
};

export type Skills = { cleanRead: boolean; longWord: boolean; deepFind: boolean; noHintPerfect: boolean };

/**
 * Every word found by you, no hint, no wrong pick. The same rule as `isCleanRead` in games/session.ts,
 * which works on the saved session and so cannot be imported here without React.
 */
export function cleanReadOf(play: Pick<PlayInput, 'found' | 'wrongs' | 'hints'>, total: number): boolean {
  return total > 0 && play.found.length === total && play.hints === 0 && play.wrongs === 0 && play.found.every((f) => !f.by);
}

export function skillsOf({ puzzle, found, wrongs, hints }: PlayInput): Skills {
  const total = puzzle.answers.length;
  const keys = new Set(found.map((f) => f.key));
  const mine = puzzle.answers.filter((a) => keys.has(a.key));
  return {
    cleanRead: cleanReadOf({ found, wrongs, hints }, total),
    longWord: mine.some((a) => a.key.length >= LONG_WORD),
    deepFind: mine.some((a) => answerDepth(puzzle, a).joins >= DEEP_JOINS),
    // Wrong picks are allowed here: this is the "needed no help" mark, the clean read is the "and no slips" one.
    noHintPerfect: total > 0 && mine.length === total && hints === 0,
  };
}
