// @vitest-environment jsdom
// Behaviour parity with the handoff reference (design/reference/*.js).
// Skipped when the design folder is not present.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { games } from '../games/catalog';
import { createCopy, type FoundCtx } from '../copy';
import { answersFrom, puzzleCards, resultCard, type Ratio } from './cards';
import { check, isClose } from './check';
import { buildHiddenWords } from './hiddenWords';
import { dayNo } from './daily';
import { score } from './score';

const REF = join(__dirname, '..', '..', 'design', 'reference');
const has = existsSync(join(REF, 'engine.js'));

type AnyFn = (...args: never[]) => unknown;
type RefEngine = Record<'buildHiddenWords' | 'check' | 'score' | 'dayNo', AnyFn>;
type Ref = {
  engine: Record<string, (...a: unknown[]) => unknown>;
  cards: Record<string, (...a: unknown[]) => unknown>;
  copy: Record<string, (...a: unknown[]) => unknown>;
};

async function loadRef(): Promise<Ref> {
  const url = pathToFileURL(join(REF, 'engine.js')).href;
  const engine = (await import(/* @vite-ignore */ url)) as RefEngine & Ref['engine'];
  const w = window as unknown as { FigndaCards: Ref['cards']; FigndaCopy: Ref['copy'] };
  // The reference cards/copy are browser IIFEs that attach to window.
  new Function(readFileSync(join(REF, 'cards.js'), 'utf8'))();
  new Function(readFileSync(join(REF, 'copy.js'), 'utf8'))();
  return { engine, cards: w.FigndaCards, copy: w.FigndaCopy };
}

const ratios: Ratio[] = ['1:1', '4:5', '9:16'];

