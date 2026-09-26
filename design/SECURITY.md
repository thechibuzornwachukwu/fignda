# Fignda security

Risks: leaked keys, faked scores, AI endpoint abuse, injected text in shared content. All items required.

## Secrets
- Client holds only the Supabase anon key. RLS protects every table.
- AI key, Supabase service role key, OG secret: Worker secrets only (`wrangler secret put`).
- `.env*` gitignored. Secret scanning in CI (`gitleaks`).

## Auth
- Supabase email OTP (6 digits, 10 min expiry, 5 tries then 15 min lock) and Google OAuth with PKCE.
- Redirect allowlist: prod domain, Pages preview domain.
- Refresh token rotation on. Sign out clears session and local cache.
- Guests can play. Guest data stays local until sign in.

## Database (RLS on, default deny)
| Table | Read | Write |
|---|---|---|
| profiles (name, handle) | all | own row |
| plays | own rows; public view exposes handle, score, time | Worker only |
| daily | all | none |
| daily_answers | service role only until day ends | none |
| games curated | all | none |
| games custom | owner, or anyone with share code | Worker only |
| shares | by code | Worker only |

- Email lives only in `auth.users`.
- Handle: unique, 2 to 20, `[a-z0-9._]`, reserved list (admin, fignda, support, root, help).
- Unique index `(user_id, day_no)` on daily plays.

## Score integrity
- Client sends a play log: ordered selections `{a, b, t}`, hint times, finish time.
- Worker replays it with the shared engine against server answers and recomputes score.
- Reject: duplicate finds, finish before start, bursts faster than 150ms per find, log over 500 events.
- Guest scores and merged guest results are `unverified` and never ranked.

## AI generation `/api/generate`
- Rate limit: 5 per hour per IP (guest), 20 per hour per user. Return 429.
- Topic: trim, max 60 chars, strip control chars, reject empty.
- Fixed server prompt. Topic inserted as quoted data, never as instructions.
- Validate JSON with zod: paragraph ≤ 900 chars, ≤ 20 words, each `[A-Za-z]{3,12}`.
- Run engine server side. Keep real hits only. Under 4 hits: friendly failure.
- Profanity filter on title, text, words.
- Cache by normalised topic 24h.

## Shared content
- Share codes: 8 char base32 from `crypto.getRandomValues`.
- Share pages and OG images render database data only, never query params.
- Escape all user text. No `dangerouslySetInnerHTML`.
- Finds on today's daily blocked server side.

## Headers (Pages `_headers`)
```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.fignda.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```
- Theme boot script as an external file (CSP).
- Worker CORS: app origins only.

## Privacy
- Collect email, name, handle. Cookieless analytics (Cloudflare Web Analytics).
- Delete account cascades profile, plays, shares.
- Privacy page before launch.

## CI
Dependabot. `npm audit --audit-level=high`. Lockfile committed.

## Must pass
- Anon client cannot read `daily_answers` or any email.
- Tampered play log rejected.
- 6th guest generate in an hour returns 429.
- Zero CSP violations on every route.
