// Sittings (SPEC section 9, Passages). A long puzzle cut into short passages that can each be played alone. Pure.
// A sitting is a sentence, or 2 or 3: about a minute. A cut is made only at a sentence end that no answer runs
// across, so a passage hides exactly the words that lie inside it and the passages together hide every word.

import type { HiddenWordsPuzzle } from './hiddenWords';
import { rangeText, sentences } from './text';

/** Short must not mean thin: a sitting ends with something won, so it hides at least this many answers. */
export const PASSAGE_MIN = 3;
/**
 * Past this a sitting stops being short. People stay on one screen for about 40 seconds before they switch,
 * so a sitting is sized to end inside a minute: 3 to 5 words.
 */
export const PASSAGE_MAX = 5;
/** A passage is 1 to 3 sentences. Longer only when the text gives no other way to reach `PASSAGE_MIN`. */
export const PASSAGE_SENTENCES = 3;

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

// What is wrong with a passage, worst first: too few answers to be worth sitting down to, then too many sentences
// to be short, then more answers than a sitting needs. Each weight is larger than the next one can ever add up to.
const THIN = 1_000_000;
const LONG = 1000;
const cost = (answers: number, sents: number) =>
  (answers < PASSAGE_MIN ? (PASSAGE_MIN - answers) * THIN : 0) + Math.max(0, sents - PASSAGE_SENTENCES) * LONG + Math.max(0, answers - PASSAGE_MAX);

/**
 * The puzzle as passages of 1 to 3 sentences and 3 to 5 answers, in reading order. As many as the text allows,
 * as even as it allows. One passage, the whole text, when no clean cut gives 2 that each hide enough. None for
 * an empty text.
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
  // and among those the most even: 4 and 4 reads better than 3 and 5. Squares are smallest when sizes are level.
  type Best = { cost: number; count: number; squares: number; from: number };
  const best: Best[] = [{ cost: 0, count: 0, squares: 0, from: -1 }];
  for (let j = 1; j < stops.length; j++) {
    let b: Best | null = null;
    for (let i = 0; i < j; i++) {
      const size = inside(stops[i]!, stops[j]!).length;
      const c = best[i]!.cost + cost(size, stops[j]! - stops[i]!);
      const n = best[i]!.count + 1;
      const sq = best[i]!.squares + size * size;
      if (!b || c < b.cost || (c === b.cost && (n > b.count || (n === b.count && sq < b.squares)))) b = { cost: c, count: n, squares: sq, from: i };
    }
    best.push(b!);
  }

  const cuts: Array<[number, number]> = [];
  for (let j = stops.length - 1; j > 0; j = best[j]!.from) cuts.unshift([stops[best[j]!.from]!, stops[j]!]);
  // A cut that leaves any passage thin is no cut: the puzzle stays whole.
  const parts = cuts.every(([a, b]) => inside(a, b).length >= PASSAGE_MIN) ? cuts : [[0, sents.length] as [number, number]];

  return parts.map(([a, b]) => ({
    text: rangeText(puzzle.chars, sents, a, b - 1),
    offset: bounds[a]!,
    letters: bounds[b]! - bounds[a]!,
    answers: inside(a, b),
  }));
}
