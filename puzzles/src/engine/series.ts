// Number series: a row of digits hides runs of 3 or more that step by the same amount (1 3 5 7 steps by 2,
// 9 6 3 0 by -3). Find each run. Pure, and made by the engine from a seed, so the same clue is the same row on
// every device and on the server. The count comes from the engine, never from an author.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { hashOf, seeded } from './seed';
import { digitBoard } from './sums';

/** How long a row is and how many runs it hides, growing through a pack. */
export const SERIES_LEVELS = [
  { digits: 16, runs: 2 },
  { digits: 22, runs: 3 },
  { digits: 28, runs: 4 },
] as const;
/** The shortest run that counts, and the largest step. A step of 0 (5 5 5) is a repeat, not a series. */
export const SERIES_MIN = 3;
const STEP_MAX = 4;
const TRIES = 4000;

/**
 * Every run in `digits` of `SERIES_MIN` or more that steps by one amount (not 0, at most `STEP_MAX` either way),
 * longest first where runs overlap, as inclusive [first, last] in reading order. A run is maximal: 1 3 5 7 is one
 * run, never also 1 3 5.
 */
export function seriesIn(digits: readonly number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let a = 0;
  while (a + SERIES_MIN <= digits.length) {
    const step = digits[a + 1]! - digits[a]!;
    let b = a + 1;
    if (step !== 0 && Math.abs(step) <= STEP_MAX) while (b + 1 < digits.length && digits[b + 1]! - digits[b]! === step) b++;
    if (b - a + 1 >= SERIES_MIN && step !== 0 && Math.abs(step) <= STEP_MAX) {
      out.push([a, b]);
      a = b + 1;
    } else a++;
  }
  return out;
}

/** The step a run moves by: "+2", "-3". */
const stepOf = (S: string, [a]: readonly [number, number]) => {
  const d = Number(S[a + 1]) - Number(S[a]);
  return d > 0 ? `+${d}` : String(d);
};

/** The row for `seed`: digits 0 to 9 with exactly the level's count of runs, none touching another. */
export function seriesClue(seed: string, level = 0): HiddenWordsDef {
  const { digits: n, runs: want } = SERIES_LEVELS[Math.min(Math.max(0, Math.floor(level)), SERIES_LEVELS.length - 1)]!;
  const random = seeded(hashOf(`series:${seed}`));
  for (let t = 0; t < TRIES; t++) {
    const digits = Array.from({ length: n }, () => Math.floor(random() * 10));
    // Plant the runs, spread out: one in each stretch of the row.
    for (let r = 0; r < want; r++) {
      const len = SERIES_MIN + Math.floor(random() * 2);
      const step = (1 + Math.floor(random() * STEP_MAX)) * (random() < 0.5 ? -1 : 1);
      const first = step > 0 ? Math.floor(random() * (10 - step * (len - 1))) : -step * (len - 1) + Math.floor(random() * (10 + step * (len - 1)));
      const room = Math.floor(n / want);
      const at = r * room + Math.floor(random() * Math.max(1, room - len));
      for (let k = 0; k < len; k++) digits[at + k] = first + step * k;
    }
    if (digits.some((d) => d < 0 || d > 9)) continue;
    const runs = seriesIn(digits);
    const apart = runs.every((x, i) => i === 0 || x[0] > runs[i - 1]![1] + 1);
    if (runs.length === want && apart) return { text: digits.join(' '), dict: [] };
  }
  // Never reached in practice: a plain counting run still plays.
  return { text: Array.from({ length: n }, (_, i) => (i < 3 ? i + 1 : 0)).join(' '), dict: [] };
}

/** A series puzzle: the digits as tiles, each run an answer named by where it sits and shown with its step. */
export function buildSeries<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = digitBoard(def.text);
  const answers: Answer[] = seriesIn([...S].map(Number)).map((span) => ({
    key: `${span[0]}-${span[1]}`,
    label: `${[...S.slice(span[0], span[1] + 1)].join(' ')} (${stepOf(S, span)})`,
    spans: [span],
  }));
  return { ...def, chars, S, answers, difficulty: answers.length > 3 ? 'Medium' : 'Easy' };
}
