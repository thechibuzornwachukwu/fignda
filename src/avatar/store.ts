// Avatar codes by handle, fetched in batches. A board with 20 rows makes one request, not 20.
// Until a code arrives (or when a player has not designed one) the starter drawn from the handle shows.

import { getSupabase } from '../lib/supabase';

const codes = new Map<string, string | null>();
const waiting = new Set<string>();
const listeners = new Set<() => void>();
let scheduled = false;

async function flush() {
  scheduled = false;
  const handles = [...waiting].slice(0, 200);
  for (const h of handles) waiting.delete(h);
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data } = await sb.from('profiles').select('handle, avatar').in('handle', handles);
    for (const h of handles) codes.set(h, null);
    for (const row of (data ?? []) as Array<{ handle: string; avatar: string | null }>) codes.set(row.handle, row.avatar);
    listeners.forEach((l) => l());
  } catch {
    /* keep the starters */
  }
  if (waiting.size && !scheduled) {
    scheduled = true;
    queueMicrotask(() => void flush());
  }
}

/** The stored code, null when the player has none, undefined while unknown (asks for it). */
export function avatarCodeOf(handle: string): string | null | undefined {
  if (codes.has(handle)) return codes.get(handle);
  if (/^[a-z0-9._]{2,20}$/.test(handle) && !waiting.has(handle)) {
    waiting.add(handle);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => void flush());
    }
  }
  return undefined;
}

export function setAvatarCode(handle: string, code: string | null): void {
  codes.set(handle, code);
  listeners.forEach((l) => l());
}

export function subscribeAvatars(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
