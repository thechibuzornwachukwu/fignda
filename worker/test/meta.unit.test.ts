import { metaFor } from '../../functions/_middleware';

describe('link preview meta', () => {
  it('home and unknown paths get the default', () => {
    expect(metaFor('/').image).toBe('/og/default.png');
    expect(metaFor('/play/nope').image).toBe('/og/default.png');
    expect(metaFor('/p/ABCDEFGH').image).toBe('/og/default.png');
    expect(metaFor('/play/<script>').image).toBe('/og/default.png');
  });

  it('curated games show their count', () => {
    expect(metaFor('/play/bible')).toEqual({
      title: 'The classic · Fignda',
      description: 'Can you find 30 books of the Bible? Words hide across spaces and punctuation.',
      image: '/og/bible.png',
    });
  });

  it('dailies never show the count', () => {
    const m = metaFor('/d/5', 10);
    expect(m.title).toBe('Daily #5 · Fignda');
    expect(m.description).toMatch(/^How many .* can you find\? One try\./);
    expect(m.description).not.toMatch(/\d+ (words|names|books)/);
    expect(m.image).toMatch(/^\/og\/daily-[a-z]+\.png$/);
  });

  it('future dailies stay secret', () => {
    expect(metaFor('/d/11', 10)).toEqual(metaFor('/'));
    expect(metaFor('/d/0', 10)).toEqual(metaFor('/'));
  });
});

describe('profile preview', () => {
  it('uses only summary fields and never an email', async () => {
    const { profileMeta } = await import('../../functions/_middleware');
    const m = profileMeta({ handle: 'ada', name: 'Ada Obi', current_streak: 5, dailies: 12, perfect: 3, followers: 1 });
    expect(m).toEqual({
      title: 'Ada Obi (@ada) · Fignda',
      description: '5 day streak · 12 dailies · 3 perfect · 1 follower. Find hidden words with @ada.',
      image: '/og/default.png',
    });
    expect(JSON.stringify(m)).not.toContain('@test');
  });
});
