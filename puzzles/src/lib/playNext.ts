// The Play button always knows what is next (BUILD_PLAN, Screens). One rule for the dock, the wide header, the
// landing page and the end of the first minute.

import { nextClueTo } from '../games/caseFile';
import { openCase } from './firstCase';

export type PlayNext = { to: string; name: string; kind: 'case' | 'clue' | 'done' };

/**
 * The written case that is open: its brief before any step is done, then the step that is open. With every
 * written case closed, the next clue on the path. Nothing left at all: the way back to the cases.
 */
export function playNext(): PlayNext {
  const open = openCase();
  if (open) return { to: open.started ? `${open.to}/${open.solved + 1}` : open.to, name: open.started ? 'Carry on your case' : 'Open your case', kind: 'case' };
  const clue = nextClueTo();
  return clue ? { to: clue, name: 'Play the next clue', kind: 'clue' } : { to: '/play', name: 'All played. See your cases', kind: 'done' };
}
