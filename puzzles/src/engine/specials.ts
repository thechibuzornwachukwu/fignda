// The special clues of a pack, beyond its passages and sums: Mirror, Relay, Series, Liar and Groups. One function says
// which a pack has and what each is, and the client's path, the catalog and the server's replay all ask it, so
// they can never disagree about what a pack holds. Pure.

import { groupsClue, type GroupBoard } from './groups';
import type { HiddenWordsDef, HiddenWordsPuzzle } from './hiddenWords';
import { liarClue, type Statement } from './liar';
import { mirrorClue } from './mirror';
import { passages } from './passages';
import { relayClue } from './relay';
import { seriesClue } from './series';

/** Clue numbers: never move one, the account keeps stars under it. */
export const MIRROR_N = 31;
export const RELAY_N = 32;
export const SERIES_N = 33;
export const LIAR_N = 34;
export const GROUPS_N = 35;

export type SpecialType = 'mirror' | 'relay' | 'series' | 'liar' | 'groups';
export const SPECIAL_TYPE: Record<number, SpecialType> = { [MIRROR_N]: 'mirror', [RELAY_N]: 'relay', [SERIES_N]: 'series', [LIAR_N]: 'liar', [GROUPS_N]: 'groups' };

/** What the specials are read from: the word lists, and the Liar statements and Groups boards by pack category. */
export type SpecialSources = {
  mirrorWords: ReadonlySet<string>;
  relayWords: ReadonlySet<string>;
  liar: Readonly<Record<string, readonly Statement[]>>;
  groups: Readonly<Record<string, readonly GroupBoard[]>>;
};
export const NO_SOURCES: SpecialSources = { mirrorWords: new Set(), relayWords: new Set(), liar: {}, groups: {} };

/** The noun each special shows in its header and list. */
export const SPECIAL_NOUN: Record<SpecialType, string> = {
  mirror: 'words that read right to left',
  relay: 'word chains',
  series: 'runs that step evenly',
  liar: 'false statements',
  groups: 'sets of 4',
};

/**
 * Each special clue a pack has, by number. A pack that is not cut (fewer than 2 passages) has none. Series is made
 * from the clue's own name, so every cut pack has one; the others need their source to hold enough.
 */
export function specialClues(
  puzzle: Pick<HiddenWordsPuzzle, 'text' | 'chars' | 'S' | 'answers'>,
  id: string,
  category: string,
  src: SpecialSources,
): Map<number, HiddenWordsDef & { type: SpecialType }> {
  const out = new Map<number, HiddenWordsDef & { type: SpecialType }>();
  if (passages(puzzle).length < 2) return out;
  const add = (n: number, def: HiddenWordsDef | null) => def && out.set(n, { ...def, type: SPECIAL_TYPE[n]! });
  add(LIAR_N, liarClue(src.liar[category] ?? [], `${id}~${LIAR_N}`));
  add(RELAY_N, relayClue(puzzle, src.relayWords));
  add(SERIES_N, seriesClue(`${id}~${SERIES_N}`, 1));
  add(GROUPS_N, groupsClue(src.groups[category] ?? [], `${id}~${GROUPS_N}`));
  add(MIRROR_N, mirrorClue(puzzle, src.mirrorWords));
  return out;
}
