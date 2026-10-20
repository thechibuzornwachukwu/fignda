// Every help article, in the order a group lists them. The wording is written here; the numbers come from the
// code the game runs (imports below), so an article changes when its rule does.

import { EARNED, howTo } from '../avatar/earned';
import { FIRST_GAP, gapAt, LEVELS_PER_RANK, RANKS } from '../engine/level';
import { MAKE } from '../engine/make';
import { BOND_AT, HINT_OF, PARTNER_POINTS, PARTNERS } from '../engine/partners';
import { REST_EARN, REST_WINDOW } from '../engine/rest';
import { FIND_POINTS, TIME_BONUS, TIP_OFF_COST } from '../engine/score';
import { DEEP_JOINS, LONG_WORD } from '../engine/skill';
import { GOALS } from '../lib/goal';
import { GUEST_GAMES } from '../lib/guestLimit';
import { LEAGUE_TIERS, LEAGUE_UP } from '../lib/league';
import { OUTFIT_NEEDS } from '../lib/petOutfit';
import { CLEAN_BONUS, RARE_BONUS } from '../lib/profileStats';
import { HELP_GROUPS, type HelpArticle } from './types';

const n = (x: number) => x.toLocaleString('en-US');
const list = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** The points each rank starts at: every level gap below its first level. */
const rankStart = (i: number) => Array.from({ length: i * LEVELS_PER_RANK }, (_, k) => gapAt(k + 1)).reduce((a, b) => a + b, 0);

/** How each pet picks the word a tip-off marks. */
const PICKS: Record<string, string> = { first: 'the first word in reading order', longest: 'the longest word', near: 'the word nearest your last find', shortest: 'the shortest word' };

/** The table a league is played in: up to this many players. The database holds the same (league_seats). */
const LEAGUE_TABLE = 20;
/** The bottom of a table goes down only when it holds at least this many. */
const LEAGUE_DOWN_FROM = 5;

