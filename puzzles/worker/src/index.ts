import { createClient } from '@supabase/supabase-js';
import { makeAi, type WorkersAi } from './ai';
import { handle, pruneJobs, sendReminders, type Deps } from './app';
import { makePush } from './push';
import { makeSafety } from './safety';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGINS: string;
  /** Providers in order, comma separated: "openrouter,gemini,groq". See worker/src/ai.ts. "off" switches generation off. */
  AI_PROVIDER?: string;
  /** Optional model for the first provider. */
  AI_MODEL?: string;
  /** Workers AI binding from wrangler.toml [ai]. */
  AI?: WorkersAi;
  /** Only for AI_PROVIDER = "anthropic". */
  ANTHROPIC_API_KEY?: string;
  /** Only for AI_PROVIDER = "gemini". */
  GEMINI_API_KEY?: string;
  /** Only for AI_PROVIDER = "openrouter". */
  OPENROUTER_API_KEY?: string;
  /** Only for "groq". */
  GROQ_API_KEY?: string;
  /** Daily reminders. Unset: reminders are off. */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  /** Contact for push services: a mailto: or https: address. */
  VAPID_SUBJECT?: string;
  /** Llama Guard model on the Workers AI binding, for the safety check. See worker/src/safety.ts. */
  SAFETY_MODEL?: string;
  /** Supabase user ids with owner power, comma separated. Empty: nobody. See design/SECURITY.md. */
  OWNER_USER_IDS?: string;
};

type Ctx = { waitUntil(p: Promise<unknown>): void };

const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

function depsOf(env: Env, ctx?: Ctx): Deps {
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
      geminiKey: env.GEMINI_API_KEY,
      openrouterKey: env.OPENROUTER_API_KEY,
      groqKey: env.GROQ_API_KEY,
    }),
    origins: list(env.APP_ORIGINS),
    safety: makeSafety({
      provider: env.AI_PROVIDER,
      model: env.SAFETY_MODEL,
      workersAi: env.AI,
      geminiKey: env.GEMINI_API_KEY,
      openrouterKey: env.OPENROUTER_API_KEY,
      groqKey: env.GROQ_API_KEY,
    }),
    owners: list(env.OWNER_USER_IDS),
    waitUntil: ctx ? (p) => ctx.waitUntil(p) : undefined,
    push: makePush({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT }),
    pushKey: env.VAPID_PUBLIC_KEY ?? null,
  };
}

export default {
  fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    return handle(req, depsOf(env, ctx));
  },
  // Hourly (wrangler.toml [triggers]): the daily reminder, and old generate jobs are cleared out.
  async scheduled(_event: unknown, env: Env, ctx: Ctx): Promise<void> {
    const deps = depsOf(env);
    ctx.waitUntil(Promise.allSettled([sendReminders(deps), pruneJobs(deps)]));
  },
};
