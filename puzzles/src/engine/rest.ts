// Rest days (BUILD_PLAN set 3a): 1 a week, earned by playing 5 of the last 7, used by itself, free. Pure.
// The database runs the same rule (`public.rest_run`, supabase/migrations/20261015000200_rest_day.sql); a test
// keeps the 2 in step.
//
// A missed day is a rest day when all of this holds:
//   - it is a gap of 1: the day before was played, and the day after was played or is today (still open)
//   - 5 or more of the 7 days before it were played
//   - no rest day was given in the 6 days before it
// A rest day keeps the run alive and is not counted in it: a run is the days played.

export const REST_EARN = 5;
export const REST_WINDOW = 7;

const clean = (days: Iterable<number>, today: number) => new Set([...days].filter((d) => Number.isInteger(d) && d >= 1 && d <= today));

/** The rest days given, oldest first, up to `today` (never today itself). */
export function restDays(days: Iterable<number>, today: number): number[] {
  const played = clean(days, today);
  if (played.size === 0) return [];
  const first = Math.min(...played);
  const rest: number[] = [];
  let last = -Infinity;
  for (let m = first + 1; m < today; m++) {
    if (played.has(m) || !played.has(m - 1)) continue;
    if (!played.has(m + 1) && m + 1 !== today) continue;
    let n = 0;
    for (let d = m - REST_WINDOW; d < m; d++) if (played.has(d)) n++;
    if (n < REST_EARN || m - last < REST_WINDOW) continue;
    rest.push(m);
    last = m;
  }
  return rest;
}

/** The run now: days played back from today (or yesterday, while today is open), stepping over rest days. */
export function runWithRest(days: Iterable<number>, today: number): number {
  const played = clean(days, today);
  const rest = new Set(restDays(played, today));
  let d = played.has(today) ? today : today - 1;
  let run = 0;
  while (played.has(d) || rest.has(d)) {
    if (played.has(d)) run++;
    d--;
  }
  return run;
}

/** The longest run ever, rest days stepped over. */
export function longestWithRest(days: Iterable<number>, today: number): number {
  const played = clean(days, today);
  const rest = new Set(restDays(played, today));
  let best = 0;
  for (const d of played) {
    if (played.has(d - 1) || rest.has(d - 1)) continue;
    let n = 0;
    for (let x = d; played.has(x) || rest.has(x); x++) if (played.has(x)) n++;
    best = Math.max(best, n);
  }
  return best;
}
