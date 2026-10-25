// Relay: chains of everyday words in the letter stream, each starting on the letter the one before it ended on,
// that letter read once. "Kept a pet ermine" hides KEPT·TAP·PET·TERM·MINE. Pure. Like Mirror it writes nothing new:
// it reads the paragraphs we have, so every pack can carry one.

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { difficultyOf } from './hiddenWords';
import { passages } from './passages';
import { toChars } from './text';

/** A chain has at least this many links. */
export const RELAY_LINKS = 3;
/** A Relay clue hides at least this many chains, and lists no more than the most. */
export const RELAY_MIN = 2;
export const RELAY_MAX = 4;
/** A link is a word of this many letters or more: "a" and "an" would chain through anything. */
const SHORTEST = 3;
/** A Relay clue reads at most this many passages in a row. */
const WINDOW = 3;

export type Chain = { a: number; b: number; links: string[] };

/**
 * The longest chains in the letter stream `S`, none sharing a letter, in reading order. From each letter the
 * engine follows every word that starts there and keeps the longest chain; ties go to the one with longer words.
 */
export function chainsIn(S: string, words: ReadonlySet<string>, longest = 8): Chain[] {
  const n = S.length;
  // Words that start at each letter, by end.
  const starts: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let len = SHORTEST; len <= longest && i + len <= n; len++) if (words.has(S.slice(i, i + len))) starts[i]!.push(i + len - 1);
  }
  // best[i]: the longest chain that starts with a word at i, as [links, letters, the word's end, the rest].
  const best: Array<{ links: number; letters: number; end: number } | null> = new Array(n + 1).fill(null);
  for (let i = n - 1; i >= 0; i--) {
    for (const e of starts[i]!) {
      // The next link starts on this one's last letter: the shared letter is read once.
      const next = e > i ? best[e] : null;
      const links = 1 + (next?.links ?? 0);
      const letters = e - i + (next?.letters ?? 1);
      const cur = best[i];
      if (!cur || links > cur.links || (links === cur.links && letters > cur.letters)) best[i] = { links, letters, end: e };
    }
  }
  const found: Chain[] = [];
  for (let i = 0; i < n; i++) {
    const b = best[i];
    if (!b || b.links < RELAY_LINKS) continue;
    const links: string[] = [];
    let at = i;
    let last = i;
    while (at < n && best[at]) {
      const e = best[at]!.end;
      links.push(S.slice(at, e + 1));
      last = e;
      if (!best[e]) break;
      at = e;
    }
    if (links.length >= RELAY_LINKS) found.push({ a: i, b: last, links });
  }
  // Longest first, then earliest, keeping only chains that share no letter with one already kept.
  const kept: Chain[] = [];
  for (const c of [...found].sort((x, y) => y.links.length - x.links.length || y.b - y.a - (x.b - x.a) || x.a - y.a)) {
    if (kept.every((k) => c.b < k.a || c.a > k.b)) kept.push(c);
  }
  return kept.sort((x, y) => x.a - y.a);
}

const label = (links: readonly string[]) => links.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' · ');

/**
 * The Relay clue of a pack: the shortest run of up to `WINDOW` of its passages that hides `RELAY_MIN` chains, and
 * at most `RELAY_MAX` of them. `dict` holds each chain's links, joined by "+". None when the pack is not cut or no
 * run hides enough.
 */
export function relayClue(puzzle: Pick<HiddenWordsPuzzle, 'text' | 'chars' | 'S' | 'answers'>, words: ReadonlySet<string>): HiddenWordsDef | null {
  const cut = passages(puzzle);
  if (cut.length < 2) return null;
  let best: { text: string; dict: string[]; letters: number } | null = null;
  for (let i = 0; i < cut.length; i++) {
    for (let j = i; j < cut.length && j < i + WINDOW; j++) {
      const text = cut
        .slice(i, j + 1)
        .map((p) => p.text)
        .join(' ');
      const S = toChars(text).S;
      const chains = chainsIn(S, words);
      if (chains.length < RELAY_MIN) continue;
      if (!best || S.length < best.letters) best = { text, dict: chains.slice(0, RELAY_MAX).map((c) => c.links.join('+')), letters: S.length };
      break;
    }
  }
  return best && { text: best.text, dict: best.dict };
}

/** A Relay puzzle: each chain of `dict` ("the+end+dog") is an answer wherever its letters run in the stream. */
export function buildRelay<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = toChars(def.text);
  const answers: Answer[] = [];
  for (const entry of def.dict) {
    const links = entry.split('+').filter(Boolean);
    // Each link after the first starts on the last letter of the one before: that letter is read once.
    const run = links.map((w, i) => (i === 0 ? w : w.slice(1))).join('');
    const at = S.indexOf(run);
    if (links.length < RELAY_LINKS || at < 0) continue;
    answers.push({ key: run, label: label(links), spans: [[at, at + run.length - 1]] });
  }
  answers.sort((a, b) => a.spans[0]![0] - b.spans[0]![0]);
  return { ...def, chars, S, answers, difficulty: difficultyOf(answers.length, def.text.length) };
}
