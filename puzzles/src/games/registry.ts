// type -> { build, check, Board }. The shell (clock, progress, list, hints, results) is shared.
// A new game type adds an entry here without shell changes.

import type { ComponentType } from 'react';
import { Puzzle, type PuzzleProps, type Span } from '../components/Puzzle';
import { EVALUATE, type Evaluate, type Evaluation } from '../engine/evaluate';
import { buildHiddenWords, norm, type HiddenWordsPuzzle } from '../engine/hiddenWords';
import { hintAnswer, type HintKind } from '../engine/hint';
import { buildMirror } from '../engine/mirror';
import { revealParts, type RevealPart } from '../engine/reveal';
import { buildSums, sumsTarget } from '../engine/sums';
import { bankOf, buildUnmask, givenOf, UNMASK_TRIES } from '../engine/unmask';
import { UnmaskBoard } from '../components/UnmaskBoard';
import type { GameDef, GameType } from './catalog';

export type { Evaluation };

export type AnswerInfo = { key: string; label: string; length: number };

export type RevealItem = { key: string; label: string; span: Span; parts: RevealPart[] };

/** What a game asks of the player. Words today; numbers and shapes join as their games are built (BUILD_PLAN section 4). */
export const FAMILIES = ['verbal', 'quantitative', 'nonverbal'] as const;
export type Family = (typeof FAMILIES)[number];
export const FAMILY_LABEL: Record<Family, string> = { verbal: 'Verbal', quantitative: 'Quantitative', nonverbal: 'Non-verbal' };

export type GameModule<P> = {
  /** The family this type belongs to. It sets the rhythm of a case (word, word, number, word) and the lines a wrong pick gets. */
  family: Family;
  build(def: GameDef): P;
  /** Letter count and chars for the board. */
  boardProps(p: P): Pick<PuzzleProps, 'chars' | 'letters'> & Partial<Pick<PuzzleProps, 'variant' | 'target' | 'text' | 'given' | 'bank'>>;
  /** Wrong picks allowed. The game ends on the last one. None: wrong picks never end a game. */
  tries?: number;
  answers(p: P): readonly AnswerInfo[];
  /** Evaluate a finished selection. Matching lives in the engine, never in UI. */
  check(p: P, a: number, b: number, found: ReadonlySet<string>): Evaluation;
  /**
   * The unfound answer a hint marks, and the letter to mark: where the answer starts as it is read. `kind` is
   * the pet's way of choosing (`hintAnswer`), `lastAt` where the player's last find began.
   */
  hint(p: P, found: ReadonlySet<string>, kind?: HintKind, lastAt?: number | null): { key: string; at: number } | null;
  /** Spans to shade for unfound answers after finish. */
  missed(p: P, found: ReadonlySet<string>): Span[];
  /** After finish: each unfound answer and the words it hides in, in reading order. */
  reveal(p: P, found: ReadonlySet<string>): RevealItem[];
  /** Sort key for unfound rows in the word list. */
  listOrder(p: P): (key: string) => number;
  Board: ComponentType<PuzzleProps>;
};

type Built = HiddenWordsPuzzle<GameDef>;

type Rules = {
  family: Family;
  build: (def: GameDef) => Built;
  evaluate: Evaluate;
  /** Read right to left: an answer starts at the end of its span. */
  backwards?: boolean;
  listOrder: (p: Built) => (key: string) => number;
};

/** Every type so far is a stream of letters or digits with answers at spans, so they share all but these rules. */
const spans = (o: Rules): GameModule<Built> => ({
  family: o.family,
  build: o.build,
  boardProps: (p) => ({ chars: p.chars, letters: p.S.length }),
  answers: (p) => p.answers.map((a) => ({ key: a.key, label: a.label, length: a.spans[0]![1] - a.spans[0]![0] + 1 })),
  check: (p, a, b, found) => o.evaluate(p, a, b, found),
  hint(p, found, kind, lastAt) {
    const next = hintAnswer(p.answers, found, kind, lastAt);
    return next ? { key: next.key, at: next.spans[0]![o.backwards ? 1 : 0] } : null;
  },
  missed: (p, found) => p.answers.filter((a) => !found.has(a.key)).map((a) => a.spans[0]!),
  reveal: (p, found) =>
    p.answers
      .filter((a) => !found.has(a.key))
      .map((a) => ({ key: a.key, label: a.label, span: a.spans[0]!, parts: revealParts(p.chars, a.spans[0]!) })),
  listOrder: o.listOrder,
  Board: Puzzle,
});

const byPlace = (p: Built) => (key: string) => p.answers.findIndex((a) => a.key === key);

export const registry: Record<GameType, GameModule<Built>> = {
  'hidden-words': spans({
    family: 'verbal',
    build: (def) => buildHiddenWords(def),
    evaluate: EVALUATE['hidden-words'],
    listOrder(p) {
      const order = p.dict.map(norm);
      return (key) => order.indexOf(key);
    },
  }),
  mirror: spans({ family: 'verbal', build: (def) => buildMirror(def), evaluate: EVALUATE.mirror, backwards: true, listOrder: byPlace }),
  'buried-sums': {
    ...spans({ family: 'quantitative', build: (def) => buildSums(def), evaluate: EVALUATE['buried-sums'], listOrder: byPlace }),
    // Digits as tiles, with the target and a running total above them.
    boardProps: (p) => ({ chars: p.chars, letters: p.S.length, variant: 'tiles', target: sumsTarget(p) }),
  },
  unmask: {
    ...spans({ family: 'verbal', build: (def) => buildUnmask(def), evaluate: EVALUATE.unmask, listOrder: byPlace }),
    boardProps: (p) => ({ chars: p.chars, letters: p.S.length, text: p.text, given: givenOf(p), bank: bankOf(p) }),
    tries: UNMASK_TRIES,
    // Nothing to step through after: the name is told when the mask comes off. A hint points at a key.
    missed: () => [],
    reveal: () => [],
    Board: UnmaskBoard,
  },
};

/** The family of a game type. */
export const familyOf = (type: GameType): Family => registry[type].family;
