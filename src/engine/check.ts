import type { Answer } from './hiddenWords';

export type CheckResult =
  | { kind: 'hit'; answer: Answer }
  | { kind: 'already'; answer: Answer }
  | { kind: 'ignore' }
  | { kind: 'wrong'; str: string };

/** Selection a..b are positions in the letter stream `S`, either direction. */
export function check(
  puzzle: { S: string; answers: readonly Answer[] },
  a: number,
  b: number,
  found: ReadonlySet<string>,
): CheckResult {
  if (a > b) [a, b] = [b, a];
  const str = puzzle.S.slice(a, b + 1);
  const hit = puzzle.answers.find((x) => x.key === str);
  if (hit) return found.has(hit.key) ? { kind: 'already', answer: hit } : { kind: 'hit', answer: hit };
  if (b - a < 2) return { kind: 'ignore' };
  return { kind: 'wrong', str };
}

/**
 * Near miss against unfound answer keys: same length with one letter off,
 * or one letter short or long at either end. Keys under 4 letters never count.
 */
export function isClose(sel: string, keys: readonly string[]): boolean {
  return keys.some((k) => {
    if (Math.abs(k.length - sel.length) > 1 || k.length < 4) return false;
    if (k.length === sel.length) {
      let d = 0;
      for (let i = 0; i < k.length; i++) if (k[i] !== sel[i]) d++;
      return d === 1;
    }
    const [a, b] = k.length > sel.length ? [k, sel] : [sel, k];
    return a.slice(1) === b || a.slice(0, -1) === b;
  });
}
