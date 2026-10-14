import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCopy, POOLS, type PoolKey } from '.';
import { BANNED_CLAIMS } from './claims';

const keys = Object.keys(POOLS) as PoolKey[];

describe('pick', () => {
  it.each(keys)('%s never repeats back to back', (key) => {
    const { pick } = createCopy();
    let prev = '';
    for (let i = 0; i < 500; i++) {
      const line = pick(key, { w: 'Amos', n: 3 });
      if (POOLS[key].length > 1) expect(line).not.toBe(prev);
      prev = line;
    }
  });

  it('skips forward when the random index repeats', () => {
    const { pick } = createCopy(() => 0);
    expect([pick('wrong'), pick('wrong'), pick('wrong')]).toEqual([
      POOLS.wrong[0],
      POOLS.wrong[1],
      POOLS.wrong[0],
    ]);
  });

  it('keeps memory per pool', () => {
    const { pick } = createCopy(() => 0);
    pick('wrong');
    expect(pick('already')).toBe(POOLS.already[0]);
  });

  it('fills vars and blanks missing ones', () => {
    const { pick } = createCopy(() => 0);
    expect(pick('streak', { w: 'Amos' })).toBe('Amos. On a roll.');
    expect(pick('found')).toBe('. Nice.');
  });

  it('every line follows the copy rules', () => {
    for (const k of keys)
      for (const line of POOLS[k]) {
        expect(line).not.toMatch(/—/); // em dash
        expect(line).not.toMatch(/!/);
      }
  });
});

describe('the promise', () => {
  it('no pool line claims a result', () => {
    for (const k of keys) for (const line of POOLS[k]) expect(line, k).not.toMatch(BANNED_CLAIMS);
  });

  it('no screen or component claims a result', () => {
    for (const dir of ['src/routes', 'src/components']) {
      for (const f of readdirSync(dir).filter((n) => n.endsWith('.tsx') && !n.includes('.test.'))) {
        // Comments are not read by players.
        const src = readFileSync(join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        expect(src, f).not.toMatch(BANNED_CLAIMS);
      }
    }
  });

  it('run and reminder lines talk about today, not about what would be lost', () => {
    const lines = (['remind', 'remindStreak', 'remindFriend', 'streakKeep', 'streakDay', 'streakStart', 'doneToday'] as const).flatMap((k) => POOLS[k]);
    for (const line of lines) expect(line).not.toMatch(/\b(lose|lost|losing|keep it|needs? today|do not break|don't break|miss out|last chance)\b/i);
  });
});

describe('onFound', () => {
  const base = { word: 'Amos', len: 4, foundCount: 5, total: 30, streak: 1, msSinceLast: 20000 };
  const poolOf = (line: string, n: number) =>
    keys.find((k) => POOLS[k].some((t) => t.replace('{w}', 'Amos').replace('{n}', String(n)) === line));

  it.each([
    [{ foundCount: 1 }, 'firstFind'],
    [{ foundCount: 29 }, 'lastOne'],
    [{ streak: 3 }, 'streak'],
    [{ streak: 6 }, 'streak'],
    [{ streak: 4 }, 'found'],
    [{ msSinceLast: 5999 }, 'foundQuick'],
    [{ msSinceLast: null }, 'found'],
    [{ len: 8 }, 'foundLong'],
    [{}, 'found'],
    // Priority: first find beats everything, last one beats streak.
    [{ foundCount: 1, streak: 3, len: 9 }, 'firstFind'],
    [{ foundCount: 29, streak: 3 }, 'lastOne'],
  ] as const)('%o -> %s', (over, pool) => {
    const { onFound } = createCopy();
    const ctx = { ...base, ...over };
    expect(poolOf(onFound(ctx), ctx.streak)).toBe(pool);
  });
});

describe('resultTitle', () => {
  it.each([
    [10, 10, 'titlePerfect'],
    [0, 10, 'titleZero'],
    [5, 10, 'titleGood'],
    [4, 10, 'titleLow'],
  ] as const)('%i of %i -> %s', (f, t, pool) => {
    const { resultTitle } = createCopy();
    expect(POOLS[pool]).toContain(resultTitle(f, t));
  });
});
