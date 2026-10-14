// Disguises: what a culprit wears until their case is closed (SPEC section 5, Culprits). One entry per choice.
// Not part of a player's avatar: never saved in an avatar code and never offered in the designer.
//
// TO ADD ONE: append an entry to the END of DISGUISE_STYLES (a case finds its disguise by position; never
// reorder or remove). They are drawn on top of an ordinary avatar, as the Festive touches are, in a layer of
// their own so the unmasking can lift them off.
// The head is a 38 by 45 rounded box from (29, 25). Eyes sit near (40, 41.5) and (56, 41.5), the mouth near y 60.

import { c, ellipse, GOLD, INK, line, p, rect, RED, ROSE, VIOLET, WHITE, type Kit } from '../shapes';
import type { Part } from './face';

const PAPER = '#c9a36b';
const PAPER_FOLD = '#a8834f';
const NOSE = '#e8a07a';
const FELT = '#5b4636';

/** Two eye holes with someone looking out of them. */
const eyes = (white: string) => [c(40, 41.5, 3.2, white), c(56, 41.5, 3.2, white), c(40, 41.5, 1.4, INK), c(56, 41.5, 1.4, INK)];

export const DISGUISE_STYLES: readonly Part[] = [
  {
    // A black band across the eyes, tied at the sides.
    name: 'eye mask',
    draw: () => [line('M30 41c-3 0-5 1-7 3M66 41c3 0 5 1 7 3', INK, 2.2), rect({ x: 30, y: 35, width: 36, height: 13, rx: 6.5, fill: INK }), ...eyes(WHITE)],
  },
  {
    // Joke glasses with a big nose and a moustache.
    name: 'joke glasses',
    draw: () => [
      c(40, 41.5, 6.2, WHITE, { opacity: 0.9 }),
      c(56, 41.5, 6.2, WHITE, { opacity: 0.9 }),
      line('M33.8 41.5a6.2 6.2 0 1 0 12.4 0a6.2 6.2 0 1 0-12.4 0M49.8 41.5a6.2 6.2 0 1 0 12.4 0a6.2 6.2 0 1 0-12.4 0M46.2 41.5h3.6M33.8 41l-4-1M62.2 41l4-1', INK, 1.8),
      c(40, 42, 1.5, INK),
      c(56, 42, 1.5, INK),
      ellipse({ cx: 48, cy: 50, rx: 4, ry: 5.5, fill: NOSE }),
      p('M48 57c-4-3-11-2-14 3 5 2 11 1 14-2 3 3 9 4 14 2-3-5-10-6-14-3z', { fill: INK }),
    ],
  },
  {
    // A paper bag over the whole head, with eye holes and a drawn smile.
    name: 'paper bag',
    draw: () => [
      p('M25 20l4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 3 4v52c0 2-1 3-3 3H28c-2 0-3-1-3-3z', { fill: PAPER }),
      line('M31 24v48M65 24v48', PAPER_FOLD, 1.2),
      c(40, 42, 3.4, INK),
      c(56, 42, 3.4, INK),
      line('M40 58q8 6 16 0', INK, 2),
    ],
  },
  {
    // A red neckerchief pulled up over the nose, with white spots.
    name: 'neckerchief',
    draw: () => [
      p('M28 48h40v9c0 11-9 19-20 19s-20-8-20-19z', { fill: RED }),
      line('M28 48h40', '#9c342c', 1.4),
      c(38, 56, 1.5, WHITE),
      c(48, 60, 1.5, WHITE),
      c(58, 56, 1.5, WHITE),
      c(43, 67, 1.5, WHITE),
      c(53, 67, 1.5, WHITE),
    ],
  },
  {
    // A wide brimmed hat pulled low, and dark glasses.
    name: 'hat and shades',
    draw: (k: Kit) => [
      p('M33 28c0-11 5-18 15-18s15 7 15 18z', { fill: FELT }),
      rect({ x: 33, y: 23, width: 30, height: 5, fill: k.dark ? GOLD : INK }),
      ellipse({ cx: 48, cy: 29, rx: 28, ry: 5.5, fill: FELT }),
      rect({ x: 31, y: 35, width: 16, height: 13, rx: 5, fill: INK }),
      rect({ x: 49, y: 35, width: 16, height: 13, rx: 5, fill: INK }),
      line('M47 40h2M31 40l-3-1M65 40l3-1', INK, 1.8),
      line('M34 39l5-1M52 39l5-1', WHITE, 1),
    ],
  },
  {
    // A gold carnival mask with feathers at one side.
    name: 'carnival mask',
    draw: () => [
      line('M63 37c4-8 8-14 14-17M65 39c6-5 11-8 17-9', ROSE, 3),
      line('M64 38c5-7 10-11 16-13', VIOLET, 3),
      p('M30 37c6-3 12-3 18 1 6-4 12-4 18-1 1 6-2 12-8 13-4 0-7-2-10-5-3 3-6 5-10 5-6-1-9-7-8-13z', { fill: GOLD }),
      ...eyes(WHITE),
      c(48, 38, 1.4, RED),
    ],
  },
];
