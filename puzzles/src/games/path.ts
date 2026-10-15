// Where this browser stands on the path: the clues it has done, and the next one to play. Nothing here is
// stored. It is read from the same places the path reads: stars and finished puzzles.

import { clampStars } from '../components/starsLabel';
import { buildPath, clueStates, type Path } from '../engine/journey';
import { loadFinished } from '../lib/shelves';
import { loadStars } from '../lib/starStore';
import { games, MIRROR_WORDS } from './catalog';

/** Every clue this browser has done: a finished whole puzzle, or anything holding stars. */
export function doneClues(): Set<string> {
  const done = new Set<string>(loadFinished());
  const stars = loadStars();
  for (const id of Object.keys(stars)) if (clampStars(stars[id]) > 0) done.add(id);
  return done;
}

let path: Path | null = null;

/** Where the next clue on the path is played, for this browser. Null when every pack is done. */
export function nextClueTo(): string | null {
  path ??= buildPath(games, MIRROR_WORDS);
  const standing = clueStates(path, doneClues());
  const next = standing.clues.find((c) => c.state === 'next');
  return next ? (next.n ? `/play/${next.puzzle}/${next.n}` : `/play/${next.puzzle}`) : null;
}
