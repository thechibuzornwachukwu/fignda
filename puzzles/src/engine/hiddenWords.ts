import { toChars, type Char } from './text';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type HiddenWordsDef = { text: string; dict: readonly string[] };

export type Answer = {
  /** Normalised: lowercase a-z only. */
  key: string;
  /** Display form: dict word with first letter capitalised. */
  label: string;
  /** Every occurrence as inclusive [start, end] in `S`. */
  spans: Array<[number, number]>;
};

export type HiddenWordsPuzzle<D extends HiddenWordsDef = HiddenWordsDef> = Omit<D, 'difficulty'> & {
  chars: Char[];
  /** Lowercase letter stream. Selections index into this. */
  S: string;
  /** Sorted by first occurrence. */
  answers: Answer[];
  difficulty: Difficulty;
};

export const norm = (s: string): string => String(s).toLowerCase().replace(/[^a-z]/g, '');

/** Hard if 20+ answers or 900+ chars. Easy if 9 or fewer and under 260 chars. Else Medium. */
export function difficultyOf(answers: number, chars: number): Difficulty {
  return answers >= 20 || chars >= 900 ? 'Hard' : answers <= 9 && chars < 260 ? 'Easy' : 'Medium';
}

export function buildHiddenWords<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = toChars(def.text);
  const seen = new Set<string>();
  const answers: Answer[] = [];
  for (const w of def.dict) {
    const k = norm(w);
    if (k.length < 3 || seen.has(k)) continue;
    const spans: Array<[number, number]> = [];
    let i = S.indexOf(k);
    while (i >= 0) {
      spans.push([i, i + k.length - 1]);
      i = S.indexOf(k, i + 1);
    }
    if (spans.length) {
      seen.add(k);
      answers.push({ key: k, label: w.charAt(0).toUpperCase() + w.slice(1), spans });
    }
  }
  answers.sort((a, b) => a.spans[0]![0] - b.spans[0]![0]);
  return { ...def, chars, S, answers, difficulty: difficultyOf(answers.length, def.text.length) };
}
