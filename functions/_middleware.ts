// SEO, GEO and link previews for every HTML response. Crawlers and link previewers mostly do not run
// JavaScript, so each page's title, description, preview image, canonical link, structured data and
// a readable text version are written into the HTML on the way out. Data comes from data/games.json
// and, for profiles, the public profile summary. Never from free text in the URL.

import { esc, pageFor, profilePage, type Page, type ProfileSummary } from '../src/seo/pages';

type Env = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

async function profileSummary(handle: string, env: Env): Promise<ProfileSummary | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !/^[a-z0-9._]{2,20}$/.test(handle)) return null;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/profile_summary`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_handle: handle }),
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) return null;
    return ((await r.json()) as ProfileSummary[])[0] ?? null;
  } catch {
    return null;
  }
}

/** JSON inside <script type="application/ld+json">: escape so text can never close the tag. */
const ldJson = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export function headTags(p: Page, origin: string): string {
  const image = `${origin}${p.image}`;
  const url = `${origin}${p.canonical}`;
  const prop = (k: string, v: string) => `<meta property="${k}" content="${esc(v)}" />`;
  const name = (k: string, v: string) => `<meta name="${k}" content="${esc(v)}" />`;
  return [
    `<link rel="canonical" href="${esc(url)}" />`,
    p.noindex ? name('robots', 'noindex, follow') : '',
    prop('og:type', 'website'),
    prop('og:site_name', 'Gazecraft'),
    prop('og:locale', 'en_GB'),
    prop('og:title', p.title),
    prop('og:description', p.description),
    prop('og:url', url),
    prop('og:image', image),
    prop('og:image:width', '1200'),
    prop('og:image:height', '630'),
    prop('og:image:alt', p.imageAlt),
    name('twitter:card', 'summary_large_image'),
    name('twitter:title', p.title),
    name('twitter:description', p.description),
    name('twitter:image', image),
    name('twitter:image:alt', p.imageAlt),
    ...p.jsonLd.map((o) => `<script type="application/ld+json">${ldJson(o)}</script>`),
  ].join('');
}

// Minimal types for the Pages runtime.
type Element = {
  setInnerContent(s: string): void;
  setAttribute(k: string, v: string): void;
  append(s: string, o: { html: boolean }): void;
  prepend(s: string, o: { html: boolean }): void;
};
declare const HTMLRewriter: {
  new (): { on(sel: string, h: { element(e: Element): void }): InstanceType<typeof HTMLRewriter>; transform(r: Response): Response };
};

export const onRequest = async (ctx: { request: Request; next: () => Promise<Response>; env: Env }) => {
  const res = await ctx.next();
  if (ctx.request.method !== 'GET' || !(res.headers.get('content-type') ?? '').includes('text/html')) return res;

  const url = new URL(ctx.request.url);
  const who = url.pathname.match(/^\/u\/([a-z0-9._]{2,20})\/?$/);
  const summary = who ? await profileSummary(who[1]!, ctx.env) : null;
  const page = summary ? profilePage(url.origin, summary) : pageFor(url.pathname, url.origin);

  return new HTMLRewriter()
    .on('title', { element: (e) => e.setInnerContent(page.title) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute('content', page.description) })
    .on('head', { element: (e) => e.append(headTags(page, url.origin), { html: true }) })
    // Readable text for crawlers and previewers that do not run JavaScript. People see the app.
    .on('body', { element: (e) => e.prepend(`<noscript><main>${page.body}</main></noscript>`, { html: true }) })
    .transform(res);
};
