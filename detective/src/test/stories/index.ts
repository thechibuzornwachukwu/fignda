// The 8 cases of the first Lantern Row casebook, kept as test fixtures: every method's screen and the Worker's checks
// are tested on them. The game no longer ships them (design/stories holds the cases it does). The test config swaps
// `src/games/stories` for this file.

import twoSigns from './the-2-signs.json';
import earlyBus from './the-early-bus.json';
import lightInTheHall from './the-light-in-the-hall.json';
import longSpoon from './the-long-spoon.json';
import openBox from './the-open-box.json';
import otherSpoon from './the-other-spoon.json';
import missingYear from './the-year-that-is-missing.json';
import cards from './who-carries-the-cards.json';
import type { Chapter } from '../../engine/chapter';

export const STORIES = [longSpoon, openBox, earlyBus, missingYear, lightInTheHall, twoSigns, otherSpoon, cards] as unknown as readonly Chapter[];
