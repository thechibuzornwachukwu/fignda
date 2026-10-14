// Builds the site and deploys it to Cloudflare Pages (lantern-row.pages.dev). Run: npm run deploy:site
// Sign in needs the game's own Supabase project: its 2 public values go in .env.production.values (gitignored).
// Until that file exists the site is built without sign in, and every player is a guest.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const env = { ...process.env };
if (existsSync('.env.production.values')) {
  for (const line of readFileSync('.env.production.values', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(VITE_[A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} else console.log('No .env.production.values: building without sign in.');

const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });
run('npx vite build');
run('npx wrangler pages deploy dist --project-name lantern-row --branch main --commit-dirty=true');
console.log('\nLive at https://lantern-row.pages.dev');
