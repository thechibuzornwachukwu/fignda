// /llms.txt: a factual guide for AI assistants (https://llmstxt.org). Built from the same data as the site.
import { llmsTxt } from '../src/seo/pages';

export const onRequest = (ctx: { request: Request }) =>
  new Response(llmsTxt(new URL(ctx.request.url).origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
