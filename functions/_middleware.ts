// Link previews. Crawlers do not run JavaScript, so the right title, description and image are
// written into the HTML on the way out. Data comes from data/games.json only, never from the URL
// beyond a known id or day number. Custom puzzles (/p/:code) get the default preview.

import gamesFile from '../data/games.json';
import { dailyGameId, dayNo } from '../src/engine/daily';
import { buildHiddenWords } from '../src/engine/hiddenWords';

type Game = { id: string; title: string; noun: string; text: string; dict: string[] };
const { games, dailyPool } = gamesFile as unknown as { games: Game[]; dailyPool: string[] };

type Meta = { title: string; description: string; image: string };

const DEFAULT: Meta = {
  title: 'Fignda · Find it. Figure it out.',
  description: 'Find words hidden across letters, spaces and punctuation. A new puzzle every day.',
  image: '/og/default.png',
};

export function metaFor(path: string, today = dayNo()): Meta {
  const play = path.match(/^\/play\/([a-z0-9-]{2,40})\/?$/);
  if (play) {
    const g = games.find((x) => x.id === play[1]);
    if (!g) return DEFAULT;
    const n = buildHiddenWords(g).answers.length;
    return {
      title: `${g.title} · Fignda`,
      description: `Can you find ${n} ${g.noun}? Words hide across spaces and punctuation.`,
      image: `/og/${g.id}.png`,
    };
  }
  const daily = path.match(/^\/d\/(\d{1,6})\/?$/);
  if (daily) {
    const n = Number(daily[1]);
    // Future days stay secret: no title or image that would reveal tomorrow's game.
    if (n < 1 || n > today) return DEFAULT;
    const g = games.find((x) => x.id === dailyGameId(n, dailyPool));
    if (!g) return DEFAULT;
    return {
      title: `Daily #${n} · Fignda`,
      description: `How many ${g.noun} can you find? One try. A new puzzle at midnight.`,
      image: `/og/daily-${g.id}.png`,
    };
  }
  return DEFAULT;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Minimal types for the Pages runtime.
type Element = { setInnerContent(s: string): void; setAttribute(k: string, v: string): void; append(s: string, o: { html: boolean }): void };
declare const HTMLRewriter: {
  new (): { on(sel: string, h: { element(e: Element): void }): InstanceType<typeof HTMLRewriter>; transform(r: Response): Response };
};

export const onRequest = async (ctx: { request: Request; next: () => Promise<Response> }) => {
  const res = await ctx.next();
  if (ctx.request.method !== 'GET' || !(res.headers.get('content-type') ?? '').includes('text/html')) return res;

  const url = new URL(ctx.request.url);
  const m = metaFor(url.pathname);
  const image = `${url.origin}${m.image}`;
  const tags = [
    ['og:type', 'website'],
    ['og:site_name', 'Fignda'],
    ['og:title', m.title],
    ['og:description', m.description],
    ['og:url', `${url.origin}${url.pathname}`],
    ['og:image', image],
    ['og:image:width', '1200'],
    ['og:image:height', '630'],
  ]
    .map(([p, c]) => `<meta property="${p}" content="${esc(c!)}" />`)
    .concat(
      [
        ['twitter:card', 'summary_large_image'],
        ['twitter:title', m.title],
        ['twitter:description', m.description],
        ['twitter:image', image],
      ].map(([n, c]) => `<meta name="${n}" content="${esc(c!)}" />`),
    )
    .join('');

  return new HTMLRewriter()
    .on('title', { element: (e) => e.setInnerContent(m.title) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute('content', m.description) })
    .on('head', { element: (e) => e.append(tags, { html: true }) })
    .transform(res);
};
