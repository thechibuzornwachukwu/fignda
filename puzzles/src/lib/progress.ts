// Cases on the account (SPEC section 9, Cases on the server). The path reads this browser's stars and finished
// puzzles. Signed in, those are kept level with the account: what a guest did here goes up, what was done on
// another device comes down, and neither side ever loses anything.

import { fetchProgress, mergeGuestProgress } from './api';
import { loadFinished, markFinished } from './shelves';
import { loadStars, recordStars, type Stars } from './starStore';

/** Fired on `window` when the account brought something this browser did not have. */
export const PROGRESS_EVENT = 'gazecraft-progress';

const CLUE_RE = /^[a-z0-9-]{2,40}(~[0-9]{1,2})?$/;

/** What this browser holds, as the account takes it: every starred clue, and finished puzzles at 1 star. */
export function localProgress(): Array<{ id: string; stars: Stars }> {
  const stars = loadStars();
  const out = new Map<string, Stars>();
  for (const id of loadFinished()) if (CLUE_RE.test(id)) out.set(id, 1);
  for (const [id, n] of Object.entries(stars)) if (CLUE_RE.test(id)) out.set(id, n);
  return [...out].map(([id, s]) => ({ id, stars: s }));
}

/** Rows from the account into this browser. Stars only go up. Returns true when anything was new. */
export function applyProgress(rows: ReadonlyArray<{ clue_id: unknown; stars: unknown }>): boolean {
  let changed = false;
  const finished = new Set(loadFinished());
  for (const r of rows) {
    if (typeof r.clue_id !== 'string' || !CLUE_RE.test(r.clue_id)) continue;
    const n = Number(r.stars);
    if (n !== 1 && n !== 2 && n !== 3) continue;
    if (recordStars(r.clue_id, n)) changed = true;
    // A whole puzzle: the shelves count it too.
    if (!r.clue_id.includes('~') && !finished.has(r.clue_id)) {
      markFinished(r.clue_id);
      changed = true;
    }
  }
  return changed;
}

/**
 * Signed in only. Up first, so what a guest did here is on the account before anything is read back, then
 * down. Either half may fail without harm: the next sign in or visit tries again.
 */
export async function syncProgress(): Promise<boolean> {
  await mergeGuestProgress(localProgress()).catch(() => 0);
  const rows = await fetchProgress().catch(() => []);
  const changed = applyProgress(rows);
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event(PROGRESS_EVENT));
  return changed;
}
