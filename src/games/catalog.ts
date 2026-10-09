// Curated games from data/games.json. Answers and difficulty always come from the engine, never from this file.

import raw from '../../data/games.json';
import rawHolidays from '../../data/holidays.json';
import { dailyGameId, holidayOn, type Calendar, type Holiday } from '../engine/daily';
import { buildHiddenWords, type Difficulty, type HiddenWordsPuzzle } from '../engine/hiddenWords';
import { sponsorOf, type Sponsor } from '../engine/sponsor';

export type GameType = 'hidden-words';

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
