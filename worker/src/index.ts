import { createClient } from '@supabase/supabase-js';
import { makeAi, type WorkersAi } from './ai';
import { handle, sendReminders, type Deps } from './app';
import { makePush } from './push';

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
  /** Daily reminders. Unset: reminders are off. */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  /** Contact for push services: a mailto: or https: address. */
  VAPID_SUBJECT?: string;
};

function depsOf(env: Env): Deps {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    db,
    ai: makeAi({
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      workersAi: env.AI,
      anthropicKey: env.ANTHROPIC_API_KEY,
    }),
    origins: env.APP_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    push: makePush({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT }),
    pushKey: env.VAPID_PUBLIC_KEY ?? null,
  };
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handle(req, depsOf(env));
  },
  // Hourly (wrangler.toml [triggers]): the daily reminder.
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(sendReminders(depsOf(env)));
  },
};
