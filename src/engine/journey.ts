// The path on the Games tab: one case per catalogue puzzle, easy to hard, and where the player stands on it.
// A case is a run of clues: the puzzle's passages in reading order, then the whole puzzle, the unmasking.
// Answers and difficulty come from the engine, never from the catalogue file.

import { answerDepth } from './depth';
import { buildHiddenWords, type Difficulty, type HiddenWordsPuzzle } from './hiddenWords';
import { passages } from './passages';

export type CatalogueItem = { id: string; category: string; text: string; dict: readonly string[] };

/** One sitting. `n` is the passage, counted from 1, or 0 for the whole puzzle: the unmasking. */
export type Clue = { id: string; puzzle: string; n: number };
/** A case is one puzzle: `id` is the puzzle's. Its last clue is the unmasking. */
export type Case = { id: string; clues: Clue[] };
export type Path = { cases: Case[] };

/** What a clue's stars and kept game are stored under. The unmasking keeps the puzzle's own id, so old scores count. */
export const clueId = (puzzle: string, n: number): string => (n > 0 ? `${puzzle}~${n}` : puzzle);

const TIER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

/**
 * One number for how hard a puzzle is: the engine's difficulty tier first (x100), then how many joins its
 * answers cross on average (x10), then how long they are. Higher is harder.
 */
export function hardness(p: Pick<HiddenWordsPuzzle, 'difficulty' | 'answers' | 'chars'>): number {
  const n = p.answers.length || 1;
  let joins = 0;
  let letters = 0;
  for (const a of p.answers) {
    joins += answerDepth(p, a).joins;
    letters += a.key.length;
  }
  return TIER[p.difficulty] * 100 + (joins / n) * 10 + letters / n;
}

/**
 * Cases by category, in the order categories first appear, easy to hard inside each. A puzzle that is not cut
 * is a case of 1 clue: the whole puzzle.
 */
export function buildPath(catalogue: readonly CatalogueItem[]): Path {
  const cats: string[] = [];
  for (const g of catalogue) if (!cats.includes(g.category)) cats.push(g.category);

  const ranked = catalogue
    .map((item) => {
      const puzzle = buildHiddenWords(item);
      const cut = passages(puzzle).length;
      return { id: item.id, cat: cats.indexOf(item.category), h: hardness(puzzle), cut: cut < 2 ? 0 : cut };
    })
    .sort((a, b) => a.cat - b.cat || a.h - b.h || (a.id < b.id ? -1 : 1));

  const clue = (puzzle: string, n: number): Clue => ({ id: clueId(puzzle, n), puzzle, n });
  return { cases: ranked.map((r) => ({ id: r.id, clues: [...Array.from({ length: r.cut }, (_, i) => clue(r.id, i + 1)), clue(r.id, 0)] })) };
}

export type ClueState = 'done' | 'next' | 'locked';

export type ClueInfo = Clue & { case: number; state: ClueState };

export type Standing = {
  clues: ClueInfo[];
  /** The clue to play now. Null when every clue is done, or the path is empty. */
  next: string | null;
  /** Every clue done. An empty path is not complete. */
  complete: boolean;
  /** One flag per case: all its clues done. */
  casesDone: boolean[];
  /** Clues not done yet, per case. */
  left: number[];
};

/**
 * Where the player stands. Clues open in order: the first one not done is `next`, everything after it is locked,
 * and finishing `next` opens the one after. A clue finished out of order still shows done.
 * `done` holds clue ids. A puzzle's own id in it means the whole puzzle was played, so every clue of its case is
 * done: a score from before the puzzle was cut counts. Ids that are not on the path are ignored.
 * `exists`, when given, lists the puzzles still in the catalogue: a case outside it is left out and blocks nothing.
 */
export function clueStates(path: Path, done: Iterable<string>, exists?: ReadonlySet<string>): Standing {
  const finished = new Set(done);
  const clues: ClueInfo[] = [];
  let next: string | null = null;
  path.cases.forEach((c, ci) => {
    for (const s of c.clues) {
      if (exists && !exists.has(s.puzzle)) continue;
      let state: ClueState = 'done';
      if (!finished.has(s.id) && !finished.has(s.puzzle)) {
        if (next === null) {
          next = s.id;
          state = 'next';
        } else state = 'locked';
      }
      clues.push({ ...s, case: ci, state });
    }
  });
  const mine = path.cases.map((_, ci) => clues.filter((s) => s.case === ci));
  const left = mine.map((m) => m.filter((s) => s.state !== 'done').length);
  const casesDone = mine.map((m, ci) => m.length > 0 && left[ci] === 0);
  return { clues, next, complete: clues.length > 0 && next === null, casesDone, left };
}