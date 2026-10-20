// The cases the game ships, 1 file each in design/stories. A new file is added here, for the app and the Worker
// alike: a test fails until it is. Tests swap this file for src/test/stories (vite.config.ts).

import emberAward from '../../design/stories/the-ember-award.json';
import type { Chapter } from '../engine/chapter';

export const STORIES = [emberAward] as unknown as readonly Chapter[];
