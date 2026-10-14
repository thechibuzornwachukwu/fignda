// A player's cases on the account and in this browser, levelled (SPEC section 9, Cases on the server). Steps done
// on another device come down; stars only ever rise. A guest's steps stay in the browser until they sign in.

import { fetchChapterProgress } from './api';
import { applyChapterProgress } from './chapterStore';

/** Fired when the account brought steps this browser did not have, so a screen can read them again. */
export const PROGRESS_EVENT = 'lantern-progress';

/** Bring the account's steps here. Fails quietly: the next visit tries again. Returns whether anything came. */
export async function syncProgress(): Promise<boolean> {
  const rows = await fetchChapterProgress().catch(() => []);
  const changed = applyChapterProgress(rows);
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event(PROGRESS_EVENT));
  return changed;
}
