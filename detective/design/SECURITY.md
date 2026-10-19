# Lantern Row security

Risks: leaked keys, faked scores, injected text. All items required.

## Secrets
- Client holds only the Supabase anon key.
- Supabase service role key: a Worker secret only (`wrangler secret put`).
- `.env*` gitignored.

## Auth
- Supabase email OTP (6 digits, 10 min expiry) and Google OAuth with PKCE, once set up.
- Redirect allowlist: prod domain, Pages preview domain.
- Refresh token rotation on.
- `safeNext` sends a player only to a path on this site: never `//host`, `/\host` or a full URL.
- With sign in set up, a guest plays 2 steps, then is asked to sign in.

## Database (1 migration, RLS on, default deny)
| Table | Read | Write |
|---|---|---|
| profiles (name, handle) | all | own row, name and handle only |
| chapter_plays (a step of a case: best stars and score) | own rows, through `my_chapter_progress()` only; added up for everybody through `chapter_board()` | Worker only, through `record_step()` |
| rate_limits | none | Worker only, through `hit_rate_limit()` |

- Email lives only in `auth.users`.
- Handle: unique, 2 to 20, `[a-z0-9._]`, reserved list (admin, lanternrow, detective, support, root, help).
- `delete_account()` removes the caller's auth user; the profile and plays go with it.

## Score integrity
- `POST /api/plays` only, signed in only, 120 per hour per player.
- The client sends `{ game: { type: "case", id, step, named?, picked? }, log: { events, hints, finish } }`. zod, strict: an extra field, another type, a step outside 1 to 12 or an id outside `[a-z0-9-]{2,40}` is 400.
- The Worker is built with the chapters in `design/stories`, makes the step's puzzle with the shared engine (`stepPuzzle`), replays the log against it and works out the stars and the score itself.
- Reject: duplicate finds, finish before start, bursts faster than 150ms per find, a log over 500 events.
- The line-up has no board: the client sends the suspects it named, in order, and the Worker checks the list could have been played (suspects of that chapter, none twice, the culprit last or the tries used up).
- A step answered by picking (the accounts, a claim) sends its picks, and the Worker counts them with the same rule as the client.
- `chapter_board(chapter)` returns handles, names and totals.
- A guest's steps stay in the browser and are never moved to an account: they were never checked.

## Browser storage
- Every key starts `lantern-`.
- Rows from the account are checked before they are kept: id, step 1 to 12, stars 1 to 3.

## Shared content
- Escape all user text.

## Headers (Pages `_headers`)
```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```
- Theme boot script as an external file (CSP).
- Worker CORS: app origins only, and a browser from any other origin is refused with 403.

## Privacy
- Collect email, name, handle.
- Delete account cascades profile and plays.

## Must pass
- Anon client cannot read any email or anyone's `chapter_plays` rows.
- A tampered play log is rejected; a guest or a bad token gets 401.
- A foreign origin gets 403, preflight or not.
- Zero CSP violations on every route.
