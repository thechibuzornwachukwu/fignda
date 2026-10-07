// Replays a client play log with the shared engine and recomputes the result.
// The client's own counts and score are never trusted.

import { check, isClose } from '../../src/engine/check';
import type { Answer } from '../../src/engine/hiddenWords';
import { score } from '../../src/engine/score';

export type PlayEvent = { a: number; b: number; t: number };
export type PlayLog = { events: PlayEvent[]; hints: number[]; finish: number };

export const MAX_LOG_EVENTS = 500;
/** Finds closer together than this are a bot, not a person. */
export const MIN_FIND_GAP_MS = 150;
export const MAX_PLAY_MS = 7 * 24 * 3600 * 1000;

export type Rejection =
  | 'log_too_long'
  | 'out_of_order'
  | 'finish_before_last_event'
  | 'index_out_of_range'
  | 'duplicate_find'
  | 'too_fast';

export type ReplayResult =
  | {
      ok: true;
      found: number;
      total: number;
      hints: number;
      misses: number;
      secs: number;
      score: number;
      /** Each word this log really selected, with its time. Room plays store these. */
      finds: Array<{ k: string; t: number }>;
    }
  | { ok: false; reason: Rejection };

const sorted = (xs: number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1]!);

export function replay(puzzle: { S: string; answers: readonly Answer[] }, log: PlayLog, daily: boolean): ReplayResult {
  const { events, hints, finish } = log;
  if (events.length + hints.length > MAX_LOG_EVENTS) return { ok: false, reason: 'log_too_long' };
  if (!sorted(events.map((e) => e.t)) || !sorted(hints)) return { ok: false, reason: 'out_of_order' };
  const last = Math.max(0, ...events.map((e) => e.t), ...hints);
  if (finish < last || finish > MAX_PLAY_MS) return { ok: false, reason: 'finish_before_last_event' };

  const n = puzzle.S.length;
  const found = new Set<string>();
  const finds: Array<{ k: string; t: number }> = [];
  let misses = 0;
  let lastFind = 0; // the clock starts at 0

  for (const e of events) {
    if (e.a >= n || e.b >= n) return { ok: false, reason: 'index_out_of_range' };
    const r = check(puzzle, e.a, e.b, found);
    if (r.kind === 'already') return { ok: false, reason: 'duplicate_find' };
    if (r.kind === 'hit') {
      if (e.t - lastFind < MIN_FIND_GAP_MS) return { ok: false, reason: 'too_fast' };
      lastFind = e.t;
      found.add(r.answer.key);
      finds.push({ k: r.answer.key, t: e.t });
    } else if (r.kind === 'wrong' && daily) {
      const unfound = puzzle.answers.filter((x) => !found.has(x.key)).map((x) => x.key);
      if (!isClose(r.str, unfound)) misses++;
    }
  }

  const total = puzzle.answers.length;
  const secs = Math.floor(finish / 1000);
  const result = { found: found.size, total, hints: hints.length, misses: daily ? misses : 0, secs };
  return { ok: true, ...result, score: score(result), finds };
}
