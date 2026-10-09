import { storage } from './storage';

export type Stars = 0 | 1 | 2 | 3;

/** Best stars per catalogue puzzle in this browser. A replay can only raise them. */
const KEY = 'gazecraft-stars';

export function loadStars(): Record<string, Stars> {
  const v = storage.getJSON<unknown>(KEY);
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, Stars> = {};
  for (const [id, n] of Object.entries(v)) {
    if (n === 1 || n === 2 || n === 3) out[id] = n;
  }
  return out;
}

/** Keep the better of the old and the new. Returns true when the stars went up. */
export function recordStars(id: string, stars: Stars): boolean {
  if (stars === 0) return false;
  const cur = loadStars();
  if ((cur[id] ?? 0) >= stars) return false;
  storage.setJSON(KEY, { ...cur, [id]: stars });
  return true;
}
