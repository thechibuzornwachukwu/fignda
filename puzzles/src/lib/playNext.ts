// The Play button always knows what is next (BUILD_PLAN, Screens). One rule for the dock, the wide header, the
// landing page and the end of the first minute.

import { nextClueTo } from '../games/path';

export type PlayNext = { to: string; name: string; kind: 'clue' | 'done' };

/** The next clue on the path. Nothing left at all: the way back to the cases. */
export function playNext(): PlayNext {
  const clue = nextClueTo();
  return clue ? { to: clue, name: 'Play the next clue', kind: 'clue' } : { to: '/play', name: 'All played. See your cases', kind: 'done' };
}
