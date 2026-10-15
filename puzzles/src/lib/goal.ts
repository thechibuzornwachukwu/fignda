// A goal the player picks (BUILD_PLAN set 3e): puzzles a day, apart from the run. Kept in this browser. Light is
// 1 a day, Regular 2 and Serious 4. Finishing more than the goal is fine; it never says so.

import { dayNo } from '../engine/daily';
import { storage } from './storage';

export const GOALS = [
  { key: 'light', name: 'Light', n: 1 },
  { key: 'regular', name: 'Regular', n: 2 },
  { key: 'serious', name: 'Serious', n: 4 },
] as const;
export type GoalKey = (typeof GOALS)[number]['key'];

const GOAL_KEY = 'gazecraft-goal';
const TODAY_KEY = 'gazecraft-today';

/** The goal picked, or Regular. Anything stored that is not a goal is Regular. */
export function loadGoal(): (typeof GOALS)[number] {
  const v = storage.get(GOAL_KEY);
  return GOALS.find((g) => g.key === v) ?? GOALS[1];
}

export const saveGoal = (key: GoalKey): void => void storage.set(GOAL_KEY, key);

/** Puzzles finished today in this browser. Yesterday's count reads as 0. */
export function puzzlesToday(day: number = dayNo()): number {
  const v = storage.getJSON<{ day?: unknown; n?: unknown }>(TODAY_KEY);
  return v && v.day === day && Number.isInteger(v.n) && (v.n as number) > 0 ? (v.n as number) : 0;
}

/** One more puzzle finished today. */
export function countPuzzleToday(day: number = dayNo()): void {
  storage.setJSON(TODAY_KEY, { day, n: puzzlesToday(day) + 1 });
}
