// The written chapters (SPEC section 9, Chapters): one file each in `design/stories`, bundled with the game, so a
// brief never waits on the network. `checkChapter` has passed every one of them in the unit tests.

import type { Chapter } from '../engine/chapter';
import type { Interlude } from '../engine/interlude';

const files = import.meta.glob<Chapter>('../../design/stories/*.json', { eager: true, import: 'default' });
const between = import.meta.glob<Interlude>('../../design/stories/interludes/*.json', { eager: true, import: 'default' });

const all: readonly Chapter[] = Object.values(files);

/** The chapters a player can open, in the order of their casebook. A draft is written and not yet open. */
export const chapters: readonly Chapter[] = all.filter((c) => !c.draft).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

export const getChapter = (id: string): Chapter | undefined => chapters.find((c) => c.id === id);

/** The casebook on the path: its name, and how many cases it will hold once all are written. */
export const CASEBOOK = { id: 'lantern-row', name: 'Lantern Row', cases: 8 } as const;

/** The interludes, in the order of the cases they follow. */
export const interludes: readonly Interlude[] = Object.values(between).sort((a, b) => a.after - b.after);

export const getInterlude = (id: string): Interlude | undefined => interludes.find((i) => i.id === id);
