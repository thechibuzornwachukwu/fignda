// The text result: a few lines that paste into any chat. Spoiler free, like the cards.
// It tells the story of the game (find, miss, hint, in the order played) and never which words,
// where they are, or how many are left.

import { formatTime } from './time';

export type Move = { a: number; b: number; t: number };

export const MARK = { find: '🟩', miss: '⬜', hint: '💡' } as const;
const PER_ROW = 10;
const MAX_MARKS = 40;

/** One mark per move in play order. Picks under 3 letters were never guesses, so they are left out. */
export function storyMarks(events: readonly Move[], hints: readonly number[], found: ReadonlyArray<readonly [number, number]>): string[] {
  const left = new Set(found.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const moves: Array<{ t: number; mark: string }> = hints.map((t) => ({ t, mark: MARK.hint }));
  for (const e of events) {
    const lo = Math.min(e.a, e.b);
    const hi = Math.max(e.a, e.b);
    const key = `${lo}-${hi}`;
    if (left.delete(key)) moves.push({ t: e.t, mark: MARK.find });
    else if (hi - lo >= 2) moves.push({ t: e.t, mark: MARK.miss });
  }
  return moves.sort((x, y) => x.t - y.t).map((m) => m.mark);
}

export type ShareTextInput = {
  title: string;
  /** Daily number. Dailies never print the total. */
  daily?: number;
  found: number;
  total: number;
  secs: number;
  score: number;
  marks: readonly string[];
  url: string;
};

export function shareText(i: ShareTextInput): string {
  const head = i.daily ? `Fignda Daily #${i.daily}` : `Fignda · ${i.title}`;
  const count = i.daily ? `${i.found} found` : `${i.found}/${i.total}`;
  const shown = i.marks.slice(0, MAX_MARKS);
  const rows: string[] = [];
  for (let k = 0; k < shown.length; k += PER_ROW) rows.push(shown.slice(k, k + PER_ROW).join(''));
  return [head, `${count} · ${formatTime(i.secs)} · ${i.score.toLocaleString('en-US')}`, ...rows, `Beat it: ${i.url}`].join('\n');
}
