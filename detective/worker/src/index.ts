import { createClient } from '@supabase/supabase-js';
import { handle, type Deps } from './app';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGINS: string;
};

const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

function depsOf(env: Env): Deps {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return { db, origins: list(env.APP_ORIGINS) };
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handle(req, depsOf(env));
  },
};
