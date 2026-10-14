import { storage } from './storage';

/** Ids of the catalogue puzzles played to the end in this browser. */
const KEY = 'gazecraft-finished';

export function loadFinished(): string[] {
  const v = storage.getJSON<unknown>(KEY);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Remember a puzzle as finished. Safe to repeat. */
export function markFinished(id: string): void {
  const cur = loadFinished();
  if (!cur.includes(id)) storage.setJSON(KEY, [...cur, id]);
}

export type Shelf = { done: number; total: number };

/** "4 of 12 finished" for each category. Ids that are not in the catalogue count for nothing. */
export function shelfCounts(games: ReadonlyArray<{ id: string; category: string }>, finished: Iterable<string>): Map<string, Shelf> {
  const done = new Set(finished);
  const out = new Map<string, Shelf>();
  for (const g of games) {
    const s = out.get(g.category) ?? { done: 0, total: 0 };
    s.total++;
    if (done.has(g.id)) s.done++;
    out.set(g.category, s);
  }
  return out;
}
