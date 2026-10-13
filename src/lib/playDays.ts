// The days a player finished something that is not a daily: a clue on the path, or a step of a written case
// (BUILD_PLAN set 4a). The run counts them, so nobody's run ends because the daily did. Kept in this browser.

import { dayNo } from '../engine/daily';
import { storage } from './storage';

const KEY = 'gazecraft-days';
/** A little over 2 years. Older days cannot be part of a run that is still going. */
const KEEP = 800;

/** UTC day numbers, as the daily counts them. Anything that is not a whole day number is dropped. */
export function loadPlayDays(): number[] {
  const v = storage.getJSON<unknown>(KEY);
  return Array.isArray(v) ? [...new Set(v.filter((d): d is number => Number.isInteger(d) && d > 0))] : [];
}

/** Remember that something was finished today. Safe to repeat. */
export function markPlayedToday(day: number = dayNo()): void {
  const cur = loadPlayDays();
  if (cur.includes(day)) return;
  storage.setJSON(KEY, [...cur, day].sort((a, b) => a - b).slice(-KEEP));
}
