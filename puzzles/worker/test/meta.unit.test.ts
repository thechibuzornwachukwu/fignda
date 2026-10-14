import { headTags } from '../../functions/_middleware';
import { BANNED_CLAIMS } from '../../src/copy/claims';
import { FAQ, llmsTxt, pageFor, profilePage, sitemapPaths, type Page } from '../../src/seo/pages';

const O = 'https://fignda.pages.dev';
const allCopy = (p: Page) => [p.title, p.description, p.imageAlt, p.body, JSON.stringify(p.jsonLd)].join('\n');

describe('page metadata', () => {
  it('home leads with the hook and carries game, site and FAQ data', () => {
    const p = pageFor('/', O);
    expect(p.title).toBe("Think you read carefully? You don't. · Gazecraft");
    expect(p.jsonLd.map((o) => (o as { '@type': string })['@type'])).toEqual(['VideoGame', 'WebSite', 'FAQPage']);
    expect(p.body).toContain('Pat omitted');
    // No single topic leads: general knowledge comes before the Bible puzzles.
    expect(p.body.indexOf('/play/general')).toBeLessThan(p.body.indexOf('/play/bible'));
  });

  it('a puzzle page asks the question, dares its own crowd and ships its paragraph as text', () => {
    const p = pageFor('/play/bible', O);
    expect(p.title).toBe("Can you find 30 books of the Bible? You won't find them all. · Gazecraft");
    expect(p.description).toMatch(/^Know your Bible\? Prove it\./);
    expect(pageFor('/play/football', O).description).toMatch(/^Call yourself a football fan\?/);
    expect(p.image).toBe('/og/bible.png');
    expect(p.canonical).toBe('/play/bible');
    expect(p.body).toContain('This is a most remarkable puzzle');
  });

  it('a written case is not a page here: its address is not indexed', () => {
    expect(pageFor('/case/the-long-spoon', O).noindex).toBe(true);
  });

  it('there is no daily: an old link to one, or to its answers, is the cases and is not indexed', () => {
    for (const path of ['/d/5', '/d/5/answers', '/d/99999']) expect(pageFor(path, O), path).toMatchObject({ canonical: '/play', noindex: true });
    expect(allCopy(pageFor('/', O))).not.toMatch(/\bdaily\b|\bdailies\b/i);
    expect(allCopy(pageFor('/play', O))).not.toMatch(/\bdaily\b|\bdailies\b/i);
    expect(allCopy(pageFor('/leaderboard', O))).not.toMatch(/\bdaily\b|\bdailies\b/i);
    expect(FAQ.flat().join(' ')).not.toMatch(/\bdaily\b|\bdailies\b/i);
  });

  it('private and unknown pages are not indexed', () => {
    for (const p of ['/settings', '/signin', '/p/ABCDEFGH', '/nope']) expect(pageFor(p, O).noindex, p).toBe(true);
    expect(pageFor('/play/nope', O).title).toBe(pageFor('/', O).title);
  });

  it('profiles use summary fields only', () => {
    const p = profilePage(O, { handle: 'ada', name: 'Ada Obi', current_streak: 5, dailies: 12, perfect: 3, followers: 1 });
    expect(p.title).toBe('Ada Obi (@ada) on Gazecraft');
    expect(p.description).toBe('@ada set the bar: 5 day run · 3 perfect. Think you can beat it?');
    expect(allCopy(p)).not.toContain('@test');
  });

  it('copy follows the brand rules: no em dashes, no exclamation marks', () => {
    const paths = ['/', '/play', '/play/bible', '/leaderboard', '/players', '/privacy'];
    for (const path of paths) {
      const c = allCopy(pageFor(path, O));
      expect(c, path).not.toMatch(/\u2014/);
      expect(c, path).not.toMatch(/!/);
    }
    for (const [q, a] of FAQ) expect(`${q}${a}`).not.toMatch(/[\u2014!]/);
  });

  it('the home description carries the promise, and no public page claims a result', () => {
    expect(pageFor('/', O).description).toContain('Slow down. Look closer.');
    expect(pageFor('/', O).description.length).toBeLessThanOrEqual(160);
    for (const path of ['/', '/play', '/play/general', '/play/science', '/leaderboard', '/players', '/privacy']) {
      const p = pageFor(path, O);
      // Puzzle paragraphs are the game, not a claim about it.
      expect([p.title, p.description, p.imageAlt, JSON.stringify(p.jsonLd)].join(' '), path).not.toMatch(BANNED_CLAIMS);
    }
    expect(FAQ.flat().join(' ')).not.toMatch(BANNED_CLAIMS);
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
  it('lists main pages and every puzzle, never a daily and never profiles', () => {
    const paths = sitemapPaths().map((u) => u.path);
    expect(paths).toContain('/play/bible');
    expect(paths.some((p) => p.startsWith('/case/'))).toBe(false);
    expect(paths.filter((p) => p.startsWith('/d/'))).toEqual([]);
    expect(paths.some((p) => p.startsWith('/u/'))).toBe(false);
  });

  it('llms.txt is factual and links the real pages', () => {
    const t = llmsTxt(O);
    expect(t.startsWith('# Gazecraft')).toBe(true);
    expect(t).toContain(`${O}/play/bible`);
    expect(t).toContain('Is Gazecraft free?');
    expect(t).not.toContain('/case/');
    expect(t).not.toMatch(/\bdaily\b|\bdailies\b/i);
    expect(t).not.toMatch(/[\u2014!]/);
  });
});

