// SEO, GEO and link previews. One source for every public page's title, description, preview image,
// structured data (JSON-LD) and crawler-readable text. Used by Pages Functions only (never the app
// bundle). Facts only: nothing here claims numbers we do not have.

import gamesFile from '../../data/games.json';
import { pick } from '../copy';
import { buildHiddenWords } from '../engine/hiddenWords';
import { sponsorOf } from '../engine/sponsor';
import { HELP_ARTICLES, helpArticle } from '../help/articles';
import type { HelpArticle } from '../help/types';

type Game = { id: string; category: string; title: string; noun: string; text: string; dict: string[]; sponsor?: unknown };
const data = gamesFile as unknown as { games: Game[]; dailyPool: string[]; filters: string[] };
/** Curated order for lists: follows the filter tabs, so no single topic leads. */
const games = [...data.games].sort((a, b) => data.filters.indexOf(a.category) - data.filters.indexOf(b.category));

export const SITE = 'Gazecraft';
export const TAGLINE = 'Find it. Figure it out.';
export const PITCH =
  'A free word puzzle game in your browser. Words and numbers hide in plain sight inside ordinary sentences. Lock in for 3 minutes and find them all.';

/** What people type when they look for a game like this. Honest about what it is: a word puzzle, never a promise. */
export const SEARCH_TERMS = ['word puzzle', 'hidden words', 'word search', 'word game', 'brain teaser', 'puzzle game', 'free online game', 'number puzzle', 'play with friends'];

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
  ['Is Gazecraft free?', 'Yes. Every puzzle is free to play in your browser, on a phone or a laptop. There is nothing to download.'],
  [
    'Is it like word search, Wordle or 4 Pics 1 Word?',
    'It is its own game. Like a word search, you find hidden words, but they hide across the gaps in real sentences, not in a grid of letters. Like Wordle, each puzzle is short. It takes focus: most players read straight past a few.',
  ],
  ['Can I play with friends?', 'Yes. Open a puzzle, choose Play together and send the link. Everyone finds words on the same board at once, and there is a weekly league.'],
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
  genre: ['Word game', 'Puzzle', 'Word search', 'Brain teaser'],
  keywords: SEARCH_TERMS.join(', '),
  gamePlatform: 'Web browser',
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  playMode: ['SinglePlayer', 'MultiPlayer'],
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
    title: 'Gazecraft: free hidden word puzzle game',
    description: '"Pat omitted" hides ATOM. A free word puzzle game: words hide across the gaps in real sentences. Lock in for 3 minutes. Slow down. Look closer.',
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
      `<h1>${SITE}: a free hidden word puzzle game</h1><p>${esc(PITCH)}</p>` +
      `<p>Short word puzzles and number puzzles, a few minutes each. Play alone, or play with friends in a room and a weekly league. No download, no account needed.</p>` +
      `<h2>How to play</h2><ol><li>Open a pack.</li><li>Read the paragraph.</li><li>Drag across the letters of each hidden word. They can run across spaces and punctuation.</li></ol>` +
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

/** One help article: its question, answer, steps and facts, as text a crawler reads. */
function helpPage(a: HelpArticle): Page {
  const steps = a.steps?.length ? `<ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
  const facts = a.facts?.length ? `<ul>${a.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  return {
    title: `${a.title} · Gazecraft`,
    description: a.answer,
    image: '/og/default.png',
    imageAlt: 'Gazecraft. Find it. Figure it out.',
    canonical: `/help/${a.slug}`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [{ '@type': 'Question', name: a.title, acceptedAnswer: { '@type': 'Answer', text: a.answer } }],
      },
    ],
    body: `<h1>${esc(a.title)}</h1><p>${esc(a.answer)}</p>${steps}${facts}`,
  };
}

/** Everything a crawler or link previewer needs for one path. Profiles need their summary passed in. */
export function pageFor(path: string, origin: string): Page {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return home(origin);

  const play = clean.match(/^\/play\/([a-z0-9-]{2,40})$/);
  if (play) {
    const g = games.find((x) => x.id === play[1]);
    return g ? gamePage(origin, g) : home(origin);
  }

  // There is no daily any more. An old link to one, or to its answers, is the cases.
  if (/^\/d\/\d{1,6}(\/answers)?$/.test(clean)) return { ...home(origin), canonical: '/play', noindex: true };

  if (clean === '/play') {
    const list = games.map((g) => `<li><a href="/play/${g.id}">${esc(question(g))}</a></li>`).join('');
    return simple('/play', 'Packs · Gazecraft', `${games.length} packs, a puzzle at a time. Every answer is in plain sight. You will still miss some.`, `<ul>${list}</ul>`);
  }
  if (clean === '/leaderboard') return simple('/leaderboard', 'Ranks · Gazecraft', 'The best scores on the pack you are on, on Gazecraft.', '');
  if (clean === '/players') return simple('/players', 'Players · Gazecraft', 'Find players to follow on Gazecraft: longest runs, most points and new players.', '');
  if (clean === '/privacy') return simple('/privacy', 'Privacy · Gazecraft', 'What Gazecraft keeps, why, and how to delete it.', '');
  if (clean === '/help') {
    const list = HELP_ARTICLES.map((a) => `<li><a href="/help/${a.slug}">${esc(a.title)}</a></li>`).join('');
    return simple(
      '/help',
      'Help · Gazecraft',
      'How Gazecraft works: playing, packs, points, leagues, pets, friends and your account.',
      `<ul>${list}</ul>`,
    );
  }

  const help = clean.match(/^\/help\/([a-z0-9-]{2,80})$/);
  if (help) {
    const a = helpArticle(help[1] ?? '');
    return a ? helpPage(a) : { ...home(origin), canonical: clean, noindex: true };
  }

  // Custom puzzles, sign in, settings and anything else: generic preview, not indexed.
  return { ...home(origin), canonical: clean, noindex: !clean.startsWith('/u/') };
}

/** URLs worth indexing, for sitemap.xml. Profiles are left out on purpose. */
export function sitemapPaths(): Array<{ path: string; daily?: boolean }> {
  return [
    { path: '/' },
    { path: '/play' },
    ...games.map((g) => ({ path: `/play/${g.id}` })),
    { path: '/leaderboard' },
    { path: '/players' },
    { path: '/privacy' },
    { path: '/help' },
    ...HELP_ARTICLES.map((a) => ({ path: '/help/' + a.slug })),
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
    `- [Packs](${origin}/play): every pack, a puzzle at a time`,
    `- [Ranks](${origin}/leaderboard): the best scores on the pack you are on`,
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
