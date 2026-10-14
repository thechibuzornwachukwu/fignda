// Unmask: the last clue of a case. The player picks letters to spell out who the culprit is. Pure.
// It is the end of a case, so it is made to be won: the first letter of each word is given, and the letters
// to pick from are a small bank, the name's own and a few that are not in it.
// The board is the alphabet: a pick is one letter, an answer is a letter the player must find. So the shell,
// the play log and the server's replay treat it as they treat every other game.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { hashOf, seeded } from './secret';
import type { Char } from './text';

/** Wrong letters allowed. The game ends on the last one, and the mask comes off either way. */
export const UNMASK_TRIES = 6;
/** Letters in the bank that are not in the name. As many as the tries, so only picking every one of them loses. */
export const UNMASK_DECOYS = 6;
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const lettersOf = (s: string): string[] => [...new Set([...s.toLowerCase()].filter((ch) => ALPHABET.includes(ch)))];

/** The name to spell, from who the culprit is: "the choir leader" is CHOIR LEADER. "The" is given. */
export const unmaskName = (who: string): string =>
  who
    .trim()
    .replace(/^the\s+/i, '')
    .toUpperCase();

/** The most letters a player is left to find. A longer name gives more away at the start. */
export const UNMASK_FIND = 6;

/**
 * The letters given at the start: the first letter of each word, wherever else it stands in the name too.
 * Where that leaves more than `UNMASK_FIND` to find, the letter the name uses most is given as well, and the
 * next, until it does not. Ties go to the earlier letter of the alphabet.
 */
export function unmaskGiven(name: string): string {
  const all = lettersOf(name);
  const given = new Set(lettersOf(name.split(/\s+/).map((w) => w[0] ?? '').join('')));
  const uses = (ch: string) => [...name.toLowerCase()].filter((x) => x === ch).length;
  while (all.length - given.size > UNMASK_FIND) {
    const next = all.filter((ch) => !given.has(ch)).sort((a, b) => uses(b) - uses(a) || (a < b ? -1 : 1))[0]!;
    given.add(next);
  }
  return [...given].sort().join('');
}

/**
 * The unmasking of a case, from who the culprit is and the case's id: the name, the letters given, and the
 * bank of letters to pick from, in alphabet order. The same on every device and on the server.
 * `dict` is [given, bank].
 */
export function unmaskClue(who: string, seed: string): HiddenWordsDef {
  const text = unmaskName(who);
  const given = unmaskGiven(text);
  const wanted = lettersOf(text).filter((ch) => !given.includes(ch));
  const rest = [...ALPHABET].filter((ch) => !lettersOf(text).includes(ch));
  const random = seeded(hashOf(`unmask:${seed}`));
  const decoys: string[] = [];
  while (decoys.length < UNMASK_DECOYS && rest.length) decoys.push(rest.splice(Math.floor(random() * rest.length), 1)[0]!);
  return { text, dict: [given, [...wanted, ...decoys].sort().join('')] };
}

/** The letters given at the start of a built or defined unmasking, and its bank. */
export const givenOf = (def: Pick<HiddenWordsDef, 'dict'>): string => def.dict[0] ?? '';
export const bankOf = (def: Pick<HiddenWordsDef, 'dict'>): string => def.dict[1] ?? ALPHABET;

/**
 * The board for a name (`def.text`): `S` is the alphabet, and each answer is one letter of the name that was
 * not given, once, in alphabet order, at its own place in the alphabet. Digits and spaces are shown, never picked.
 */
export function buildUnmask<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const chars: Char[] = [...ALPHABET].map((ch, li) => ({ ch, li }));
  const name = def.text.toLowerCase();
  const given = givenOf(def);
  const answers: Answer[] = [...ALPHABET].flatMap((ch, i) =>
    name.includes(ch) && !given.includes(ch) ? [{ key: ch, label: ch.toUpperCase(), spans: [[i, i] as [number, number]] }] : [],
  );
  return { ...def, chars, S: ALPHABET, answers, difficulty: 'Easy' };
}

/** The name as it stands: each letter shown once it is found or given, else an empty string. Anything not a letter is shown. */
export function unmaskSlots(name: string, found: ReadonlySet<string>, given = ''): string[] {
  return [...name].map((ch) => (/[a-z]/i.test(ch) ? (found.has(ch.toLowerCase()) || given.includes(ch.toLowerCase()) ? ch.toUpperCase() : '') : ch));
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