/** Seeded PRNG so both implementations see the same random stream. */
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe.skipIf(!has)('parity with design/reference', () => {
  let ref: Ref;
  beforeAll(async () => {
    ref = await loadRef();
  });

  it.each(games.map((g) => [g.id, g] as const))('buildHiddenWords %s', (_, g) => {
    const mine = buildHiddenWords(g);
    const theirs = ref.engine.buildHiddenWords!(g) as typeof mine;
    expect(mine.S).toBe(theirs.S);
    expect(mine.answers).toEqual(theirs.answers);
    expect(mine.difficulty).toBe(theirs.difficulty);
    expect(mine.chars).toEqual(theirs.chars);
  });

  it('check over every 3..12 letter window of every game', () => {
    for (const g of games) {
      const p = buildHiddenWords(g);
      const foundSet = new Set(p.answers.filter((_, i) => i % 3 === 0).map((a) => a.key));
      const foundObj = Object.fromEntries([...foundSet].map((k) => [k, true]));
      for (let a = 0; a < p.S.length; a += 3)
        for (let len = 1; len <= 12; len++) {
          const b = Math.min(p.S.length - 1, a + len - 1);
          const mine = check(p, b, a, foundSet);
          const theirs = ref.engine.check!(p, b, a, foundObj) as typeof mine;
          expect(mine).toEqual(theirs);
        }
    }
  });

  it('isClose matches on sampled selections', () => {
    for (const g of games) {
      const p = buildHiddenWords(g);
      const keys = p.answers.map((a) => a.key);
      for (let a = 0; a + 3 < p.S.length; a += 2)
        for (const len of [3, 4, 5, 6, 7, 8]) {
          const sel = p.S.slice(a, a + len);
          expect(isClose(sel, keys)).toBe(ref.copy.isClose!(sel, keys));
        }
    }
  });

  it('score and dayNo', () => {
    for (const found of [0, 3, 10])
      for (const hints of [0, 2])
        for (const misses of [0, 5])
          for (const secs of [0, 200, 900]) {
            const s = { found, total: 10, hints, misses, secs };
            expect(score(s)).toBe(ref.engine.score!(s));
          }
    for (const t of [Date.UTC(2026, 0, 1), Date.UTC(2026, 5, 30, 23), Date.UTC(2027, 1, 3)])
      expect(dayNo(new Date(t))).toBe(ref.engine.dayNo!(new Date(t)));
  });

  describe('puzzleCards', () => {
    const variants = ratios.flatMap((ratio) =>
      (['excerpt', 'full'] as const).flatMap((mode) =>
        [false, true].flatMap((show) => [false, true].map((hideCount) => ({ ratio, mode, show, hideCount }))),
      ),
    );

    it.each(games.map((g) => [g.id, g] as const))('%s, every ratio/mode/show/daily', (_, g) => {
      const keys = buildHiddenWords(g).answers.map((a) => a.key);
      const answers = answersFrom(g.text, keys).map((a, i) => ({ ...a, found: i % 2 === 0, hinted: i % 5 === 0 }));
      for (const v of variants) {
        const o = { ...v, text: g.text, answers, secs: 125, noun: g.noun, name: 'Ada Obi', kicker: 'Fignda', date: 'Sep 25' };
        const mine = puzzleCards(o);
        const theirs = ref.cards.puzzleCards!(o) as Array<Record<string, unknown> & { segs: Array<{ t: string; bg: string; ring: string }> }>;
        expect(mine.length).toBe(theirs.length);
        mine.forEach((m, i) => {
          const t = theirs[i]!;
          expect({ ptitle: m.ptitle, pline: m.pline, pline2: m.pline2, date: m.date, kicker: m.kicker, showTitle: m.showTitle }).toEqual({
            ptitle: t.ptitle,
            pline: t.pline,
            pline2: t.pline2,
            date: t.date,
            kicker: t.kicker,
            showTitle: t.showTitle,
          });
          const theirSegs = t.segs.map((s) => ({
            t: s.t,
            state: s.bg === 'transparent' ? 0 : s.ring === 'none' ? 1 : 2,
          }));
          expect(m.segs).toEqual(theirSegs);
        });
      }
    });
  });

  it('resultCard', () => {
    for (const g of games) {
      const keys = buildHiddenWords(g).answers.map((a) => a.key);
      for (const [f, h] of [
        [0, 0],
        [2, 3],
        [1, 0],
      ] as const) {
        const answers = answersFrom(g.text, keys).map((a, i) => ({ ...a, found: f === 1 || i % (f + 1) === 0 ? f > 0 : false, hinted: h > 0 && i % h === 0 }));
        for (const ratio of ratios)
          for (const hideCount of [false, true]) {
            const o = { ratio, answers, secs: 333, hideCount, title: 'Solid finding.', name: f ? 'Ada' : undefined };
            const mine = resultCard(o);
            const t = ref.cards.resultCard!(o) as Record<string, unknown> & { cells: Array<{ w: string; bg: string }> };
            expect({ score: mine.score, badge: mine.badge, found: mine.found, time: mine.time, hints: mine.hints, cta: mine.cta, name: mine.name, handle: mine.handle }).toEqual({
              score: t.score, badge: t.badge, found: t.found, time: t.time, hints: t.hints, cta: t.cta, name: t.name, handle: t.handle,
            });
            expect(mine.cells.map((c) => c.width + 'px')).toEqual(t.cells.map((c) => c.w));
            expect(mine.cells.map((c) => c.kind)).toEqual(
              t.cells.map((c) => (c.bg === 'var(--line-3)' ? 'missed' : c.bg === 'transparent' ? 'hint' : 'found')),
            );
          }
      }
    }
  });

  it('copy picks the same lines from the same random stream', () => {
    const ctxs: FoundCtx[] = [];
    for (let i = 0; i < 400; i++)
      ctxs.push({ word: 'Amos', len: 3 + (i % 8), foundCount: 1 + (i % 12), total: 12, streak: i % 7, msSinceLast: i % 4 ? 3000 * (i % 4) : null });

    const realRandom = Math.random;
    try {
      Math.random = mulberry(42);
      const theirs = ctxs.map((c) => ref.copy.onFound!(c));
      const theirTitles = [0, 3, 6, 12].map((f) => ref.copy.resultTitle!(f, 12));

      const mine = createCopy(mulberry(42));
      expect(ctxs.map((c) => mine.onFound(c))).toEqual(theirs);
      expect([0, 3, 6, 12].map((f) => mine.resultTitle(f, 12))).toEqual(theirTitles);
    } finally {
      Math.random = realRandom;
    }
  });
});
