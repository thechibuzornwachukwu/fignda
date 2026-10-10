// The Play button always knows what is next (BUILD_PLAN, Screens). One rule for the dock and the wide header.

import { dayNo } from '../engine/daily';
import { nextClueTo } from '../games/caseFile';
import { loadDaily } from '../games/daily';
import { isFinished } from '../games/session';

export type PlayNext = { to: string; name: string; kind: 'daily' | 'clue' | 'done' };

/** Today's daily while it is unplayed, then the next clue on the path. Nothing left at all: the way back to the cases. */
export function playNext(): PlayNext {
  const n = dayNo();
  const saved = loadDaily(n);
  if (!(saved && isFinished(saved))) return { to: `/d/${n}`, name: "Play today's daily", kind: 'daily' };
  const clue = nextClueTo();
  return clue ? { to: clue, name: 'Play the next clue', kind: 'clue' } : { to: '/play', name: 'All played. See your cases', kind: 'done' };
}
