// Builds the site against production Supabase and deploys it to Cloudflare Pages (fignda.pages.dev).
// Reads the two public values from .env.production.values (gitignored). Run: npm run deploy:site
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const env = { ...process.env };
for (const line of readFileSync('.env.production.values', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^(VITE_[A-Z_]+)=(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}
if (!env.VITE_SUPABASE_URL?.startsWith('https://')) throw new Error('VITE_SUPABASE_URL missing in .env.production.values');

const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });
run('npx vite build');
run('npx wrangler pages deploy dist --project-name fignda --branch main --commit-dirty=true');
console.log('\nLive at https://fignda.pages.dev');
