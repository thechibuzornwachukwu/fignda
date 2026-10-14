// The Play button always knows what is next. One rule for the dock, the header and the landing page.

import { openCase } from './firstCase';

export type PlayNext = { to: string; name: string; kind: 'case' | 'done' };

/**
 * The case that is open: its brief before any step is done, then the step that is open. Every case closed: the
 * casebook, with a tick.
 */
export function playNext(): PlayNext {
  const open = openCase();
  if (open) return { to: open.started ? `${open.to}/${open.solved + 1}` : open.to, name: open.started ? 'Carry on your case' : 'Open your case', kind: 'case' };
  return { to: '/cases', name: 'Every case closed. See your cases', kind: 'done' };
}
