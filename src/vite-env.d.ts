/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Public. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (publishable) key. Public by design; RLS protects every table. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Worker API base. Defaults to /api. */
  readonly VITE_API_URL?: string;
  /** "1" only in e2e builds: enables the test card harness. */
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
