import { createClient } from '@supabase/supabase-js';
import { makeAi, type WorkersAi } from './ai';
import { handle } from './app';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGINS: string;
  /** "workers-ai" (free, default) | "anthropic" (paid) | "off". */
  AI_PROVIDER?: string;
  /** Optional model override for the chosen provider. */
  AI_MODEL?: string;
  /** Workers AI binding from wrangler.toml [ai]. */
  AI?: WorkersAi;
  /** Only for AI_PROVIDER = "anthropic". */
  ANTHROPIC_API_KEY?: string;
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return handle(req, {
      db,
      ai: makeAi({
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        workersAi: env.AI,
        anthropicKey: env.ANTHROPIC_API_KEY,
      }),
      origins: env.APP_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    });
  },
};
