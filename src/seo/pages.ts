// SEO, GEO and link previews. One source for every public page's title, description, preview image,
// structured data (JSON-LD) and crawler-readable text. Used by Pages Functions only (never the app
// bundle). Facts only: nothing here claims numbers we do not have.

import gamesFile from '../../data/games.json';
import twoSigns from '../../design/stories/the-2-signs.json';
import earlyBus from '../../design/stories/the-early-bus.json';
import longSpoon from '../../design/stories/the-long-spoon.json';
import openBox from '../../design/stories/the-open-box.json';
import missingYear from '../../design/stories/the-year-that-is-missing.json';
import type { Chapter } from '../engine/chapter';
import { pick } from '../copy';
import { buildHiddenWords } from '../engine/hiddenWords';
import { sponsorOf } from '../engine/sponsor';

type Game = { id: string; category: string; title: string; noun: string; text: string; dict: string[]; sponsor?: unknown };
const data = gamesFile as unknown as { games: Game[]; dailyPool: string[]; filters: string[] };
/** Every written case. A new file in `design/stories` is added here: a test fails until it is. */
export const CASES: readonly Chapter[] = [longSpoon, openBox, earlyBus, missingYear, twoSigns] as unknown as Chapter[];
/** Curated order for lists: follows the filter tabs, so no single topic leads. */
const games = [...data.games].sort((a, b) => data.filters.indexOf(a.category) - data.filters.indexOf(b.category));

export const SITE = 'Gazecraft';
export const TAGLINE = 'Find it. Figure it out.';
export const PITCH =
  'A free detective game, played a few minutes at a time. Something was taken and somebody did it. Work the case a step at a time: read what was left behind, find the words hiding in plain sight, clear the suspects and name who is left.';

export type ProfileSummary = {
  handle: string;
  name: string;
  current_streak: number;
  dailies: number;
  perfect: number;
  followers: number;
};

export type Page = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  /** Path used for the canonical link and og:url. */
  canonical: string;
  jsonLd: object[];
  /** Plain HTML for readers that do not run JavaScript (AI crawlers, some previewers). Escaped. */
  body: string;
  /** Keep this page out of search results. */
  noindex?: boolean;
};

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const count = (g: Game) => buildHiddenWords(g).answers.length;
const level = (g: Game) => buildHiddenWords(g).difficulty;
const question = (g: Game) => `Can you find ${count(g)} ${g.noun}?`;
/** "With NAME." on a sponsored puzzle, else nothing. The same rule and the same line as the app. */
function withLine(g: Game): string {
  const s = sponsorOf(g.sponsor);
  // "Chi Farms Ltd." already ends its own sentence.
  return s ? `${pick('sponsorWith', { name: s.name }).replace(/\.$/, '')}.` : '';
}
/** Joins sentences, leaving out the empty ones. */
const say = (...parts: string[]) => parts.filter(Boolean).join(' ');

export const FAQ: Array<[string, string]> = [
  ['What is Gazecraft?', PITCH],
  [
    'How do you play?',
    'Read the paragraph and drag across the letters of a hidden word. On a phone, swipe across the letters, or tap the first letter and then the last. Answers can run across spaces and punctuation.',
  ],
  ['Is Gazecraft free?', 'Yes. Every puzzle is free to play in your browser. There is nothing to download.'],
  ['Do I need an account?', 'No. You can play as a guest. Sign in to keep your streak, get on the leaderboard and follow other players.'],
  [
    'How is the score counted?',
    '100 points per word found, minus 25 for each tip-off. Finding every word adds a time bonus.',
  ],
];

const GAME_LD = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: SITE,
  description: PITCH,
  genre: ['Word game', 'Puzzle'],
  gamePlatform: 'Web browser',
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  playMode: 'SinglePlayer',
  inLanguage: 'en',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
};

