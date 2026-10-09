// The lines a finished game can earn, and the one a daily shows before it starts.
// Pure: facts come from the engine, words come from the copy pools through the picker passed in.
// Every helper returns '' (or no line) when it has nothing true to say, so the screen never prints a blank,
// a missing number or an unfilled placeholder.

import type { PoolKey, Vars } from '../copy';
import { answerDepth } from '../engine/depth';
import type { Answer } from '../engine/hiddenWords';
import { DEEP_JOINS, LONG_WORD, skillsOf, type Skills } from '../engine/skill';
import type { Char } from '../engine/text';
import { formatTime } from '../engine/time';
import { dayStats, type DayProfile } from '../engine/variableDay';
import type { NewRecord } from '../lib/records';
import { RARE_PCT } from '../lib/wordStats';

export type Picker = (key: PoolKey, vars?: Vars) => string;

type Built = { chars: readonly Char[]; answers: readonly Answer[] };
type Found = { key: string; label: string; by?: string };

/** At most this many skill lines under one result. */
export const MAX_SKILL_LINES = 2;
/** At most this many record lines under one result. Every record is still stored. */
export const MAX_RECORD_LINES = 2;
/** "Most days" needs a few days to be true. */
export const MIN_POOL = 3;

const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const word = (w: unknown): w is string => typeof w === 'string' && w.trim() !== '';
/** Last guard: a line that did not fill is not shown. */
const filled = (line: string): string => (/\{\w*\}|\bundefined\b|\bNaN\b/.test(line) ? '' : line);

export type PlayFacts = {
  skills: Skills;
  /** Your longest find. Null when you found nothing. */
  longest: { word: string; len: number } | null;
  /** Your find that crosses the most joins. Null when you found nothing. */
  deepest: { word: string; joins: number } | null;
};

/** What your own finds show. A teammate's find is left out before anything is counted. */
export function playFacts(puzzle: Built, found: readonly Found[], wrongs: number, hints: number): PlayFacts {
  const byKey = new Map(puzzle.answers.map((a) => [a.key, a]));
  const mine = found.filter((f) => !f.by && word(f.label) && byKey.has(f.key));
  let longest: PlayFacts['longest'] = null;
  let deepest: PlayFacts['deepest'] = null;
  for (const f of mine) {
    const a = byKey.get(f.key);
    if (!a) continue;
    const d = answerDepth(puzzle, a);
    if (!longest || d.length > longest.len) longest = { word: f.label, len: d.length };
    if (!deepest || d.joins > deepest.joins) deepest = { word: f.label, joins: d.joins };
  }
  return { skills: skillsOf({ puzzle, found: mine, wrongs, hints }), longest, deepest };
}

/**
 * Up to 2 lines, rarest first: clean read, no-hint perfect, deep find, long word.
 * A clean read is also a no-hint perfect, so that one is only said when a wrong pick spoiled the clean read.
 */
export function skillLines(facts: PlayFacts, pick: Picker): string[] {
  const { skills, longest, deepest } = facts;
  const out: string[] = [];
  if (skills.cleanRead) out.push(pick('cleanRead'));
  else if (skills.noHintPerfect) out.push(pick('skillNoHint'));
  if (skills.deepFind && deepest && deepest.joins >= DEEP_JOINS) out.push(pick('skillDeep', { w: deepest.word, n: deepest.joins + 1 }));
  if (skills.longWord && longest && longest.len >= LONG_WORD) out.push(pick('skillLong', { w: longest.word, n: longest.len }));
  return out.map(filled).filter(Boolean).slice(0, MAX_SKILL_LINES);
}

/** Said beside the stars when this play raised them. '' when it did not, and at 0 stars. */
export function starsUpLine(stars: number, wentUp: boolean, pick: Picker): string {
  if (!wentUp || (stars !== 1 && stars !== 2 && stars !== 3)) return '';
  return filled(pick('starsUp', { n: stars }));
}

/**
 * "Today hid 11. Most days hide 8." Today's puzzle counts as one of the days. '' when today hides nothing or
 * there are too few days to call any count usual.
 */
export function dayHidLine(today: Built, pool: readonly Built[], pick: Picker): string {
  const days = pool.includes(today) ? pool : [...pool, today];
  if (days.length < MIN_POOL) return '';
  const { total, typical } = dayStats(today, days);
  if (!whole(total) || !whole(typical) || total < 1 || typical < 1) return '';
  return filled(total === typical ? pick('dayHidSame', { n: total }) : pick('dayHid', { n: total, m: typical }));
}

/** Before today's daily: what it holds, never how much. A deep word is the rarer of the 2, so it is said first. */
export function todayHoldsLine(profile: Pick<DayProfile, 'longWord' | 'deepWord'>, pick: Picker): string {
  if (profile.deepWord) return filled(pick('todayDeep'));
  if (profile.longWord) return filled(pick('todayLong'));
  return '';
}

/** The rarest word you found. "Only" is kept for a word half the players or fewer found. */
export function rareLine(rare: { pct: number } | null, label: string | null | undefined, pick: Picker): string {
  if (!rare || !word(label) || !whole(rare.pct) || rare.pct < 1 || rare.pct > 100) return '';
  return filled(pick(rare.pct <= RARE_PCT ? 'rareFind' : 'rarestFind', { p: rare.pct, w: label }));
}

/** One line per new record, at most 2: fastest clean read, most in a daily, longest word. */
export function recordLines(broke: readonly NewRecord[], pick: Picker): string[] {
  const order = { clean: 0, daily: 1, long: 2 } as const;
  return [...broke]
    .sort((a, b) => order[a.kind] - order[b.kind])
    .map((r) => {
      if (r.kind === 'clean') return word(r.pack) && whole(r.secs) ? pick('recordClean', { w: r.pack, t: formatTime(r.secs) }) : '';
      if (r.kind === 'daily') return whole(r.found) && r.found > 0 ? pick('recordDaily', { n: r.found }) : '';
      return word(r.word) && whole(r.len) && r.len > 0 ? pick('recordLong', { w: r.word, n: r.len }) : '';
    })
    .map(filled)
    .filter(Boolean)
    .slice(0, MAX_RECORD_LINES);
}
