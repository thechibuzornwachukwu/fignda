// type -> { build, check, Board }. The shell (clock, progress, list, hints, results) is shared.
// A new game type adds an entry here without shell changes.

import type { ComponentType } from 'react';
import { Puzzle, type PuzzleProps, type Span } from '../components/Puzzle';
import { check, isClose } from '../engine/check';
import { buildHiddenWords, norm, type HiddenWordsPuzzle } from '../engine/hiddenWords';
import type { GameDef, GameType } from './catalog';

export type Evaluation =
  | { kind: 'hit'; key: string; label: string; span: Span }
  | { kind: 'already' }
  | { kind: 'close' }
  | { kind: 'wrong' }
  | { kind: 'ignore' };

export type AnswerInfo = { key: string; label: string; length: number };

export type GameModule<P> = {
  build(def: GameDef): P;
  /** Letter count and chars for the board. */
  boardProps(p: P): Pick<PuzzleProps, 'chars' | 'letters'>;
  answers(p: P): readonly AnswerInfo[];
  /** Evaluate a finished selection. Matching lives in the engine, never in UI. */
  check(p: P, a: number, b: number, found: ReadonlySet<string>): Evaluation;
  /** Earliest unfound answer and the letter to mark. */
  hint(p: P, found: ReadonlySet<string>): { key: string; at: number } | null;
  /** Spans to shade for unfound answers after finish. */
  missed(p: P, found: ReadonlySet<string>): Span[];
  /** Sort key for unfound rows in the word list. */
  listOrder(p: P): (key: string) => number;
  Board: ComponentType<PuzzleProps>;
};

const hiddenWords: GameModule<HiddenWordsPuzzle<GameDef>> = {
  build: (def) => buildHiddenWords(def),
  boardProps: (p) => ({ chars: p.chars, letters: p.S.length }),
  answers: (p) => p.answers.map((a) => ({ key: a.key, label: a.label, length: a.key.length })),
  check(p, a, b, found) {
    const r = check(p, a, b, found);
    if (r.kind === 'hit') {
      const [x, y] = a <= b ? [a, b] : [b, a];
      return { kind: 'hit', key: r.answer.key, label: r.answer.label, span: [x, y] };
    }
    if (r.kind === 'wrong') {
      const unfound = p.answers.filter((x) => !found.has(x.key)).map((x) => x.key);
      return isClose(r.str, unfound) ? { kind: 'close' } : { kind: 'wrong' };
    }
    return { kind: r.kind };
  },
  hint(p, found) {
    const next = p.answers.find((a) => !found.has(a.key));
    return next ? { key: next.key, at: next.spans[0]![0] } : null;
  },
  missed: (p, found) => p.answers.filter((a) => !found.has(a.key)).map((a) => a.spans[0]!),
  listOrder(p) {
    const order = p.dict.map(norm);
    return (key) => order.indexOf(key);
  },
  Board: Puzzle,
};

export const registry: Record<GameType, GameModule<HiddenWordsPuzzle<GameDef>>> = {
  'hidden-words': hiddenWords,
};
