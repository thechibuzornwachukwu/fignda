import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Sign in is available (env set). Known without loading the library. */
export const supabaseEnabled = !!(url && key);

let client: Promise<SupabaseClient | null> | null = null;
const readyListeners = new Set<(c: SupabaseClient) => void>();

/**
 * The only Supabase client. Holds the anon key only (SECURITY.md); RLS guards every table.
 * Loaded on first use, so guests who never sign in never download it.
 * Resolves to null when env is not set: the app still runs, everyone plays as a guest.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseEnabled) return Promise.resolve(null);
  if (!client) {
    client = import('@supabase/supabase-js').then(({ createClient }) => {
      const c = createClient(url!, key!, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      readyListeners.forEach((fn) => fn(c));
      return c;
    });
  }
  return client;
}

/** Called once the client exists, whoever loaded it. Returns an unsubscribe. */
export function onSupabaseReady(fn: (c: SupabaseClient) => void): () => void {
  readyListeners.add(fn);
  client?.then((c) => c && fn(c));
  return () => readyListeners.delete(fn);
}

/**
 * Whether this visit needs the auth client straight away: a stored session, or a sign-in link
 * landing here. Otherwise it waits until a screen asks for it.
 */
export function needsAuthNow(): boolean {
  if (!supabaseEnabled) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch {
    /* storage unavailable */
  }
  const q = new URLSearchParams(window.location.search);
  return q.has('code') || q.has('error_description') || window.location.hash.includes('access_token');
}