function crumbs(origin: string, items: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${origin}${path}` })),
  };
}

const faqHtml = () =>
  `<h2>Questions</h2>${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}`;

function home(origin: string): Page {
  const list = games.map((g) => `<li><a href="/play/${g.id}">${esc(question(g))}</a> ${esc(g.category)}, ${esc(level(g))}.</li>`).join('');
  return {
    title: "Think you read carefully? You don't. · Gazecraft",
    description: '"Pat omitted" hides ATOM. You just read past it. One paragraph a day, every answer in plain sight. Slow down. Look closer.',
    image: '/og/default.png',
    imageAlt: 'Gazecraft. Find it. Figure it out.',
    canonical: '/',
    jsonLd: [
      { ...GAME_LD, url: `${origin}/` },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: `${origin}/`, description: PITCH, inLanguage: 'en' },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
    body:
      `<h1>${SITE}. ${TAGLINE}</h1><p>${esc(PITCH)}</p>` +
      `<h2>How to play</h2><ol><li>Open a case and read its brief.</li><li>Read the paragraph.</li><li>Drag across the letters of each hidden word. They can run across spaces and punctuation.</li></ol>` +
      `<p>Example: in "Pat omitted nothing", the letters "Pat omitted" hide ATOM.</p>` +
      `<h2>Puzzles</h2><ul>${list}</ul>` +
      faqHtml(),
  };
}

/** A dare for each puzzle's own crowd, used when that puzzle's link is shared. */
const DARE: Record<string, string> = {
  Bible: 'Know your Bible? Prove it. The books are hiding in one ordinary paragraph, and your eyes will slide right past them.',
  Names: 'Think you know your names? They are hiding in plain sight. You will read straight past some of them.',
  Football: 'Call yourself a football fan? The players are hiding in one paragraph. Find them all or admit defeat.',
  Health: 'Medical mind? Every term is right there on the page. Your eyes will still skip a few.',
  Science: 'Science brain? The words are right in front of you. Seeing them is another matter.',
  AI: 'Work with AI? These words are hiding in a paragraph about something else. Spot them yourself.',
  History: 'Know your history? It is hiding in plain sight. You will read right past some of it.',
  Naija: 'Naija to the bone? The names are hiding in one ordinary paragraph. You will read straight past some of them.',
  General: 'Sharp eyes? Everything you need is in one short paragraph. You will still miss some.',
};

function gamePage(origin: string, g: Game): Page {
  const q = question(g);
  return {
    title: `${q} You won't find them all. · Gazecraft`,
    description: say(`${DARE[g.category] ?? DARE.General} ${level(g)}, free, no sign up.`, withLine(g)),
    image: `/og/${g.id}.png`,
    imageAlt: say(`Gazecraft puzzle: ${q}`, withLine(g)),
    canonical: `/play/${g.id}`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Game',
        name: `${g.title}: ${q}`,
        description: `A Gazecraft word puzzle. ${count(g)} ${g.noun} are hidden across spaces and punctuation in one paragraph.`,
        url: `${origin}/play/${g.id}`,
        genre: 'Word puzzle',
        isAccessibleForFree: true,
        isPartOf: { '@type': 'VideoGame', name: SITE, url: `${origin}/` },
      },
      crumbs(origin, [
        ['Gazecraft', '/'],
        ['Games', '/play'],
        [g.title, `/play/${g.id}`],
      ]),
    ],
    body:
      `<h1>${esc(q)}</h1><p>${esc(say(`${g.category} puzzle, ${level(g)}. Words hide across spaces and punctuation.`, withLine(g)))}</p>` +
      `<blockquote>${esc(g.text)}</blockquote>` +
      `<p><a href="/play/${g.id}">Play this puzzle on Gazecraft</a>. <a href="/play">More puzzles</a>.</p>`,
  };
}

/** A written case: its title, what is missing, and the way in. Nothing of its evidence or its ending. */
function casePage(origin: string, c: Chapter): Page {
  const description = `${c.brief[0] ?? c.item.line} ${c.steps.length} steps, from the brief to the ending.`;
  return {
    title: `${c.title} · A case · ${SITE}`,
    description,
    image: '/og/default.png',
    imageAlt: `${c.title}, a case on ${SITE}`,
    canonical: `/case/${c.id}`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Game',
        name: c.title,
        description,
        url: `${origin}/case/${c.id}`,
        isAccessibleForFree: true,
      },
    ],
    body: `<h1>${esc(c.title)}</h1>${c.brief.map((l) => `<p>${esc(l)}</p>`).join('')}<p><a href="/case/${c.id}">Open the case</a>.</p>`,
  };
}

export function profilePage(origin: string, p: ProfileSummary): Page {
  const stats = `${p.current_streak} day run · ${p.perfect} perfect`;
  return {
    title: `${p.name} (@${p.handle}) on Gazecraft`,
    description: `@${p.handle} set the bar: ${stats}. Think you can beat it?`,
    image: '/og/default.png',
    imageAlt: `${p.name} on Gazecraft`,
    canonical: `/u/${p.handle}`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url: `${origin}/u/${p.handle}`,
        mainEntity: {
          '@type': 'Person',
          name: p.name,
          alternateName: `@${p.handle}`,
          url: `${origin}/u/${p.handle}`,
          interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/FollowAction', userInteractionCount: p.followers },
        },
      },
    ],
    body: `<h1>${esc(p.name)} (@${esc(p.handle)})</h1><p>${esc(stats)}. ${p.followers} followers on Gazecraft.</p>`,
  };
}

