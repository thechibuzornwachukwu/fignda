// SEO, GEO and link previews. One source for every public page's title, description, preview image,
// structured data (JSON-LD) and crawler-readable text. Used by Pages Functions only (never the app
// bundle). Facts only: nothing here claims numbers we do not have.

import gamesFile from '../../data/games.json';
import holidaysFile from '../../data/holidays.json';
import { dailyGameId, dayNo, holidayOn, type Calendar } from '../engine/daily';
import { pick } from '../copy';
import { buildHiddenWords } from '../engine/hiddenWords';
import { sponsorOf } from '../engine/sponsor';

type Game = { id: string; category: string; title: string; noun: string; text: string; dict: string[]; sponsor?: unknown };
const data = gamesFile as unknown as { games: Game[]; dailyPool: string[]; filters: string[] };
const { dailyPool } = data;
const calendar: Calendar = holidaysFile;
const dailyId = (n: number) => dailyGameId(n, dailyPool, calendar);
/** "Christmas daily" on a holiday, else "Daily". */
function dailyName(n: number): string {
  const h = holidayOn(n, calendar);
  return h ? `${h.name} daily` : 'Daily';
}
/** Curated order for lists: follows the filter tabs, so no single topic leads. */
const games = [...data.games].sort((a, b) => data.filters.indexOf(a.category) - data.filters.indexOf(b.category));

export const SITE = 'Gazecraft';
export const TAGLINE = 'Find it. Figure it out.';
export const PITCH =
  'A free word puzzle where words hide across spaces and punctuation, so "Pat omitted" hides ATOM. Drag across the letters to find them. A new daily puzzle every midnight.';

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
  [
    'What is the daily puzzle?',
    'One puzzle a day for everyone. You get one try, the number of hidden words stays secret until midnight UTC, and wrong picks cost 10 points.',
  ],
  ['Do I need an account?', 'No. You can play as a guest. Sign in to keep your streak, get on the leaderboard and follow other players.'],
  [
    'How is the score counted?',
    '100 points per word found, minus 25 for each hint. Finding every word adds a time bonus. On the daily, wrong picks cost 10.',
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
      `<h2>How to play</h2><ol><li>Pick a puzzle or play the daily.</li><li>Read the paragraph.</li><li>Drag across the letters of each hidden word. They can run across spaces and punctuation.</li></ol>` +
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

function dailyPage(origin: string, n: number, g: Game): Page {
  const label = dailyName(n);
  const q = `${label} #${n}: how many ${g.noun} can you find?`;
  return {
    title: `${q} · Gazecraft`,
    description: say('One try. No count. Everyone plays the same puzzle today. Are you sharper than them?', withLine(g)),
    image: `/og/daily-${g.id}.png`,
    imageAlt: say(`Gazecraft daily puzzle: how many ${g.noun} can you find?`, withLine(g)),
    canonical: `/d/${n}`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Game',
        name: `Gazecraft ${label} #${n}`,
        description: `Today's Gazecraft daily: find the ${g.noun} hidden across spaces and punctuation. One try.`,
        url: `${origin}/d/${n}`,
        isAccessibleForFree: true,
        isPartOf: { '@type': 'VideoGame', name: SITE, url: `${origin}/` },
      },
    ],
    body: `<h1>${esc(q)}</h1><p>${esc(say('One try. The count stays hidden until midnight UTC. Wrong picks cost 10 points.', withLine(g)))}</p><p><a href="/d/${n}">Play the daily on Gazecraft</a>.</p>`,
  };
}

/** A past daily's answers. Only ever built for days that are over. */
function answersPage(origin: string, n: number, g: Game): Page {
  const label = dailyName(n);
  const date = new Date(Date.UTC(2026, 0, n)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const answers = buildHiddenWords(g).answers.map((a) => a.label);
  const title = `Gazecraft ${label} #${n} answers (${date}) · Gazecraft`;
  const description = `All ${answers.length} hidden ${g.noun} from the Gazecraft daily of ${date}, and the paragraph they were hiding in. Today's puzzle is waiting.`;
  return {
    title,
    description,
    image: `/og/daily-${g.id}.png`,
    imageAlt: `Gazecraft daily puzzle: ${g.noun}`,
    canonical: `/d/${n}/answers`,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: title.replace(/ · Gazecraft$/, ''), description, url: `${origin}/d/${n}/answers`, isPartOf: { '@type': 'VideoGame', name: SITE, url: `${origin}/` } },
      crumbs(origin, [
        ['Gazecraft', '/'],
        [`${label} #${n}`, `/d/${n}`],
        ['Answers', `/d/${n}/answers`],
      ]),
    ],
    body:
      `<h1>${esc(`${label} #${n} answers`)}</h1><p>${esc(date)}. ${answers.length} hidden ${esc(g.noun)}. Words hide across spaces and punctuation.</p>` +
      `<blockquote>${esc(g.text)}</blockquote>` +
      `<ol>${answers.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>` +
      `<p><a href="/play">Play today's daily on Gazecraft</a>.</p>`,
  };
}

