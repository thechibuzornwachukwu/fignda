// Who is on Gazecraft right now: one Supabase Realtime presence channel the whole site shares. A signed in player
// is counted while a tab is open; a guest only listens. Presence says a handle and a name, nothing else, and is gone the
// moment the tab closes. E2E builds have no realtime: nobody is online there.

import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { getSupabase } from './supabase';

export type OnlinePlayer = { handle: string; name: string };

/** The players online now by handle, the viewer left out. */
export function useOnline(): ReadonlyMap<string, OnlinePlayer> {
  const auth = useAuth();
  const handle = auth.profile?.handle;
  const name = auth.profile?.name;
  const id = auth.profile?.id;
  const [online, setOnline] = useState<ReadonlyMap<string, OnlinePlayer>>(new Map());

  useEffect(() => {
    if (import.meta.env.VITE_E2E === '1') return;
    let alive = true;
    let leave = () => {};
    void getSupabase().then((sb) => {
      if (!sb || !alive) return;
      const ch = sb.channel('online', { config: { presence: { key: id ?? `guest-${Math.random().toString(36).slice(2)}` } } });
      ch.on('presence', { event: 'sync' }, () => {
        const now = new Map<string, OnlinePlayer>();
        for (const p of Object.values(ch.presenceState<{ handle?: string; name?: string }>()).flat()) {
          if (typeof p.handle !== 'string' || !/^[a-z0-9._]{2,20}$/.test(p.handle) || p.handle === handle) continue;
          now.set(p.handle, { handle: p.handle, name: typeof p.name === 'string' ? p.name.slice(0, 40) : '' });
        }
        if (alive) setOnline(now);
      }).subscribe((status) => {
        if (status === 'SUBSCRIBED' && handle) void ch.track({ handle, name });
      });
      leave = () => void sb.removeChannel(ch);
    });
    return () => {
      alive = false;
      leave();
    };
  }, [id, handle, name]);

  return online;
}