export const HELP_ARTICLES: readonly HelpArticle[] = [
  // Playing
  {
    slug: 'how-to-play',
    group: 'Playing',
    title: 'How do I play?',
    answer: 'Read the paragraph and drag across the letters of a hidden word. Words run across spaces and punctuation, so "Pat omitted" hides ATOM.',
    steps: [
      'Open Packs and tap the next puzzle.',
      'Read the paragraph slowly.',
      "Drag across a word's letters. On a phone, swipe, or tap the first letter and then the last.",
      "Find every word, or press I'm done when you have found all you can.",
    ],
    related: ['tip-offs', 'stars'],
  },
  {
    slug: 'tip-offs',
    group: 'Playing',
    title: 'What is a tip-off?',
    answer: `Your pet marks the first letter of a word you have not found yet. Each tip-off costs ${TIP_OFF_COST} points.`,
    facts: PARTNERS.map((p) => `${p.name} picks ${PICKS[HINT_OF[p.id]]}.`),
    related: ['pets', 'points'],
  },
  {
    slug: 'number-puzzles',
    group: 'Playing',
    title: 'How do the number puzzles work?',
    answer: 'Drag across digits in a row that add up to the target. Being one digit short or long is a near miss and costs nothing.',
    related: ['how-to-play'],
  },
  {
    slug: 'mirror-puzzles',
    group: 'Playing',
    title: 'Why do some words read backwards?',
    answer: 'On a mirror puzzle the hidden words read from right to left. Drag across one from either end.',
    related: ['how-to-play'],
  },
  {
    slug: 'stars',
    group: 'Playing',
    title: 'How do I get 3 stars?',
    answer: 'Find every word with no tip-off and no wrong pick. Your best stars on each puzzle are kept.',
    facts: ['3 stars: every word, no tip-off, no wrong pick.', '2 stars: at least 8 in 10 of the words.', '1 star: any finished puzzle.'],
    related: ['tip-offs', 'points'],
  },
  {
    slug: 'leaving-a-puzzle',
    group: 'Playing',
    title: 'What happens if I leave a puzzle half way?',
    answer: 'It is kept in this browser and carries on where you stopped, with the words you found. The clock stops while you are away.',
  },

  // Packs and progress
  {
    slug: 'packs',
    group: 'Packs and progress',
    title: 'What is a pack?',
    answer: 'A set of short puzzles played in order. Finish one and the next opens.',
    related: ['how-to-play', 'daily-goal'],
  },
  {
    slug: 'runs-and-rest-days',
    group: 'Packs and progress',
    title: 'What keeps my run going?',
    answer: `Finish a puzzle every day. Miss a single day after playing ${REST_EARN} of the ${REST_WINDOW} days before it, and that day is a rest day: your run carries on.`,
    facts: [`At most 1 rest day in any ${REST_WINDOW} days.`, 'A rest day keeps the run alive but does not add to it.', 'Friend streaks follow the same rule.'],
    related: ['daily-goal'],
  },
  {
    slug: 'daily-goal',
    group: 'Packs and progress',
    title: 'How does the daily goal work?',
    answer: 'Pick how many puzzles you want to play a day, and the ring on You fills as you finish them. Missing it costs nothing.',
    facts: GOALS.map((g) => `${g.name}: ${g.n} ${g.n === 1 ? 'puzzle' : 'puzzles'} a day.`),
    steps: ['Open You.', 'Under Today, pick Light, Regular or Serious.'],
  },
  {
    slug: 'playing-as-a-guest',
    group: 'Packs and progress',
    title: 'Do I need an account?',
    answer: `No. A guest plays ${GUEST_GAMES} puzzles, then signs in to keep going, and signing in keeps your stars, run and points on every device.`,
    related: ['signing-in'],
  },

  // Points, ranks and leagues
  {
    slug: 'points',
    group: 'Points, ranks and leagues',
    title: 'How are points counted?',
    answer: `Each word you find is worth ${FIND_POINTS} points, and each tip-off costs ${TIP_OFF_COST}. Points add up for life and never go down.`,
    facts: [
      `Find every word and up to ${n(TIME_BONUS)} more: ${n(TIME_BONUS)} less the seconds you took.`,
      `A clean read, every word with no tip-off and no wrong pick, adds ${CLEAN_BONUS} once a puzzle.`,
      `A rare word, one fewer than 1 in 10 players found, adds ${RARE_BONUS} once a word.`,
      'Playing a puzzle again counts your best score only.',
    ],
    related: ['ranks', 'leagues'],
  },
  {
    slug: 'ranks',
    group: 'Points, ranks and leagues',
    title: 'What are the ranks?',
    answer: `Your rank comes from your lifetime points, ${LEVELS_PER_RANK} levels to a rank. Level 2 starts at ${n(FIRST_GAP)} points.`,
    facts: RANKS.map((r, i) => `${r}: from ${n(rankStart(i))} points.`),
    related: ['points'],
  },
  {
    slug: 'leagues',
    group: 'Points, ranks and leagues',
    title: 'How do leagues work?',
    answer: `Each week you play in a table of up to ${LEAGUE_TABLE} players, ranked by points from puzzles you finish for the first time. When the week ends, the top ${LEAGUE_UP} move up a tier.`,
    facts: [
      `The tiers: ${list(LEAGUE_TIERS)}.`,
      'A week starts on Monday at 00:00 UTC.',
      `The bottom 5 move down a tier, but never in a table of fewer than ${LEAGUE_DOWN_FROM}.`,
      'Replaying a puzzle earns no league points.',
      'You can leave from Your League, and join again any time.',
    ],
    related: ['points'],
  },
  {
    slug: 'medals',
    group: 'Points, ranks and leagues',
    title: 'How do I earn medals?',
    answer: 'Medals come from how you play: a clean read, a long word, a rare find, your run and your points. Each has tiers, struck in a new metal.',
    facts: [
      'Clean read: every word, no tip-off, no wrong pick.',
      'No-hint perfect: every word, no tip-off.',
      `Long word: a word of ${LONG_WORD} letters or more.`,
      `Deep find: a word across ${DEEP_JOINS} gaps or more.`,
      'Rare eye: a word fewer than 1 in 10 players found.',
    ],
    related: ['points'],
  },

  // Your pet and your look
  {
    slug: 'pets',
    group: 'Your pet and your look',
    title: 'How do I get another pet?',
    answer: `${PARTNERS[0]!.name} is free. The others open as your lifetime points grow, and points are never spent.`,
    facts: [
      ...PARTNERS.slice(1).map((p, i) => `${p.name}: ${n(PARTNER_POINTS[i + 1]!)} points.`),
      `Finish ${BOND_AT[0]} packs with a pet and it wears a scarf. At ${BOND_AT[1]}, a gold pin too.`,
    ],
    steps: ['Open You.', 'Under Pets, tap one to try it, then choose it.'],
    related: ['tip-offs', 'pet-outfits'],
  },
  {
    slug: 'pet-outfits',
    group: 'Your pet and your look',
    title: 'How do I dress my pet?',
    answer: 'Open You and tap an outfit under Outfits. An outfit you have not earned yet shows what it takes.',
    facts: Object.entries(OUTFIT_NEEDS).map(([o, need]) => `${cap(o)}: ${howTo(need)}`),
    related: ['pets'],
  },
  {
    slug: 'your-look',
    group: 'Your pet and your look',
    title: 'How do I change my look?',
    answer: 'Open You and tap the pencil on your picture. Most choices are free, and a few are earned.',
    facts: EARNED.map((e) => `${cap(e.name)}: ${howTo(e.need)}`),
  },

  // Friends
  {
    slug: 'play-together',
    group: 'Friends',
    title: 'How do I play with friends?',
    answer: 'Open a whole puzzle, press Play together and send the link. Everyone finds words on the same board at once.',
    steps: ['Open a puzzle from a pack.', 'Press Play together.', 'Send the link to your friends.'],
    related: ['friend-streaks'],
  },
  {
    slug: 'friend-streaks',
    group: 'Friends',
    title: 'What is a friend streak?',
    answer: 'A run you keep with one friend: it grows on every day you both finish a puzzle. Start one from Your People or from their page.',
    related: ['runs-and-rest-days'],
  },

  // Making puzzles
  {
    slug: 'make-a-puzzle',
    group: 'Making puzzles',
    title: 'How do I make a puzzle?',
    answer: 'Open Make and type a topic, an emoji, or a paragraph of your own. Check the draft, change what you like, then publish it and send the link.',
    steps: [
      'Open Make, from the foot of Packs.',
      'Type a topic, or leave the box empty and press Surprise me.',
      'Change the title, the words or the icon in the draft.',
      'Press Publish puzzle.',
    ],
    facts: [
      `A puzzle hides ${MAKE.minWords} to ${MAKE.maxWords} words in ${MAKE.minText} to ${MAKE.maxText} letters.`,
      `Up to ${MAKE.perHour} drafts and puzzles an hour.`,
      'Signed in players only.',
    ],
    related: ['made-by-players'],
  },
  {
    slug: 'made-by-players',
    group: 'Making puzzles',
    title: 'Where are puzzles other players made?',
    answer: 'On Made by players, linked at the foot of Packs. The most liked come first.',
    related: ['make-a-puzzle'],
  },

  // Your account
  {
    slug: 'signing-in',
    group: 'Your account',
    title: 'How do I sign in?',
    answer: 'Press Sign in and enter your email, then type the code we send you. There is no password.',
    related: ['playing-as-a-guest'],
  },
  {
    slug: 'download-my-data',
    group: 'Your account',
    title: 'How do I get a copy of my data?',
    answer: 'Open Settings and press Download my data. Everything we keep about you is saved as 1 file.',
    related: ['delete-my-account'],
  },
  {
    slug: 'delete-my-account',
    group: 'Your account',
    title: 'How do I delete my account?',
    answer: 'Open Settings and press Delete account at the foot. It removes your profile and plays at once, and it cannot be undone.',
    related: ['download-my-data'],
  },
];

/** The article at /help/SLUG, if there is one. */
export const helpArticle = (slug: string): HelpArticle | undefined => HELP_ARTICLES.find((a) => a.slug === slug);

/** Articles by group, in group order, leaving out empty groups. */
export const helpByGroup = (articles: readonly HelpArticle[] = HELP_ARTICLES) =>
  HELP_GROUPS.map((g) => ({ group: g, articles: articles.filter((a) => a.group === g) })).filter((x) => x.articles.length > 0);

/** Articles whose question, answer, steps or facts contain every word typed, case ignored. */
export function searchHelp(query: string, articles: readonly HelpArticle[] = HELP_ARTICLES): HelpArticle[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...articles];
  return articles.filter((a) => {
    const text = [a.title, a.answer, ...(a.steps ?? []), ...(a.facts ?? [])].join(' ').toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
