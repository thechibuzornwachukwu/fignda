import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Local = { url: string; anon: string; service: string };

// `supabase status` is slow on some machines, so the local stack's details are cached here (gitignored).
const CACHE = join(import.meta.dirname, '..', '.temp', 'test-env.json');

function fromStatus(): Local {
  let out: string;
  try {
    out = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('Local Supabase is not running. Run `npm run db:start` then `npm run db:reset`.');
  }
  const env: Record<string, string> = {};
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) env[m[1]!] = m[2]!;
  }
  const url = env.API_URL;
  const anon = env.ANON_KEY ?? env.PUBLISHABLE_KEY;
  const service = env.SERVICE_ROLE_KEY ?? env.SECRET_KEY;
  if (!url || !anon || !service) throw new Error('Could not read local Supabase keys from `supabase status`.');
  return { url, anon, service };
}

async function healthy(l: Local): Promise<boolean> {
  try {
    const r = await fetch(`${l.url}/rest/v1/games?select=id&limit=1`, {
      headers: { apikey: l.anon, Authorization: `Bearer ${l.anon}` },
      signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Reads URL and keys of the running local stack. Never points at production. */
export default async function setup() {
  let local: Local | null = null;
  if (existsSync(CACHE)) {
    const cached = JSON.parse(readFileSync(CACHE, 'utf8')) as Local;
    if (await healthy(cached)) local = cached;
  }
  if (!local) {
    local = fromStatus();
    if (!(await healthy(local))) throw new Error('Local Supabase is up but not ready. Run `npm run db:reset`.');
    mkdirSync(join(CACHE, '..'), { recursive: true });
    writeFileSync(CACHE, JSON.stringify(local));
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(local.url)) throw new Error(`Refusing to run against ${local.url}. Local only.`);
  process.env.SB_URL = local.url;
  process.env.SB_ANON = local.anon;
  process.env.SB_SERVICE = local.service;
}
