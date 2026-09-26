import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Sign in is available (env set). Known without loading the library. */
export const supabaseEnabled = !!(url && key);

let client: Promise<SupabaseClient | null> | null = null;

/**
 * The only Supabase client. Holds the anon key only (SECURITY.md); RLS guards every table.
 * Loaded on first use so the library is not in the landing page's critical path.
 * Resolves to null when env is not set: the app still runs, everyone plays as a guest.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseEnabled) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, key!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}
