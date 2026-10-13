import { storage } from './storage';
import type { Stars } from './starStore';

/**
 * Best stars per step of a written chapter, in this browser. Kept apart from the catalogue's stars: a chapter has
 * no row on the server yet, so nothing here is ever sent or merged into an account.
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

/** Keep the better of the old and the new. Returns the best there now is. */
export function recordChapterStars(id: string, n: number, stars: Stars): Stars {
  const all = load();
  const cur = all[id]?.[n] ?? 0;
  if (stars <= cur) return cur;
  storage.setJSON(KEY, { ...all, [id]: { ...all[id], [n]: stars } });
  return stars;
}
