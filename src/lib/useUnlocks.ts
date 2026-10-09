import { useEffect, useMemo, useState } from 'react';
import { fetchOwnPlays } from './api';
import { useAuth } from './auth';
import { loadFinished } from './shelves';
import { storage } from './storage';
import { FEATURES, UNLOCKS_KEY, countOf, readKept, sizeOf, unlockedList, unlocks, type Feature, type Unlocks } from './unlocks';

/** Mark something as shown for good: a direct link was used, or the rule was met. */
export function keepUnlocked(features: readonly Feature[]): void {
  const cur = readKept(storage.getJSON<unknown>(UNLOCKS_KEY));
  const next = FEATURES.filter((f) => cur.includes(f) || features.includes(f));
  if (next.length !== cur.length) storage.setJSON(UNLOCKS_KEY, next);
}

/**
 * What this player has unlocked. `dailies` is the count `useStreak` already holds.
 * Signed in, their stored plays are read once, and only while something is still locked,
 * so a returning player on a new device sees everything they had.
 */
export function useUnlocks(dailies: number): Unlocks {
  const auth = useAuth();
  const signedIn = !!auth.profile;
  const [server, setServer] = useState<{ plays: number; verified: number } | null>(null);
  const d = countOf(dailies);

  const local = useMemo(() => {
    const games = d + sizeOf(loadFinished());
    return unlocks({ finished: games, plays: games, dailies: d, verified: 0 }, storage.getJSON<unknown>(UNLOCKS_KEY));
  }, [d]);
  const complete = FEATURES.every((f) => local[f]);

  useEffect(() => {
    if (!signedIn || complete) return;
    let alive = true;
    fetchOwnPlays()
      .then((p) => {
        if (!alive || !Array.isArray(p)) return;
        setServer({ plays: p.length, verified: p.filter((r) => r?.verified !== false).length });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [signedIn, complete]);

  const all = useMemo(() => {
    if (!signedIn || !server) return local;
    const games = Math.max(d + sizeOf(loadFinished()), server.plays);
    return unlocks({ finished: games, plays: games, dailies: d, verified: server.verified }, unlockedList(local));
  }, [local, server, signedIn, d]);

  const list = unlockedList(all).join(',');
  useEffect(() => {
    if (list) keepUnlocked(list.split(',') as Feature[]);
  }, [list]);

  return all;
}
