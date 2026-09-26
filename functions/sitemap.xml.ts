// /sitemap.xml: curated puzzles, the last 14 dailies and the main pages. Rebuilt on every request.
import { sitemapPaths } from '../src/seo/pages';

export const onRequest = (ctx: { request: Request }) => {
  const origin = new URL(ctx.request.url).origin;
  const day = new Date().toISOString().slice(0, 10);
  const urls = sitemapPaths()
    .map((u) => `<url><loc>${origin}${u.path}</loc>${u.daily ? '' : `<lastmod>${day}</lastmod>`}<changefreq>${u.daily ? 'never' : 'daily'}</changefreq></url>`)
    .join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
