// A case as the player holds it: the secret of a catalogue puzzle and the pieces their finished clues gave.
// Nothing here is stored. It is read from the same places the path reads: stars and finished puzzles.

import secretsFile from '../../data/secrets.json';
import { DISGUISE_STYLES } from '../avatar/parts/disguises';
import { clampStars } from '../components/starsLabel';
import { POOLS } from '../copy';
import { clueId } from '../engine/journey';
import { caseSecrets, culpritOf, pieceSlots, revealSecret, type Culprit, type Secret } from '../engine/secret';
import { loadFinished } from '../lib/shelves';
import { loadStars } from '../lib/starStore';
import { games, getPassage } from './catalog';

/** How many clues a catalogue puzzle's case has: its passages, then the whole puzzle. */
export const clueCount = (id: string): number => (getPassage(id, 1)?.part.count ?? 0) + 1;

/** The culprit of a case, and who they turn out to be: a line from the `culpritWho` pool, the same on every device. */
export function culpritFor(id: string): Culprit & { name: string } {
  const who = culpritOf(id, DISGUISE_STYLES.length, POOLS.culpritWho.length);
  return { ...who, name: POOLS.culpritWho[who.who] ?? '' };
}

let secrets: Map<string, Secret> | null = null;

/** The secret of a catalogue puzzle's case. None for a puzzle that is not ours. */
export function secretOf(id: string): Secret | undefined {
  secrets ??= caseSecrets(
    games.map((g) => ({ id: g.id, clues: clueCount(g.id) })),
    (secretsFile as { things: string[] }).things,
  );
  return secrets.get(id);
}

/** Every clue this browser has done: a finished whole puzzle, or anything holding stars. */
export function doneClues(): Set<string> {
  const done = new Set<string>(loadFinished());
  const stars = loadStars();
  for (const id of Object.keys(stars)) if (clampStars(stars[id]) > 0) done.add(id);
  return done;
}

export type CaseFile = {
  word: string;
  /** One per letter: the letter where a piece is held, else an empty string. */
  slots: string[];
  /** Every clue done: the word reads whole. */
  closed: boolean;
  /** The piece clue `n` gives (0 is the unmasking): its letters, and the slots they fill. */
  piece: (n: number) => { text: string; slots: number[] };
};

/** The case of a catalogue puzzle, given the clues done. A whole puzzle done closes it, pieces and all. */
export function caseFile(id: string, done: ReadonlySet<string>): CaseFile | undefined {
  const secret = secretOf(id);
  if (!secret) return undefined;
  const last = secret.pieces.length - 1;
  const have = secret.pieces.map((_, i) => done.has(id) || done.has(clueId(id, i === last ? 0 : i + 1)));
  const slots = revealSecret(secret, have);
  return {
    word: secret.word,
    slots,
    closed: have.every(Boolean),
    piece: (n) => {
      const p = secret.pieces[n > 0 ? n - 1 : last];
      return p ? { text: p.text, slots: pieceSlots(p) } : { text: '', slots: [] };
    },
  };
}
