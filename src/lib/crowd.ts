// Leaders opens on your crowd (BUILD_PLAN 2b): circle if you have one, else people you follow, else everyone.

import type { BoardRow, CircleRow } from './api';
import { countOf } from './unlocks';

export const CROWDS = ['circle', 'following', 'everyone'] as const;
export type Crowd = (typeof CROWDS)[number];

/** The board asked for in the address, or null when it names none. */
export function askedCrowd(raw: string | null | undefined): Crowd | null {
  return CROWDS.find((c) => c === raw) ?? null;
}

/** Counts that are missing or not numbers read as 0, so a failed lookup lands on everyone. */
export function defaultCrowd(circles: unknown, following: unknown): Crowd {
  if (countOf(circles) > 0) return 'circle';
  if (countOf(following) > 0) return 'following';
  return 'everyone';
}

/** A circle's day as board rows: members with a score, in rank order, and how many have still to play. */
export function circleRows(rows: unknown): { rows: BoardRow[]; waiting: number } {
  const list = Array.isArray(rows) ? (rows as Array<CircleRow | null>) : [];
  const out: BoardRow[] = [];
  let waiting = 0;
  for (const r of list) {
    if (!r || typeof r.handle !== 'string') continue;
    if (r.rank == null || r.score == null) {
      waiting++;
      continue;
    }
    out.push({ rank: r.rank, handle: r.handle, score: r.score, secs: r.secs ?? 0, found: r.found ?? 0, total: r.total ?? null });
  }
  return { rows: out.sort((a, b) => a.rank - b.rank), waiting };
}
