// The path on the Games tab: chapters of puzzles from the catalogue, easy to hard, and where the player stands on it.
// Answers and difficulty come from the engine, never from the catalogue file.

import { answerDepth } from './depth';
import { buildHiddenWords, type Difficulty, type HiddenWordsPuzzle } from './hiddenWords';

export type CatalogueItem = { id: string; category: string; text: string; dict: readonly string[] };

export type Stop = { id: string };
export type Chapter = { id: string; title: string; stops: Stop[] };
export type Path = { chapters: Chapter[] };

/** Categories with fewer puzzles than this share a chapter with the next small one. */
export const MIN_CHAPTER = 4;
/** A category with more puzzles than this is split into chapters of about equal size. */
export const MAX_CHAPTER = 7;

const TIER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

/**
 * One number for how hard a puzzle is: the engine's difficulty tier first (x100), then how many joins its
 * answers cross on average (x10), then how long they are. Higher is harder.
 */
export function hardness(p: Pick<HiddenWordsPuzzle, 'difficulty' | 'answers' | 'chars'>): number {
  const n = p.answers.length || 1;
  let joins = 0;
  let letters = 0;
  for (const a of p.answers) {
    joins += answerDepth(p, a).joins;
    letters += a.key.length;
  }
  return TIER[p.difficulty] * 100 + (joins / n) * 10 + letters / n;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Chunks of near equal size, none above MAX_CHAPTER. */
function split<T>(items: T[]): T[][] {
  const parts = Math.ceil(items.length / MAX_CHAPTER);
  const out: T[][] = [];
  let at = 0;
  for (let i = 0; i < parts; i++) {
    const size = Math.ceil((items.length - at) / (parts - i));
    out.push(items.slice(at, at + size));
    at += size;
  }
  return out;
}

/** Chapters by category, in the order categories first appear. Small categories join their neighbours. */
export function buildPath(catalogue: readonly CatalogueItem[]): Path {
  const byCat = new Map<string, CatalogueItem[]>();
  for (const g of catalogue) byCat.set(g.category, [...(byCat.get(g.category) ?? []), g]);

  const groups: Array<{ cats: string[]; items: CatalogueItem[] }> = [];
  let carry: { cats: string[]; items: CatalogueItem[] } = { cats: [], items: [] };
  const flush = () => {
    if (carry.items.length) groups.push(carry);
    carry = { cats: [], items: [] };
  };
  for (const [cat, items] of byCat) {
    if (items.length >= MIN_CHAPTER) groups.push({ cats: [cat], items });
    else {
      carry.cats.push(cat);
      carry.items.push(...items);
      if (carry.items.length >= MIN_CHAPTER) flush();
    }
  }
  // Leftover small ones: join the last chapter if it has room, else stand alone.
  const last = groups[groups.length - 1];
  if (carry.items.length && last && last.items.length + carry.items.length <= MAX_CHAPTER) {
    last.cats.push(...carry.cats);
    last.items.push(...carry.items);
  } else flush();

  const chapters: Chapter[] = [];
  for (const g of groups) {
    const ranked = g.items
      .map((item) => ({ id: item.id, h: hardness(buildHiddenWords(item)) }))
      .sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : 1));
    const title = g.cats.join(' and ');
    const parts = split(ranked);
    parts.forEach((part, i) => {
      chapters.push({
        id: slug(title) + (parts.length > 1 ? `-${i + 1}` : ''),
        title: parts.length > 1 ? `${title} ${i + 1}` : title,
        stops: part.map((r) => ({ id: r.id })),
      });
    });
  }
  return { chapters };
}

export type StopState = 'done' | 'next' | 'locked';

export type StopInfo = { id: string; chapter: number; state: StopState };

export type Standing = {
  stops: StopInfo[];
  /** The stop to play now. Null when every stop is done, or the path is empty. */
  next: string | null;
  /** Every stop done. An empty path is not complete. */
  complete: boolean;
  /** One flag per chapter: all its stops done. */
  chaptersDone: boolean[];
};

/**
 * Where the player stands. Stops open in order: the first one not done is `next`, everything after it is locked,
 * and finishing `next` opens the one after. A stop finished out of order (from All games) still shows done.
 * `done` may hold ids that are not on the path (a puzzle since removed): they are ignored.
 * `exists`, when given, lists the ids still in the catalogue: a stop outside it is left out and never blocks the chapter.
 */
export function stopStates(path: Path, done: Iterable<string>, exists?: ReadonlySet<string>): Standing {
  const finished = new Set(done);
  const stops: StopInfo[] = [];
  let next: string | null = null;
  path.chapters.forEach((c, ci) => {
    for (const s of c.stops) {
      if (exists && !exists.has(s.id)) continue;
      let state: StopState = 'done';
      if (!finished.has(s.id)) {
        if (next === null) {
          next = s.id;
          state = 'next';
        } else state = 'locked';
      }
      stops.push({ id: s.id, chapter: ci, state });
    }
  });
  const chaptersDone = path.chapters.map((_, ci) => {
    const mine = stops.filter((s) => s.chapter === ci);
    return mine.length > 0 && mine.every((s) => s.state === 'done');
  });
  return { stops, next, complete: stops.length > 0 && next === null, chaptersDone };
}
