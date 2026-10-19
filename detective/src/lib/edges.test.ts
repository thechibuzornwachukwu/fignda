// @vitest-environment jsdom
// The browser's edges: storage that is corrupt, missing or full, rows from an account that lie, addresses
// that try to leave the site, and names that do not fit.

import { parsePartner } from '../engine/partners';
import { applyChapterProgress, loadChapterStars, recordChapterStars } from './chapterStore';
import { checkProfile, safeNext, withTail } from './handle';
import { playNext } from './playNext';
import { hasTabBar, isStep } from './routes';

const KEY = 'lantern-chapters';
const ALL = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
const CASES = ['the-long-spoon', 'the-open-box', 'the-early-bus', 'the-year-that-is-missing', 'the-light-in-the-hall', 'the-2-signs', 'the-other-spoon', 'who-carries-the-cards'];

beforeEach(() => localStorage.clear());

describe('progress kept in the browser', () => {
  it('corrupt, the wrong shape, or stars out of range: read as nothing, never a crash', () => {
    for (const raw of ['{', 'null', '[]', '"x"', '7', '{"the-long-spoon":[3,3]}', '{"the-long-spoon":{"1":4,"2":0,"3":"3","4":null}}']) {
      localStorage.setItem(KEY, raw);
      expect(loadChapterStars('the-long-spoon')).toEqual({});
      expect(() => playNext()).not.toThrow();
    }
  });

  it('stars only go up', () => {
    expect(recordChapterStars('the-long-spoon', 1, 2)).toBe(2);
    expect(recordChapterStars('the-long-spoon', 1, 1)).toBe(2);
    expect(recordChapterStars('the-long-spoon', 1, 3)).toBe(3);
    expect(loadChapterStars('the-long-spoon')).toEqual({ 1: 3 });
  });

  it('storage that throws: nothing kept, nothing broken', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => recordChapterStars('the-long-spoon', 1, 3)).not.toThrow();
    expect(loadChapterStars('the-long-spoon')).toEqual({});
    expect(playNext()).toMatchObject({ to: '/case/the-long-spoon', kind: 'case' });
    set.mockRestore();
    get.mockRestore();
  });

  it('rows from an account: bad ids, steps and stars are dropped, and nothing goes down', () => {
    recordChapterStars('the-long-spoon', 1, 3);
    const rows = [
      { chapter: 'the-long-spoon', step: 1, stars: 1 },
      { chapter: '__proto__', step: 1, stars: 3 },
      { chapter: 'The-Long-Spoon', step: 2, stars: 3 },
      { chapter: 'the-long-spoon', step: 0, stars: 3 },
      { chapter: 'the-long-spoon', step: 13, stars: 3 },
      { chapter: 'the-long-spoon', step: 2.5, stars: 3 },
      { chapter: 'the-long-spoon', step: 2, stars: 4 },
      { chapter: 7, step: 2, stars: 3 },
    ];
    expect(applyChapterProgress(rows)).toBe(false);
    expect(loadChapterStars('the-long-spoon')).toEqual({ 1: 3 });
    expect(applyChapterProgress([{ chapter: 'the-long-spoon', step: '2', stars: '2' }])).toBe(true);
    expect(loadChapterStars('the-long-spoon')).toEqual({ 1: 3, 2: 2 });
  });
});

describe('the Play button', () => {
  it('new, half way, and every case closed', () => {
    expect(playNext()).toEqual({ to: '/case/the-long-spoon', name: 'Open your case', kind: 'case' });
    localStorage.setItem(KEY, JSON.stringify({ 'the-long-spoon': { 1: 3, 2: 1 } }));
    expect(playNext()).toMatchObject({ to: '/case/the-long-spoon/3', name: 'Carry on your case' });
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(CASES.map((c) => [c, ALL]))));
    expect(playNext()).toMatchObject({ to: '/cases', kind: 'done' });
  });

  it('a case kept that is not written is ignored', () => {
    localStorage.setItem(KEY, JSON.stringify({ 'no-such-case': ALL }));
    expect(playNext()).toMatchObject({ to: '/case/the-long-spoon' });
  });
});

describe('the pet', () => {
  it('anything that is not one of the 4 is the cat', () => {
    for (const raw of [null, undefined, '', 'Cat', 'partner', '__proto__', 7, {}]) expect(parsePartner(raw)).toBe('cat');
    expect(parsePartner('robot')).toBe('robot');
  });
});

describe('where sign in may send a player', () => {
  it('only paths on this site', () => {
    for (const bad of [null, undefined, '', 'cases', '//evil.test', '/\\evil.test', 'https://evil.test', 'javascript:alert(1)']) expect(safeNext(bad)).toBe('/cases');
    expect(safeNext('/case/the-long-spoon/3')).toBe('/case/the-long-spoon/3');
  });
});

describe('names and handles', () => {
  it('trims, refuses empty and long, and keeps the handle alphabet', () => {
    expect(checkProfile('  Ada   Obi ', '@Ada_1')).toEqual({ name: 'Ada Obi', handle: 'ada_1' });
    expect(checkProfile('   ', 'ada')).toHaveProperty('error');
    expect(checkProfile('a'.repeat(41), 'ada')).toHaveProperty('error');
    for (const h of ['a', 'a'.repeat(21), 'ada!', 'ada obi', 'adá', 'lanternrow', 'admin']) expect(checkProfile('Ada', h)).toHaveProperty('error');
  });

  it('a tail keeps any handle inside 20, and an empty one still gets a base', () => {
    for (const h of ['', '!!!', 'a'.repeat(40), 'Ada.Obi']) {
      const t = withTail(h, () => 0.99);
      expect(t.length).toBeLessThanOrEqual(20);
      expect(checkProfile('Ada', t)).not.toHaveProperty('error');
    }
  });
});

describe('which pages are a step', () => {
  it('a step has the whole screen; anything else has the dock but the landing page', () => {
    for (const p of ['/case/the-long-spoon/1', '/case/the-long-spoon/12/', '/cold/the-long-spoon/3']) {
      expect(isStep(p)).toBe(true);
      expect(hasTabBar(p)).toBe(false);
    }
    for (const p of ['/case/the-long-spoon', '/case/the-long-spoon/x', '/case//1', '/interlude/the-bookmark', '/cases', '/ranks']) expect(isStep(p)).toBe(false);
    expect(hasTabBar('/')).toBe(false);
    expect(hasTabBar('/cases')).toBe(true);
    expect(hasTabBar('/case/the-long-spoon')).toBe(true);
  });
});
