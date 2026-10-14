// What a finished selection is, for each game type. Pure, and the one place matching lives: the board and the
// server's replay both ask here.

import { check, isClose } from './check';
import type { Answer } from './hiddenWords';
import { reversed } from './mirror';

export type Evaluation =
  | { kind: 'hit'; key: string; label: string; span: [number, number] }
  | { kind: 'already' }
  /** A near miss: no penalty. */
  | { kind: 'close' }
  | { kind: 'wrong' }
  | { kind: 'ignore' };

type Board = { S: string; answers: readonly Answer[] };
export type Evaluate = (p: Board, a: number, b: number, found: ReadonlySet<string>) => Evaluation;

const unfound = (p: Board, found: ReadonlySet<string>) => p.answers.filter((x) => !found.has(x.key));

/** Hidden words: the letters picked spell an answer, wherever they were picked. */
export const evalWords: Evaluate = (p, a, b, found) => {
  const [x, y] = a <= b ? [a, b] : [b, a];
  const r = check(p, x, y, found);
  if (r.kind === 'hit') return { kind: 'hit', key: r.answer.key, label: r.answer.label, span: [x, y] };
  if (r.kind !== 'wrong') return { kind: r.kind };
  const keys = unfound(p, found).map((k) => k.key);
  return isClose(r.str, keys) ? { kind: 'close' } : { kind: 'wrong' };
};

/** Mirror: the same, with the letters read right to left. */
export const evalMirror: Evaluate = (p, a, b, found) => {
  const [x, y] = a <= b ? [a, b] : [b, a];
  const last = p.S.length - 1;
  const r = evalWords({ S: reversed(p.S), answers: p.answers }, last - y, last - x, found);
  return r.kind === 'hit' ? { ...r, span: [x, y] } : r;
};

/** Buried sums: the run picked is an answer's own run. One digit short or long at one end is a near miss. */
export const evalSums: Evaluate = (p, a, b, found) => {
  const [x, y] = a <= b ? [a, b] : [b, a];
  const hit = p.answers.find((k) => k.spans[0]![0] === x && k.spans[0]![1] === y);
  if (hit) return found.has(hit.key) ? { kind: 'already' } : { kind: 'hit', key: hit.key, label: hit.label, span: [x, y] };
  if (x === y) return { kind: 'ignore' };
  const near = unfound(p, found).some(({ spans: [s] }) => (x === s![0] && Math.abs(y - s![1]) === 1) || (y === s![1] && Math.abs(x - s![0]) === 1));
  return near ? { kind: 'close' } : { kind: 'wrong' };
};

export const EVALUATE = { 'hidden-words': evalWords, mirror: evalMirror, 'buried-sums': evalSums } as const;
