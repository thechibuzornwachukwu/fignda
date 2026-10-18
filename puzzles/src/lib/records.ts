import { storage } from './storage';

/**
 * Personal records, kept in this browser. Three kinds:
 *   clean  fastest clean read in each pack, in seconds
 *   daily  most words found in one daily
 *   long   longest word found, in any game
 * The first value of each kind is stored quietly. A record is something you beat, so only a later,
 * strictly better play is called new. A tie is not a record.
 */
const KEY = 'gazecraft-records';

export type LongWord = { word: string; len: number };
/** `week`: the best week's points, from the account (`my_records`); 0 until a signed in visit brings it. */
export type Records = { clean: Record<string, number>; daily: number; long: LongWord | null; week: number };

export type PlayFacts = {
  /** The pack this puzzle belongs to. Null for a player-made puzzle. */
  pack: string | null;
  /** Seconds, when the play was a clean read. Null when it was not. */
  cleanSecs: number | null;
  /** Your own finds, when the play was a daily. Null when it was not. */
  dailyFound: number | null;
  /** The longest word you found yourself. Null when you found none. */
  longest: LongWord | null;
};

export type NewRecord =
  | { kind: 'clean'; pack: string; secs: number }
  | { kind: 'daily'; found: number }
  | { kind: 'long'; word: string; len: number };

export const emptyRecords = (): Records => ({ clean: {}, daily: 0, long: null, week: 0 });

const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isLong = (v: unknown): v is LongWord => {
  if (!v || typeof v !== 'object') return false;
  const { word, len } = v as Partial<LongWord>;
  return typeof word === 'string' && word.trim() !== '' && count(len) && len > 0;
};

/** Whatever was stored, as records. Anything that is not a record is dropped, never shown. */
export function parseRecords(v: unknown): Records {
  const out = emptyRecords();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const { clean, daily, long, week } = v as Record<string, unknown>;
  if (clean && typeof clean === 'object' && !Array.isArray(clean)) {
    for (const [pack, secs] of Object.entries(clean)) if (pack && count(secs)) out.clean[pack] = secs;
  }
  if (count(daily)) out.daily = daily;
  if (isLong(long)) out.long = { word: long.word, len: long.len };
  if (count(week)) out.week = week;
  return out;
}

/** For the result and, later, the profile page. */
export function loadRecords(): Records {
  return parseRecords(storage.getJSON<unknown>(KEY));
}

/** Pure: the records after this play, and which of them it beat. */
export function applyRecords(cur: Records, play: PlayFacts): { next: Records; broke: NewRecord[] } {
  const next: Records = { clean: { ...cur.clean }, daily: cur.daily, long: cur.long, week: cur.week };
  const broke: NewRecord[] = [];

  if (play.pack && count(play.cleanSecs)) {
    const prev = cur.clean[play.pack];
    if (prev == null || play.cleanSecs < prev) {
      next.clean[play.pack] = play.cleanSecs;
      if (prev != null) broke.push({ kind: 'clean', pack: play.pack, secs: play.cleanSecs });
    }
  }
  if (count(play.dailyFound) && play.dailyFound > cur.daily) {
    next.daily = play.dailyFound;
    if (cur.daily > 0) broke.push({ kind: 'daily', found: play.dailyFound });
  }
  if (isLong(play.longest) && (!cur.long || play.longest.len > cur.long.len)) {
    next.long = { word: play.longest.word, len: play.longest.len };
    if (cur.long) broke.push({ kind: 'long', word: play.longest.word, len: play.longest.len });
  }
  return { next, broke };
}

/** Store what this play set and return the records it beat. Empty on a first play. */
export function recordPlay(play: PlayFacts): NewRecord[] {
  const cur = loadRecords();
  const { next, broke } = applyRecords(cur, play);
  if (JSON.stringify(next) !== JSON.stringify(cur)) storage.setJSON(KEY, next);
  return broke;
}

/**
 * The account's records (`my_records`) into this browser: the better of each is kept, so nothing goes down and
 * a second device catches up. Nothing new is announced: a record is only new when a play beats it.
 */
export function mergeRecords(server: unknown): Records {
  const cur = loadRecords();
  const v = server && typeof server === 'object' && !Array.isArray(server) ? (server as Record<string, unknown>) : {};
  const from = parseRecords({ clean: v.clean, long: v.long, week: v.best_week });
  const next: Records = { clean: { ...cur.clean }, daily: cur.daily, long: cur.long, week: Math.max(cur.week, from.week) };
  for (const [pack, secs] of Object.entries(from.clean)) if (next.clean[pack] == null || secs < next.clean[pack]!) next.clean[pack] = secs;
  if (from.long && (!next.long || from.long.len > next.long.len)) next.long = from.long;
  if (JSON.stringify(next) !== JSON.stringify(cur)) storage.setJSON(KEY, next);
  return next;
}
