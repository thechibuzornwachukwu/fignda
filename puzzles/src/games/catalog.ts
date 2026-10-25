// Curated games from data/games.json. Answers and difficulty always come from the engine, never from this file.

import raw from '../../data/games.json';
import rawHolidays from '../../data/holidays.json';
import { dailyGameId, holidayOn, type Calendar, type Holiday } from '../engine/daily';
import rawMirror from '../../data/mirrorWords.json';
import rawRelay from '../../data/relayWords.json';
import rawLiar from '../../data/liar.json';
import rawGroups from '../../data/groups.json';
import { buildHiddenWords, type Difficulty, type HiddenWordsPuzzle } from '../engine/hiddenWords';
import { caseOrder, clueKind, SUMS_FROM } from '../engine/journey';
import { sumsClue, sumsTarget } from '../engine/sums';
import { passages } from '../engine/passages';
import type { Statement } from '../engine/liar';
import type { GroupBoard } from '../engine/groups';
import { SPECIAL_NOUN, specialClues, type SpecialSources } from '../engine/specials';
import { sponsorOf, type Sponsor } from '../engine/sponsor';

export type GameType = 'hidden-words' | 'buried-sums' | 'mirror' | 'relay' | 'series' | 'liar' | 'groups';


/** The everyday words Mirror reads by. */
export const MIRROR_WORDS: ReadonlySet<string> = new Set((rawMirror as { words: string }).words.split(' '));

/** What every pack's special clues are made from: Mirror's and Relay's word lists, and the Liar statements. */
export const SPECIAL_SOURCES: SpecialSources = {
  mirrorWords: MIRROR_WORDS,
  relayWords: new Set((rawRelay as { words: string }).words.split(' ')),
  liar: Object.fromEntries(Object.entries(rawLiar as Record<string, unknown>).filter(([, v]) => Array.isArray(v))) as Record<string, Statement[]>,
  groups: Object.fromEntries(Object.entries(rawGroups as Record<string, unknown>).filter(([, v]) => Array.isArray(v))) as Record<string, GroupBoard[]>,
};

export type GameDef = {
  id: string;
  type: GameType;
  category: string;
  title: string;
  /** Plural noun for the answers, e.g. "books of the Bible". */
  noun: string;
  /** Authored label. Test fixture only; use the computed `difficulty`. */
  difficulty: Difficulty;
  /** Test fixture only. */
  expectedAnswers: string[];
  dict: string[];
  text: string;
  /** The "With NAME" mark. Read it with `sponsorFor`, never directly. */
  sponsor?: { name: string; url?: string };
};

type GamesFile = { filters: string[]; dailyPool: string[]; games: GameDef[] };

const data = raw as GamesFile;

export const games: readonly GameDef[] = data.games;
export const filters: readonly string[] = data.filters;
export const dailyPool: readonly string[] = data.dailyPool;
export const calendar: Calendar = rawHolidays;

/** The puzzle for daily `n`: the holiday's on a holiday, else the rotation. Client, seed and link previews all use this rule. */
export const dailyIdFor = (n: number): string => dailyGameId(n, dailyPool, calendar);
export const holidayFor = (n: number): Holiday | undefined => holidayOn(n, calendar);

export function getGameDef(id: string): GameDef | undefined {
  return games.find((g) => g.id === id);
}

/** Who the puzzle is with, when its `sponsor` field passes the rule. Catalogue puzzles only: a player-made one never carries it. */
export const sponsorFor = (def: Pick<GameDef, 'id' | 'sponsor'>): Sponsor | undefined =>
  getGameDef(def.id) ? sponsorOf(def.sponsor) : undefined;

/**
 * One sitting of a catalogue puzzle. `n` is the clue's number (`clueKind`) and `count` how many passages the
 * puzzle has. `at` of `of` is where the clue stands in its case, counted from 1, and `next` the clue played
 * after it (0 when it is the last).
 */
export type Part = { n: number; count: number; at: number; of: number; next: number };

const parts = new Map<string, Map<number, { def: GameDef; part: Part }>>();

/**
 * Clue `n` of a puzzle's case as a game of its own. A passage is the same puzzle with the passage as its text.
 * A sums clue is a row of digits the engine makes from the clue's own name; a special is whatever
 * `specialClues` makes for the pack. Memoised, so the same object comes back each time. None when the puzzle is not cut, or its case has no such clue.
 */
export function getPassage(id: string, n: number): { def: GameDef; part: Part } | undefined {
  let list = parts.get(id);
  if (!list) {
    list = new Map();
    parts.set(id, list);
    const def = getGameDef(id);
    const puzzle = getPuzzle(id);
    if (!def || !puzzle) return undefined;
    const cut = passages(puzzle);
    const specials = specialClues(puzzle, id, def.category, SPECIAL_SOURCES);
    const order = caseOrder(cut.length, new Set(specials.keys()));
    order.forEach((k, i) => {
      if (k === 0) return;
      const part: Part = { n: k, count: cut.length, at: i + 1, of: order.length, next: order[i + 1] ?? 0 };
      const kind = clueKind(k);
      if (kind === 'words') list!.set(k, { def: { ...def, text: cut[k - 1]!.text }, part });
      else if (kind === 'sums') {
        const made = sumsClue(`${id}~${k}`, k - SUMS_FROM);
        list!.set(k, { def: { ...def, type: 'buried-sums', noun: `runs that add up to ${sumsTarget(made)}`, text: made.text, dict: [...made.dict], expectedAnswers: [] }, part });
      } else {
        const sp = specials.get(k);
        if (sp) list!.set(k, { def: { ...def, type: sp.type, noun: SPECIAL_NOUN[sp.type], text: sp.text, dict: [...sp.dict], expectedAnswers: [] }, part });
      }
    });
  }
  return Number.isInteger(n) ? list.get(n) : undefined;
}

/** The clue numbers of a catalogue puzzle's case, in the order they are played. Empty when it is not cut. */
export function caseClues(id: string): number[] {
  getPassage(id, 1);
  return [...(parts.get(id)?.entries() ?? [])].sort((x, y) => x[1].part.at - y[1].part.at).map(([n]) => n);
}

const built = new Map<string, HiddenWordsPuzzle<GameDef>>();

/** Built puzzle, memoised. */
export function getPuzzle(id: string): HiddenWordsPuzzle<GameDef> | undefined {
  let p = built.get(id);
  if (!p) {
    const def = getGameDef(id);
    if (!def) return undefined;
    p = buildHiddenWords(def);
    built.set(id, p);
  }
  return p;
}
