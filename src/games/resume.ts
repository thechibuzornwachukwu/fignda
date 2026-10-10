// Save and resume (SPEC section 5). A game left unfinished carries on where it stopped, and its clock counts
// time on the puzzle, not time away. The clock rule is for every game played alone, the daily included.
// The store here is for puzzles that are not the daily, which keeps its own (`gazecraft-daily-N`).

import { storage } from '../lib/storage';
import type { SavedSession } from './session';

/** One small record per puzzle, so a pick rewrites that game and nothing else. */
const PREFIX = 'gazecraft-resume-';
/**
 * A guard on storage, not a rule of play: more than the whole catalogue and its passages, so a player never
 * meets it. Past it, the game left longest ago goes first.
 */
export const RESUME_MAX = 100;

const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * The game with `awayMs` taken off its clock. The clock is `now - startAt`, so time away moves the start forward.
 * A finished game is left alone. Pure.
 */
export function withoutAway<T extends SavedSession>(s: T, awayMs: number, now: number): T {
  if (s.endAt != null) return s;
  // The play log's times must never run backwards, whatever the device clock did while away.
  const logged = Math.max(0, ...(s.log?.events ?? []).map((e) => e.t), ...(s.log?.hints ?? []));
  const startAt = Math.min(s.startAt + (isTime(awayMs) ? Math.max(0, awayMs) : 0), now - logged);
  const moved = startAt - s.startAt;
  return moved === 0 ? s : { ...s, startAt, lastFindAt: s.lastFindAt == null ? null : s.lastFindAt + moved };
}

/**
 * A stored game as it is played now. `leftAt` is written when the player leaves, so the time since is time away.
 * With no `leftAt` the page went without a word (a crash): the clock ran on, which never shortens a ranked time.
 */
export function returned<T extends SavedSession>(s: T, now: number): T {
  if (s.leftAt == null) return s;
  const { leftAt, ...rest } = s;
  return withoutAway(rest as T, now - leftAt, now);
}

/** An unfinished game, or null for anything else that was stored. */
function read(key: string): SavedSession | null {
  const s = storage.getJSON<Partial<SavedSession> | null>(key);
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  if (!isTime(s.startAt) || s.endAt != null || !Array.isArray(s.found)) return null;
  if (!s.found.every((f) => f && typeof f.key === 'string' && Array.isArray(f.span))) return null;
  if (s.leftAt != null && !isTime(s.leftAt)) return null;
  return s as SavedSession;
}

/** When the player was last on it. */
const lastOn = (s: SavedSession) => s.leftAt ?? s.startAt;

/** Remove the game left longest ago, never `keep`. False when there is nothing left to remove. */
function dropOldest(keep: string): boolean {
  let oldest: { key: string; at: number } | null = null;
  for (const key of storage.keys(PREFIX)) {
    if (key === keep) continue;
    const s = read(key);
    // Something unreadable under our name is the first to go.
    const at = s ? lastOn(s) : -Infinity;
    if (!oldest || at < oldest.at) oldest = { key, at };
  }
  if (!oldest) return false;
  storage.remove(oldest.key);
  return true;
}

/** The game left unfinished on this puzzle, its clock where it stopped. Null when there is none. */
export function loadResume(id: string, now: number): SavedSession | null {
  const s = read(PREFIX + id);
  return s ? returned(s, now) : null;
}

/** Keep an unfinished game. With `leftAt` when the player is leaving it. */
export function saveResume(id: string, s: SavedSession): void {
  const key = PREFIX + id;
  const isNew = storage.get(key) == null;
  // Storage that is full makes room from the oldest games rather than lose the one being played.
  while (!storage.setJSON(key, s)) if (!dropOldest(key)) return;
  if (isNew) while (storage.keys(PREFIX).length > RESUME_MAX && dropOldest(key));
}

export function clearResume(id: string): void {
  storage.remove(PREFIX + id);
}
