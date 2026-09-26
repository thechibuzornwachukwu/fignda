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
