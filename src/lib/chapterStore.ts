import { storage } from './storage';
import type { Stars } from './starStore';

/**
 * Best stars per step of a written chapter, in this browser. Kept apart from the catalogue's stars. Signed in, a
 * step is checked by the server when it is finished, and steps done on another device come down on sign in.
 */
const KEY = 'gazecraft-chapters';

type Kept = Record<string, Record<string, Stars>>;

function load(): Kept {
  const v = storage.getJSON<unknown>(KEY);
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Kept = {};
  for (const [id, steps] of Object.entries(v)) {
    if (!steps || typeof steps !== 'object' || Array.isArray(steps)) continue;
    const kept: Record<string, Stars> = {};
    for (const [n, s] of Object.entries(steps)) if (s === 1 || s === 2 || s === 3) kept[n] = s;
    out[id] = kept;
  }
  return out;
}

/** Stars by step number, counted from 1. A step with none is not finished. */
export function loadChapterStars(id: string): Record<number, Stars> {
  return load()[id] ?? {};
}

/** Rows from the account into this browser. Stars only go up. Returns true when anything was new. */
export function applyChapterProgress(rows: ReadonlyArray<{ chapter: unknown; step: unknown; stars: unknown }>): boolean {
  let changed = false;
  for (const r of rows) {
    const step = Number(r.step);
    const stars = Number(r.stars);
    if (typeof r.chapter !== 'string' || !/^[a-z0-9-]{2,40}$/.test(r.chapter) || !Number.isInteger(step) || step < 1 || step > 12) continue;
    if (stars !== 1 && stars !== 2 && stars !== 3) continue;
    const before = loadChapterStars(r.chapter)[step] ?? 0;
    if (recordChapterStars(r.chapter, step, stars) > before) changed = true;
  }
  return changed;
}

/** Keep the better of the old and the new. Returns the best there now is. */
export function recordChapterStars(id: string, n: number, stars: Stars): Stars {
  const all = load();
  const cur = all[id]?.[n] ?? 0;
  if (stars <= cur) return cur;
  storage.setJSON(KEY, { ...all, [id]: { ...all[id], [n]: stars } });
  return stars;
}