const simple = (path: string, title: string, description: string, body: string): Page => ({
  title,
  description,
  image: '/og/default.png',
  imageAlt: 'Gazecraft. Find it. Figure it out.',
  canonical: path,
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description }],
  body: `<h1>${esc(title.replace(/ · Gazecraft$/, ''))}</h1><p>${esc(description)}</p>${body}`,
});

/** Everything a crawler or link previewer needs for one path. Profiles need their summary passed in. */
export function pageFor(path: string, origin: string): Page {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return home(origin);

  const play = clean.match(/^\/play\/([a-z0-9-]{2,40})$/);
  if (play) {
    const g = games.find((x) => x.id === play[1]);
    return g ? gamePage(origin, g) : home(origin);
  }

  const story = clean.match(/^\/case\/([a-z0-9-]{2,40})(\/\d{1,2})?$/);
  if (story) {
    const c = CASES.find((x) => x.id === story[1]);
    // A step is part of its case: it is not a page of its own.
    return c ? { ...casePage(origin, c), noindex: !!story[2] } : { ...home(origin), canonical: clean, noindex: true };
  }

  // There is no daily any more. An old link to one, or to its answers, is the cases.
  if (/^\/d\/\d{1,6}(\/answers)?$/.test(clean)) return { ...home(origin), canonical: '/play', noindex: true };

  if (clean === '/play') {
    const list = games.map((g) => `<li><a href="/play/${g.id}">${esc(question(g))}</a></li>`).join('');
    const cases = CASES.map((c) => `<li><a href="/case/${c.id}">${esc(c.title)}</a></li>`).join('');
    return simple('/play', 'Cases · Gazecraft', `Work a case a step at a time, then ${games.length} more to practise on. Every answer is in plain sight. You will still miss some.`, `<ul>${cases}${list}</ul>`);
  }
  if (clean === '/leaderboard') return simple('/leaderboard', 'Ranks · Gazecraft', 'Who has worked the open case on Gazecraft, by the points their steps earned.', '');
  if (clean === '/players') return simple('/players', 'Players · Gazecraft', 'Find players to follow on Gazecraft: longest runs, most points and new players.', '');
  if (clean === '/privacy') return simple('/privacy', 'Privacy · Gazecraft', 'What Gazecraft keeps, why, and how to delete it.', '');

  // Custom puzzles, sign in, settings and anything else: generic preview, not indexed.
  return { ...home(origin), canonical: clean, noindex: !clean.startsWith('/u/') };
}

/** URLs worth indexing, for sitemap.xml. Profiles are left out on purpose. */
export function sitemapPaths(): Array<{ path: string; daily?: boolean }> {
  return [
    { path: '/' },
    { path: '/play' },
    ...CASES.map((c) => ({ path: `/case/${c.id}` })),
    ...games.map((g) => ({ path: `/play/${g.id}` })),
    { path: '/leaderboard' },
    { path: '/players' },
    { path: '/privacy' },
  ];
}

/** llms.txt: a short, factual guide for AI assistants (https://llmstxt.org). */
export function llmsTxt(origin: string): string {
  return [
    `# ${SITE}`,
    '',
    `> ${PITCH}`,
    '',
    'Gazecraft runs in the browser at no cost. Guests can play every puzzle; signing in keeps a streak, ranks verified scores on the leaderboard and lets players follow each other.',
    '',
    '## Key pages',
    `- [Home](${origin}/): what Gazecraft is and a playable example`,
    `- [Cases](${origin}/play): the open case, and puzzles to practise on`,
    ...CASES.map((c) => `- [${c.title}](${origin}/case/${c.id}): a case in ${c.steps.length} steps. ${c.brief[0] ?? ''}`),
    `- [Ranks](${origin}/leaderboard): who has worked the open case, by points`,
    `- [Players](${origin}/players): find players to follow`,
    `- [Privacy](${origin}/privacy): what is stored and how to delete it`,
    '',
    '## Puzzles',
    ...games.map((x) => `- [${x.title}](${origin}/play/${x.id}): ${question(x)} (${x.category}, ${level(x)})`),
    '',
    '## How it works',
    ...FAQ.map(([q, a]) => `- ${q} ${a}`),
    '',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');
}
