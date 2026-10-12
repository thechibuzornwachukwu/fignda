// Unmask: the last clue of a case. The player guesses letters to spell out who the culprit is. Pure.
// The board is the alphabet: a pick is one letter, an answer is a letter the name holds. So the shell, the play
// log and the server's replay treat it as they treat every other game.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import type { Char } from './text';

/** Wrong letters allowed. The game ends on the last one, and the mask comes off either way. */
export const UNMASK_TRIES = 6;
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** The name to spell, from who the culprit is: "the choir leader" is CHOIR LEADER. "The" is given. */
export const unmaskName = (who: string): string =>
  who
    .trim()
    .replace(/^the\s+/i, '')
    .toUpperCase();

/**
 * The board for a name (`def.text`): `S` is the alphabet, and each answer is one letter of the name, once,
 * in alphabet order, at its own place in the alphabet. Digits and spaces in a name are shown, never guessed.
 */
export function buildUnmask<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const chars: Char[] = [...ALPHABET].map((ch, li) => ({ ch, li }));
  const name = def.text.toLowerCase();
  const answers: Answer[] = [...ALPHABET].flatMap((ch, i) => (name.includes(ch) ? [{ key: ch, label: ch.toUpperCase(), spans: [[i, i] as [number, number]] }] : []));
  return { ...def, chars, S: ALPHABET, answers, difficulty: 'Easy' };
}

/** The name as it stands: each letter shown once it is found, else an empty string. Anything not a letter is shown. */
export function unmaskSlots(name: string, found: ReadonlySet<string>): string[] {
  return [...name].map((ch) => (/[a-z]/i.test(ch) ? (found.has(ch.toLowerCase()) ? ch.toUpperCase() : '') : ch));
}

/**
 * The picks that count: everything up to and including the wrong letter that uses the last try. A log that
 * keeps guessing after that is cut there, so nobody finds the name with 20 wrong letters.
 */
export function withinTries<E extends { a: number; b: number }>(p: { answers: readonly Answer[] }, events: readonly E[], tries = UNMASK_TRIES): E[] {
  const letters = new Set(p.answers.map((a) => a.spans[0]![0]));
  const out: E[] = [];
  let wrong = 0;
  for (const e of events) {
    if (wrong >= tries) break;
    out.push(e);
    if (e.a === e.b && e.a >= 0 && e.a < ALPHABET.length && !letters.has(e.a)) wrong++;
  }
  return out;
}
