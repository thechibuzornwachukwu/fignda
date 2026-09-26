import { createCopy, POOLS, type PoolKey } from '.';

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