export function profilePage(origin: string, p: ProfileSummary): Page {
  const stats = `${p.current_streak} day streak · ${p.dailies} ${p.dailies === 1 ? 'daily' : 'dailies'} · ${p.perfect} perfect`;
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
export function pageFor(path: string, origin: string, today = dayNo()): Page {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return home(origin);

  const play = clean.match(/^\/play\/([a-z0-9-]{2,40})$/);
  if (play) {
    const g = games.find((x) => x.id === play[1]);
    return g ? gamePage(origin, g) : home(origin);
  }

  const daily = clean.match(/^\/d\/(\d{1,6})$/);
  if (daily) {
    const n = Number(daily[1]);
    // Future days stay secret: no title or image that would reveal tomorrow's game.
    const g = n >= 1 && n <= today ? games.find((x) => x.id === dailyId(n)) : undefined;
    return g ? dailyPage(origin, n, g) : { ...home(origin), noindex: true };
  }

  const past = clean.match(/^\/d\/(\d{1,6})\/answers$/);
  if (past) {
    const n = Number(past[1]);
    // Today and the future stay secret.
    const g = n >= 1 && n < today ? games.find((x) => x.id === dailyId(n)) : undefined;
    return g ? answersPage(origin, n, g) : { ...home(origin), canonical: clean, noindex: true };
  }

  if (clean === '/play') {
    const list = games.map((g) => `<li><a href="/play/${g.id}">${esc(question(g))}</a></li>`).join('');
    return simple('/play', 'Word puzzles · Gazecraft', `${games.length} puzzles and a new daily every midnight. Every answer is in plain sight. You will still miss some.`, `<ul>${list}</ul>`);
  }
  if (clean === '/leaderboard') return simple('/leaderboard', "Today's leaderboard · Gazecraft", 'Top verified scores on the Gazecraft daily puzzle, and the best score on every puzzle.', '');
  if (clean === '/players') return simple('/players', 'Players · Gazecraft', 'Find players to follow on Gazecraft: longest streaks, most perfect dailies and new players.', '');
  if (clean === '/privacy') return simple('/privacy', 'Privacy · Gazecraft', 'What Gazecraft keeps, why, and how to delete it.', '');

  // Custom puzzles, sign in, settings and anything else: generic preview, not indexed.
  return { ...home(origin), canonical: clean, noindex: !clean.startsWith('/u/') };
}

/** URLs worth indexing, for sitemap.xml. Profiles are left out on purpose. */
export function sitemapPaths(today = dayNo()): Array<{ path: string; daily?: boolean }> {
  return [
    { path: '/' },
    { path: '/play' },
    ...games.map((g) => ({ path: `/play/${g.id}` })),
    ...Array.from({ length: 14 }, (_, i) => ({ path: `/d/${today - i}`, daily: true })).filter((x) => Number(x.path.slice(3)) >= 1),
    // Past dailies' answers: what people search for the morning after.
    ...Array.from({ length: 60 }, (_, i) => ({ path: `/d/${today - 1 - i}/answers`, daily: true })).filter((x) => Number(x.path.split('/')[2]) >= 1),
    { path: '/leaderboard' },
    { path: '/players' },
    { path: '/privacy' },
  ];
}

/** llms.txt: a short, factual guide for AI assistants (https://llmstxt.org). */
export function llmsTxt(origin: string, today = dayNo()): string {
  const g = games.find((x) => x.id === dailyId(today));
  return [
    `# ${SITE}`,
    '',
    `> ${PITCH}`,
    '',
    'Gazecraft runs in the browser at no cost. Guests can play every puzzle; signing in keeps a streak, ranks verified scores on the leaderboard and lets players follow each other.',
    '',
    '## Key pages',
    `- [Home](${origin}/): what Gazecraft is and a playable example`,
    `- [All puzzles](${origin}/play): curated puzzles and the daily`,
    g ? `- [Today's ${dailyName(today) === 'Daily' ? 'daily' : dailyName(today)}](${origin}/d/${today}): how many ${g.noun} can you find? One try, count hidden until midnight UTC` : '',
    `- [Leaderboard](${origin}/leaderboard): top verified daily scores`,
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
