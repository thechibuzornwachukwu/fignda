import { isoDate } from '../engine/daily';

/**
 * One day on the week ring. `rest` is a day off that the run survives. The server will decide which days are
 * rest days; nothing in the browser grants one, so today every day is `done` or `empty`.
 */
export type DayState = 'done' | 'rest' | 'empty';

const clean = (days: Iterable<number>, today: number) =>
  new Set([...days].filter((d) => Number.isInteger(d) && d >= 1 && d <= today));

/** The last 7 UTC days, oldest first, ending today. A played day is `done` even if it was also given as rest. */
export function weekParts(days: Iterable<number>, today: number, rest: Iterable<number> = []): DayState[] {
  const played = clean(days, today);
  const off = clean(rest, today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = today - 6 + i;
    return played.has(d) ? 'done' : off.has(d) ? 'rest' : 'empty';
  });
}

/** Dailies played in the UTC month that `today` is in. A break does not zero this. */
export function daysThisMonth(days: Iterable<number>, today: number): number {
  const month = isoDate(today).slice(0, 7);
  let n = 0;
  for (const d of clean(days, today)) if (isoDate(d).slice(0, 7) === month) n++;
  return n;
}
