#!/usr/bin/env node
// Blocks secrets from entering git. Runs on every commit (.githooks/pre-commit).
//
//   node scripts/check-secrets.mjs            staged changes (what the hook runs)
//   node scripts/check-secrets.mjs --all      every tracked file
//   node scripts/check-secrets.mjs --history  every commit ever made, all branches
//
// The Supabase anon key is public by design (RLS protects the data), so an `anon` JWT is allowed.
// Any other JWT role, service keys, private keys, tokens and passwords are blocked.

import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// Files that must never be committed, whatever they contain.
const BLOCKED_FILES = [
  [/(^|\/)\.env(\.[^/]*)?$/, 'env file (only .env.example may be committed)'],
  [/(^|\/)supabase\/\.(temp|branches|env)(\/|$)/, 'Supabase local state'],
  [/\.(pem|key|p12|pfx)$/i, 'private key file'],
  [/(^|\/)id_(rsa|ed25519|ecdsa)$/, 'SSH private key'],
  [/(^|\/)(credentials|service-account)[^/]*\.json$/i, 'credentials file'],
  [/(^|\/)\.dev\.vars$/, 'Cloudflare Worker secrets file'],
];
const ALLOWED_FILES = [/(^|\/)\.env\.example$/];

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.role ?? '(no role)';
  } catch {
    return null;
  }
}

// [name, regex, optional check(match) -> true when it IS a secret]
const PATTERNS = [
  ['Supabase JWT with a non-anon role (service key)', /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g, (m) => {
    const role = jwtRole(m);
    return role !== null && role !== 'anon';
  }],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{10,}/g],
  ['Private key block', /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----/g],
  ['Database URL with a password', /\bpostgres(?:ql)?:\/\/[^:\s/]+:([^@\s]+)@([^\s/:]+)/g, (m) => {
    const host = m.split('@')[1] ?? '';
    return !/^(127\.0\.0\.1|localhost)\b/.test(host);
  }],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/g],
  ['Google OAuth client secret', /\bGOCSPX-[A-Za-z0-9_-]{20,}/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['OpenAI API key', /\bsk-(proj-)?[A-Za-z0-9]{32,}/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  ['Stripe secret key', /\b(sk|rk)_live_[A-Za-z0-9]{20,}/g],
  ['Secret assigned in config', /\b(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|DB_PASSWORD|CLOUDFLARE_API_TOKEN|ANTHROPIC_API_KEY|OPENAI_API_KEY)\s*[:=]\s*["']?[^\s"'$<{][^\s"']{7,}/g],
];

function scanText(text, where, findings) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re, check] of PATTERNS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if (check && !check(m[0])) continue;
        const shown = m[0].length > 16 ? `${m[0].slice(0, 10)}…${m[0].slice(-4)}` : '…';
        findings.push(`${where}:${i + 1}  ${name}  (${shown})`);
      }
    }
  });
}

function checkName(path, findings, where = path) {
  if (ALLOWED_FILES.some((re) => re.test(path))) return;
  for (const [re, why] of BLOCKED_FILES) if (re.test(path)) findings.push(`${where}  ${why}`);
}

const mode = process.argv[2] ?? '--staged';
const findings = [];

if (mode === '--history') {
  const log = git('log', '--all', '-p', '--no-color', '--format=@@COMMIT %h %s', '--no-ext-diff');
  let commit = '';
  let file = '';
  for (const line of log.split(/\r?\n/)) {
    if (line.startsWith('@@COMMIT ')) commit = line.slice(9, 16);
    else if (line.startsWith('+++ b/')) {
      file = line.slice(6);
      checkName(file, findings, `commit ${commit}: ${file}`);
    } else if (line.startsWith('+') && !line.startsWith('+++')) scanText(line.slice(1), `commit ${commit}: ${file}`, findings);
  }
} else {
  const files =
    mode === '--all'
      ? git('ls-files', '-z').split('\0').filter(Boolean)
      : git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean);
  for (const f of files) {
    checkName(f, findings);
    if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip)$/i.test(f)) continue;
    let text;
    try {
      text = mode === '--all' ? git('show', `HEAD:${f}`) : git('show', `:${f}`);
    } catch {
      continue;
    }
    scanText(text, f, findings);
  }
}

if (findings.length) {
  console.error('\nSecret check failed. Nothing was committed.\n');
  for (const f of [...new Set(findings)]) console.error(`  ${f}`);
  console.error('\nRemove the secret (keep it in an ignored file like .env.local or a Worker secret), then try again.');
  console.error('If a real secret was ever pushed, rotate it: deleting it from git does not make it safe.\n');
  process.exit(1);
}
console.log(`Secret check passed (${mode.replace('--', '')}).`);
