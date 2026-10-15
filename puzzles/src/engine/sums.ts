// Buried sums: a row of digits, and the runs in it that add up to a target. Pure, and made by the engine from a
// seed, so the same clue is the same row on every device and on the server, and there is always another one.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { hashOf, seeded } from './seed';
import type { Char } from './text';

/** How long a row is and how many runs it hides. A case's first sums clue is level 0, and they grow from there. */
export const SUMS_LEVELS = [
  { digits: 18, runs: 3 },
  { digits: 24, runs: 4 },
  { digits: 30, runs: 5 },
] as const;
const TARGET_MIN = 10;
const TARGET_MAX = 17;
const TRIES = 4000;

/** Every run of 2 or more digits in a row that adds up to `target`, as inclusive [first, last], in reading order. */
export function runsTo(digits: readonly number[], target: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = 0; a < digits.length; a++) {
    let sum = digits[a]!;
    for (let b = a + 1; b < digits.length && sum < target; b++) {
      sum += digits[b]!;
      if (sum === target) out.push([a, b]);
    }
  }
  return out;
}

const apart = (runs: ReadonlyArray<[number, number]>) => runs.every((r, i) => i === 0 || r[0] > runs[i - 1]![1]);

/**
 * The row for `seed`: digits 1 to 9 (no zero, so a run has one length) with exactly the level's count of runs
 * that reach the target, none sharing a digit. `text` is the row as shown, `dict` holds the target.
 */
export function sumsClue(seed: string, level = 0): HiddenWordsDef {
  const { digits: n, runs: want } = SUMS_LEVELS[Math.min(Math.max(0, Math.floor(level)), SUMS_LEVELS.length - 1)]!;
  const random = seeded(hashOf(`sums:${seed}`));
  let kept: { digits: number[]; target: number; off: number } | null = null;
  for (let t = 0; t < TRIES; t++) {
    const target = TARGET_MIN + Math.floor(random() * (TARGET_MAX - TARGET_MIN + 1));
    const digits = Array.from({ length: n }, () => 1 + Math.floor(random() * 9));
    const runs = runsTo(digits, target);
    if (runs.length === want && apart(runs)) return { text: digits.join(' '), dict: [String(target)] };
    // Never reached in practice. If it ever is, the row closest to the count still plays.
    const off = runs.length === 0 || !apart(runs) ? Infinity : Math.abs(runs.length - want);
    if (!kept || off < kept.off) kept = { digits, target, off };
  }
  return { text: kept!.digits.join(' '), dict: [String(kept!.target)] };
}

/** The target a sums puzzle was built for. */
export const sumsTarget = (def: Pick<HiddenWordsDef, 'dict'>): number => Number(def.dict[0]) || 0;

/**
 * A sums puzzle in the shape every board reads: `S` is the digits, a selection is a run of them, and each
 * answer is one run, named by where it sits ("4-6") and shown as its sum ("3 + 8 + 4").
 */
export function buildSums<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const chars: Char[] = [];
  let S = '';
  for (const ch of def.text) {
    if (ch >= '0' && ch <= '9') {
      chars.push({ ch, li: S.length });
      S += ch;
    } else chars.push({ ch, li: -1 });
  }
  let last = -1;
  for (const c of chars) {
    if (c.li >= 0) last = c.li;
    else c.prev = last;
  }
  let next = -1;
  for (let i = chars.length - 1; i >= 0; i--) {
    const c = chars[i]!;
    if (c.li >= 0) next = c.li;
    else c.next = next;
  }
  const answers: Answer[] = runsTo([...S].map(Number), sumsTarget(def)).map(([a, b]) => ({
    key: `${a}-${b}`,
    label: [...S.slice(a, b + 1)].join(' + '),
    spans: [[a, b]],
  }));
  return { ...def, chars, S, answers, difficulty: answers.length > 4 ? 'Medium' : 'Easy' };
}
