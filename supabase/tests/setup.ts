import { execSync } from 'node:child_process';

/** Read URL and keys from the running local stack. Never points at production. */
export default function setup() {
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
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error(`Refusing to run against ${url}. Local only.`);
  process.env.SB_URL = url;
  process.env.SB_ANON = anon;
  process.env.SB_SERVICE = service;
}
