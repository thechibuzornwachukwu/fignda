import { headTags } from '../../functions/_middleware';
import { FAQ, llmsTxt, pageFor, profilePage, sitemapPaths, type Page } from '../../src/seo/pages';

const O = 'https://fignda.pages.dev';
const allCopy = (p: Page) => [p.title, p.description, p.imageAlt, p.body, JSON.stringify(p.jsonLd)].join('\n');

describe('page metadata', () => {
  it('home leads with the hook and carries game, site and FAQ data', () => {
    const p = pageFor('/', O);
    expect(p.title).toBe("Think you read carefully? You don't. · Fignda");
    expect(p.jsonLd.map((o) => (o as { '@type': string })['@type'])).toEqual(['VideoGame', 'WebSite', 'FAQPage']);
    expect(p.body).toContain('Pat omitted');
    // No single topic leads: general knowledge comes before the Bible puzzles.
    expect(p.body.indexOf('/play/general')).toBeLessThan(p.body.indexOf('/play/bible'));
  });

  it('a puzzle page asks the question, dares its own crowd and ships its paragraph as text', () => {
    const p = pageFor('/play/bible', O);
    expect(p.title).toBe("Can you find 30 books of the Bible? You won't find them all. · Fignda");
    expect(p.description).toMatch(/^Know your Bible\? Prove it\./);
    expect(pageFor('/play/football', O).description).toMatch(/^Call yourself a football fan\?/);
    expect(p.image).toBe('/og/bible.png');
    expect(p.canonical).toBe('/play/bible');
    expect(p.body).toContain('This is a most remarkable puzzle');
  });

  it('dailies never show the count; future days reveal nothing and are not indexed', () => {
    const p = pageFor('/d/5', O, 10);
    expect(p.title).toMatch(/^Daily #5: how many .* can you find\? · Fignda$/);
    expect(allCopy(p)).not.toMatch(/\b\d+ (books|names|words|colours|elements)\b/);
    const future = pageFor('/d/11', O, 10);
    expect(future.noindex).toBe(true);
    expect(future.title).toBe(pageFor('/', O).title);
  });

  it('private and unknown pages are not indexed', () => {
    for (const p of ['/settings', '/signin', '/p/ABCDEFGH', '/nope']) expect(pageFor(p, O).noindex, p).toBe(true);
    expect(pageFor('/play/nope', O).title).toBe(pageFor('/', O).title);
  });

  it('profiles use summary fields only', () => {
    const p = profilePage(O, { handle: 'ada', name: 'Ada Obi', current_streak: 5, dailies: 12, perfect: 3, followers: 1 });
    expect(p.title).toBe('Ada Obi (@ada) on Fignda');
    expect(p.description).toBe('@ada set the bar: 5 day streak · 12 dailies · 3 perfect. Think you can beat it?');
    expect(allCopy(p)).not.toContain('@test');
  });

  it('copy follows the brand rules: no em dashes, no exclamation marks', () => {
    const paths = ['/', '/play', '/play/bible', '/d/5', '/leaderboard', '/players', '/privacy'];
    for (const path of paths) {
      const c = allCopy(pageFor(path, O, 10));
      expect(c, path).not.toMatch(/\u2014/);
      expect(c, path).not.toMatch(/!/);
    }
    for (const [q, a] of FAQ) expect(`${q}${a}`).not.toMatch(/[\u2014!]/);
  });

  it('head tags escape user text and JSON-LD cannot break out of its script tag', () => {
    const evil = profilePage(O, { handle: 'ada', name: '"><script>alert(1)</script>', current_streak: 0, dailies: 0, perfect: 0, followers: 0 });
    const html = headTags(evil, O);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain(String.raw`\u003cscript\u003e`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) expect(() => JSON.parse(m[1]!)).not.toThrow();
  });
});

describe('sitemap and llms.txt', () => {
  it('lists main pages, every puzzle and the last 14 dailies, never profiles', () => {
    const paths = sitemapPaths(100).map((u) => u.path);
    expect(paths).toContain('/play/bible');
    expect(paths.filter((p) => /^\/d\/\d+$/.test(p))).toHaveLength(14);
    // Answers pages: the last 60 finished days, never today.
    const answers = paths.filter((p) => p.endsWith('/answers'));
    expect(answers).toHaveLength(60);
    expect(answers[0]).toBe('/d/99/answers');
    expect(answers).not.toContain('/d/100/answers');
    expect(paths.some((p) => p.startsWith('/u/'))).toBe(false);
  });

  it('llms.txt is factual and links the real pages', () => {
    const t = llmsTxt(O, 100);
    expect(t.startsWith('# Fignda')).toBe(true);
    expect(t).toContain(`${O}/play/bible`);
    expect(t).toContain('Is Fignda free?');
    expect(t).not.toMatch(/[\u2014!]/);
  });
});

describe('answers pages', () => {
  it('a past daily lists every answer and its paragraph', () => {
    const p = pageFor('/d/5/answers', O, 10);
    expect(p.title).toMatch(/^Fignda Daily #5 answers \(5 January 2026\) · Fignda$/);
    expect(p.canonical).toBe('/d/5/answers');
    expect(p.noindex).toBeUndefined();
    expect(p.body).toMatch(/<ol>(<li>[^<]+<\/li>)+<\/ol>/);
    expect(p.body).toContain('<blockquote>');
  });

  it("today's and future answers are never written out", () => {
    for (const n of [10, 11, 500]) {
      const p = pageFor(`/d/${n}/answers`, O, 10);
      expect(p.noindex).toBe(true);
      expect(p.body).not.toContain('<blockquote>');
      expect(p.title).not.toContain('answers');
    }
  });
});
