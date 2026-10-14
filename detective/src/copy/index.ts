// Every in-game feedback line. Pools live in data/copy.json. Picks by context, never repeats back to back.

import pools from '../../data/copy.json';

export type PoolKey = keyof typeof pools;
export const POOLS: Readonly<Record<PoolKey, readonly string[]>> = pools;

export type Vars = Record<string, string | number | null | undefined>;

export type FoundCtx = {
  word: string;
  len: number;
  foundCount: number;
  total: number;
  streak: number;
  msSinceLast?: number | null;
};

/** A picker with its own no-repeat memory. `random` is injectable for tests. */
export function createCopy(random: () => number = Math.random) {
  const last: Partial<Record<PoolKey, number>> = {};

  function pick(key: PoolKey, vars?: Vars): string {
    const pool = POOLS[key];
    let i = Math.floor(random() * pool.length);
    if (pool.length > 1 && i === last[key]) i = (i + 1) % pool.length;
    last[key] = i;
    return pool[i]!.replace(/\{(\w+)\}/g, (_, k: string) => {
      const v = vars?.[k];
      return v != null ? String(v) : '';
    });
  }

  /** First find, last one left, every 3rd in a row, quick (<6s), long (8+ letters), else generic. */
  function onFound(ctx: FoundCtx): string {
    const v = { w: ctx.word, n: ctx.streak };
    if (ctx.foundCount === 1) return pick('firstFind', v);
    if (ctx.total - ctx.foundCount === 1) return pick('lastOne', v);
    if (ctx.streak >= 3 && ctx.streak % 3 === 0) return pick('streak', v);
    if (ctx.msSinceLast != null && ctx.msSinceLast < 6000) return pick('foundQuick', v);
    if (ctx.len >= 8) return pick('foundLong', v);
    return pick('found', v);
  }

  /** Pick once at finish, then keep it fixed. */
  function resultTitle(found: number, total: number): string {
    if (found === total) return pick('titlePerfect');
    if (found === 0) return pick('titleZero');
    return pick(found >= total / 2 ? 'titleGood' : 'titleLow');
  }

  return { pick, onFound, resultTitle };
}

export const { pick, onFound, resultTitle } = createCopy();
