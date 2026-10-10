// Sittings (SPEC section 9, Passages). A long puzzle cut into short passages that can each be played alone. Pure.
// A cut is made only at a sentence end that no answer runs across, so a passage hides exactly the words that
// lie inside it and the passages together hide every word of the whole puzzle.

import type { HiddenWordsPuzzle } from './hiddenWords';
import { rangeText, sentences } from './text';

export const PASSAGE_MIN = 5;
export const PASSAGE_MAX = 9;

export type Passage = {
  /** The passage as written, trimmed. With the puzzle's `dict` it builds into a puzzle of its own. */
  text: string;
  /** Letters of the whole puzzle before this passage: a letter index here plus `offset` is its index there. */
  offset: number;
  /** How many letters it holds. */
  letters: number;
  /** Keys of the answers hidden inside it, by first place in the passage. A word hidden twice can be in 2 passages. */
  answers: string[];
};

/** A passage short of the minimum costs far more than one over the maximum: a short tail joins the one before. */
const SHORT = 1000;
const cost = (n: number) => (n < PASSAGE_MIN ? (PASSAGE_MIN - n) * SHORT : Math.max(0, n - PASSAGE_MAX));

/**
 * The puzzle as passages of 5 to 9 answers, in reading order. As many as the text allows, as even as it allows.
 * One passage, the whole text, when no clean cut gives 2 that are both long enough. None for an empty text.
 */
export function passages(puzzle: Pick<HiddenWordsPuzzle, 'text' | 'chars' | 'S' | 'answers'>): Passage[] {
  const sents = sentences(puzzle.text, puzzle.chars);
  if (sents.length === 0) return [];

  // Letters before each sentence boundary. bounds[0] is the start, bounds[n] the end.
  const bounds = [0];
  for (const s of sents) bounds.push(s.le >= 0 ? s.le + 1 : bounds[bounds.length - 1]!);
  const spans = puzzle.answers.flatMap((a) => a.spans.map((span) => ({ key: a.key, span }))).sort((x, y) => x.span[0] - y.span[0]);
  const clean = (b: number) => !spans.some(({ span }) => span[0] < b && span[1] >= b);
  // "Need a pen? asked Mika." is one sentence to a reader: a passage never opens on a small letter.
  const opens = (i: number) => {
    const first = puzzle.chars.slice(sents[i]!.cs, sents[i]!.ce).find((c) => c.li >= 0);
    return !!first && first.ch !== first.ch.toLowerCase();
  };
  // Sentence boundaries a passage may start or end on: both ends, and every clean one between.
  const stops = bounds.map((_, i) => i).filter((i) => i === 0 || i === sents.length || (clean(bounds[i]!) && opens(i)));

  const inside = (from: number, to: number) => {
    const keys: string[] = [];
    for (const { key, span } of spans) {
      if (span[0] >= bounds[from]! && span[1] < bounds[to]! && !keys.includes(key)) keys.push(key);
    }
    return keys;
  };

  // best[j]: the cheapest way to cut everything before stop j. Among equals the one with the most passages,
  // and among those the most even: 7 and 7 reads better than 5 and 9. Squares are smallest when sizes are level.
  type Best = { cost: number; count: number; squares: number; from: number };
  const best: Best[] = [{ cost: 0, count: 0, squares: 0, from: -1 }];
  for (let j = 1; j < stops.length; j++) {
    let b: Best | null = null;
    for (let i = 0; i < j; i++) {
      const size = inside(stops[i]!, stops[j]!).length;
      const c = best[i]!.cost + cost(size);
      const n = best[i]!.count + 1;
      const sq = best[i]!.squares + size * size;
      if (!b || c < b.cost || (c === b.cost && (n > b.count || (n === b.count && sq < b.squares)))) b = { cost: c, count: n, squares: sq, from: i };
    }
    best.push(b!);
  }

  const cuts: Array<[number, number]> = [];
  for (let j = stops.length - 1; j > 0; j = best[j]!.from) cuts.unshift([stops[best[j]!.from]!, stops[j]!]);
  // A cut that leaves any passage short is no cut: the puzzle stays whole.
  const parts = cuts.every(([a, b]) => inside(a, b).length >= PASSAGE_MIN) ? cuts : [[0, sents.length] as [number, number]];

  return parts.map(([a, b]) => ({
    text: rangeText(puzzle.chars, sents, a, b - 1),
    offset: bounds[a]!,
    letters: bounds[b]! - bounds[a]!,
    answers: inside(a, b),
  }));
}
