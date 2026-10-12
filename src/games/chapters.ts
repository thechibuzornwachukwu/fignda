// The written chapters (SPEC section 9, Chapters): one file each in `design/stories`, bundled with the game, so a
// brief never waits on the network. `checkChapter` has passed every one of them in the unit tests.

import type { Chapter } from '../engine/chapter';

const files = import.meta.glob<Chapter>('../../design/stories/*.json', { eager: true, import: 'default' });

export const chapters: readonly Chapter[] = Object.values(files);

export const getChapter = (id: string): Chapter | undefined => chapters.find((c) => c.id === id);
