// Liar: a short paragraph of plain statements, 1 or 2 of them false. Tap the false ones. Pure. The statements
// are written and checked by hand (data/liar.json): the engine can say which statement was picked, never whether
// it is true, so fairness is editorial.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { hashOf, seeded } from './seed';
import { toChars } from './text';

export type Statement = { s: string; t: boolean; src?: string };

/** How many statements a clue shows, and how many of them lie (1 or 2, by seed). */
export const LIAR_SHOWN = 5;
const LIAR_FALSE = [1, 2] as const;

/** Shuffle, seeded. */
function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * The Liar clue for `seed` from a category's statements: `LIAR_SHOWN` of them, 1 or 2 false, in a seeded order.
 * `dict` holds the false ones, word for word. None when the category has too few of either kind.
 */
export function liarClue(statements: readonly Statement[], seed: string): HiddenWordsDef | null {
  const random = seeded(hashOf(`liar:${seed}`));
  const lies = statements.filter((x) => !x.t);
  const truths = statements.filter((x) => x.t);
  const nFalse = LIAR_FALSE[Math.floor(random() * LIAR_FALSE.length)]!;
  if (lies.length < nFalse || truths.length < LIAR_SHOWN - nFalse) return null;
  const picked = shuffled([...shuffled(lies, random).slice(0, nFalse), ...shuffled(truths, random).slice(0, LIAR_SHOWN - nFalse)], random);
  // One statement a line, so where each ends is plain.
  return { text: picked.map((x) => x.s).join('\n'), dict: picked.filter((x) => !x.t).map((x) => x.s) };
}

/** A Liar puzzle: each false statement of `dict` is an answer over its whole span of letters. */
export function buildLiar<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = toChars(def.text);
  const answers: Answer[] = [];
  for (const lie of def.dict) {
    const at = def.text.indexOf(lie);
    if (at < 0) continue;
    // The letters of the statement: from its first letter to its last, by where they sit in the text.
    const lis = chars.slice(at, at + lie.length).flatMap((c) => (c.li >= 0 ? [c.li] : []));
    if (lis.length === 0) continue;
    answers.push({ key: `lie${lis[0]}`, label: lie, spans: [[lis[0]!, lis.at(-1)!]] });
  }
  answers.sort((a, b) => a.spans[0]![0] - b.spans[0]![0]);
  return { ...def, chars, S, answers, difficulty: answers.length > 1 ? 'Medium' : 'Easy' };
}
