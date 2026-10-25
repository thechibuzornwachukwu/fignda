// Groups: 16 words that are really 4 sets of 4, each set sharing a link. Pick 4, check them. A right set locks
// in with its link shown; 3 of 4 right says "one away", so a miss still tells the player something (a guess that
// only punishes is the known flaw of this kind of game). Pure. The sets are written and checked by hand
// (data/groups.json), and the shuffle is made from a seed, so the board is the same on every device and the server.
//
// It rides the same pipe as every other type: a pick is 2 numbers (a, b), the play log and the server's replay
// are unchanged. 4 tiles of 16 are one of C(16,4) = 1820 picks, so a pick's rank is sent as a = rank % 40 and
// b = rank / 40 (both under the letter count, which the replay checks; `GROUPS_MIN_LETTERS` keeps it so).

import type { Answer, HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { hashOf, seeded } from './seed';
import { toChars } from './text';

export type GroupSet = { link: string; words: readonly [string, string, string, string] };
/** One board: 4 sets of 4. */
export type GroupBoard = readonly GroupSet[];

export const TILES = 16;
const BASE = 40;
/** A board's words must hold at least this many letters, so every (a, b) of a pick stays under the count. */
export const GROUPS_MIN_LETTERS = 46;

/** n choose k. */
const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};

/** The rank of 4 tile numbers (any order, all different, 0 to 15) among all 1820 picks. */
export function rankOf(tiles: readonly number[]): number {
  const t = [...tiles].sort((x, y) => x - y);
  // Combinatorial number system.
  return t.reduce((r, v, i) => r + choose(v, i + 1), 0);
}

/** The 4 tile numbers of a rank, smallest first. */
export function tilesOf(rank: number): number[] {
  const out: number[] = [];
  let r = rank;
  for (let k = 4; k >= 1; k--) {
    let v = k - 1;
    while (choose(v + 1, k) <= r) v++;
    out.unshift(v);
    r -= choose(v, k);
  }
  return out;
}

/** A pick as the (a, b) every board sends, and back. */
export const encodePick = (tiles: readonly number[]): [number, number] => {
  const r = rankOf(tiles);
  return [r % BASE, Math.floor(r / BASE)];
};
export const decodePick = (a: number, b: number): number[] | null => {
  const r = a + b * BASE;
  if (!Number.isInteger(r) || a < 0 || a >= BASE || b < 0 || r >= choose(TILES, 4)) return null;
  return tilesOf(r);
};

/** Shuffle, seeded. */
function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * The Groups clue for `seed`: one of the category's boards, its 16 words shuffled. `text` is the words in board
 * order, one a line; `dict` holds each set as "link=w1,w2,w3,w4".
 */
export function groupsClue(boards: readonly GroupBoard[], seed: string): HiddenWordsDef | null {
  if (boards.length === 0) return null;
  const random = seeded(hashOf(`groups:${seed}`));
  const board = boards[Math.floor(random() * boards.length)]!;
  if (board.length !== 4 || board.some((g) => g.words.length !== 4)) return null;
  const words = shuffled(board.flatMap((g) => g.words), random);
  return { text: words.join('\n'), dict: board.map((g) => `${g.link}=${g.words.join(',')}`) };
}

/** The 16 words of a Groups puzzle, in board order. */
export const tilesOfText = (text: string): string[] => text.split('\n');

/**
 * A Groups puzzle: each set of `dict` is an answer, its span the (a, b) of its 4 tiles. The letter stream is the
 * words' letters, which only bounds the picks: the board is drawn from `text`.
 */
export function buildGroups<D extends HiddenWordsDef>(def: D): HiddenWordsPuzzle<D> {
  const { chars, S } = toChars(def.text);
  const tiles = tilesOfText(def.text);
  const answers: Answer[] = [];
  for (const entry of def.dict) {
    const [link, list] = entry.split('=');
    const words = (list ?? '').split(',');
    const at = words.map((w) => tiles.indexOf(w));
    if (!link || words.length !== 4 || at.some((i) => i < 0) || new Set(at).size !== 4) continue;
    answers.push({ key: link.toLowerCase(), label: `${link}: ${words.join(', ')}`, spans: [encodePick(at)] });
  }
  return { ...def, chars, S, answers, difficulty: 'Medium' };
}

/** The 4 tiles of an answer. */
export const tilesOfAnswer = (a: Pick<Answer, 'spans'>): number[] => decodePick(a.spans[0]![0], a.spans[0]![1]) ?? [];
