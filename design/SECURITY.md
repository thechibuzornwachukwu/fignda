# Gazecraft security

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
| profile_private (look) | own row | own row; `feminine`, `masculine`, `mixed` or null |
| plays | own rows; public view exposes handle, score, time | Worker only |
| daily | all | none |
| daily_answers | service role only until day ends | none |
| games curated | all | none |
| games custom | owner, or anyone with share code | Worker only |
| shares | by code | Worker only |
| room_plays, room_finds | through `together_board()` only | Worker only |
| push_subs | own rows | own rows; endpoint must be a known push service |
| friend_streaks, streak_links, game_invites, puzzle_ratings | through functions only | through functions only |
| notifications | own, through `my_notifications()` | database triggers only; a client can only mark its own read |
| badges | all, through `badges_of()` | database trigger on verified plays only |
| puzzle_reports | none | Worker only, through `report_puzzle()` |
| generate_jobs | none; the Worker hands out a job's state by its id | Worker only |
| daily_candidates (view) | service role only | none |
| puzzle_counts | none; the owner reads totals through `sponsor_report()` | Worker only, through `count_event()` |

- Email lives only in `auth.users`.
- Handle: unique, 2 to 20, `[a-z0-9._]`, reserved list (admin, gazecraft, fignda, support, root, help).
- Unique index `(user_id, day_no)` on daily plays.

## Score integrity
- Client sends a play log: ordered selections `{a, b, t}`, hint times, finish time.
- Worker replays it with the shared engine against server answers and recomputes score.
- Reject: duplicate finds, finish before start, bursts faster than 150ms per find, log over 500 events.
- Guest scores and merged guest results are `unverified` and never ranked.
- The client logs real picks only. A word picked twice is not sent, so an honest play is never refused for it.
- Room plays: each player's own log is replayed and only the words in it are stored, with the time of each. The start is worked out from the server clock. A word two players both found is credited once, to the earlier find, when the board is read. Room plays never write to `plays`.
- Word stats for today's daily are returned only to players who have a play for today.
- Clean read (every word, no wrong picks, no hints) is worked out by the same replay and stored on the play. It adds nothing to the score. A room play is never one. On today's daily it is masked in public, like the total, since it would give the count away.

## AI generation `/api/generate`
- Rate limit: 5 per hour per IP (guest), 20 per hour per user. Return 429.
- Topic: trim, max 60 chars, strip control chars, reject empty.
- Fixed server prompt. Topic inserted as quoted data, never as instructions.
- Validate JSON with zod: paragraph ≤ 900 chars, ≤ 20 words, each `[A-Za-z]{3,12}`.
- Run engine server side. Keep real hits only. Under 4 hits: friendly failure.
- Profanity filter on title, text, words.
- Cache by normalised topic 24h. A hidden puzzle is never handed out from the cache.
- Background making (`"background": true`): the POST writes a `generate_jobs` row and answers at once. `GET /api/generate/:id/run` does the slow work as an ordinary long request; `GET /api/generate/:id` reads the state. A Worker only gets about 30 seconds after its answer (`waitUntil`), far less than a puzzle takes, so the work never hangs off the POST.
- One runner per job: the claim is one SQL statement. The runner renews it every 20 seconds; a claim not renewed for 60 seconds is stale and the next run may take the job. 3 runners at most, 15 minutes at most, then the job fails.
- One waiting job per player (user id, or address plus a random key the browser keeps). A second ask returns the first job and is not counted.
- A signed in player's job answers only to them. A guest's job answers to its id, an unguessable uuid. The answer holds the state, the puzzle code or a plain error code, and nothing else.
- A failed attempt gives a guest the request back, once. So that failures cannot be farmed for free model calls, every guest ask is also counted on a second limit of 15 per hour per IP that is never handed back. A puzzle the safety check refuses stays counted.
- `/run`: 60 per hour per IP.

## Safety check (`worker/src/safety.ts`)
- Runs on every player-made and machine-made puzzle before it gets a link: the word filter over title, noun, paragraph and every hidden word, then Llama Guard (`SAFETY_MODEL`) on the Workers AI binding, then the `AI_PROVIDER` list with a fixed prompt. The puzzle reaches a model as quoted data, never as instructions.
- The result is stored on the puzzle: `passed`, or `unchecked` when no model could be reached. A fail returns `not_allowed` and saves nothing.
- A link fails open: an `unchecked` puzzle still opens, since the word filter ran and reports are the net. A daily candidate fails closed: `passed` only.
- Clients cannot write the state. RLS gives them no write on `games`.

## Reports and owner power
- `POST /api/puzzles/:code/report`: signed in, 20 per hour, one per player per puzzle, never your own, player-made and machine-made puzzles only.
- The third report from different players hides the puzzle in the same transaction as the count. The reporter is never told whether theirs was the third.
- A hidden puzzle does not open by link for anyone but its maker, and is out of the daily queue. Any report, ever, keeps a puzzle out of the daily queue.
- Owner power is a list of Supabase user ids in the Worker var `OWNER_USER_IDS` (`worker/wrangler.toml`), empty by default. The proof is the verified session token; the ids are not secrets. There is no owner flag in the database and nothing a client can set.
- `/api/owner/*` (list hidden, restore, remove) answers 404 to everyone else, the same as a path that does not exist.
- Restore keeps the old reports but they stop counting toward hiding it again. Remove deletes the puzzle with its plays, thumbs and reports.
- Daily candidates (`daily_candidates` view, service role only): has a maker, safety passed, not hidden, never reported, 20 different verified players other than the maker, at least 80% "Good one".

## Play counts and the sponsor report
- `POST /api/counts` with `{ "game": id, "kind": "start" | "end" | "full" | "share" }`: guests too, 240 per hour per IP. It adds 1 to a count for that puzzle, that UTC day and that kind. No user id, address or time of day is stored, and a session token is not read. An unknown puzzle is 404, an unknown kind is 400, and neither counts anything. `POST /api/shares` is the same call for a share, kept for pages loaded before the first existed.
- These are counts from the browser, not replayed plays. Anyone can push one up, 240 an hour per address. They are numbers for a report and never a score, a rank, a board or a reward.
- `sponsor_report()` returns counts per puzzle and nothing else: no handle, no user id, no row per play. Service role only. Nothing in the Worker or the client calls it; the owner runs it with `npm run sponsor:report`.

## Push and invites
- VAPID private key is a Worker secret. Pushes carry no payload; the service worker asks `/api/push/line` for the line.
- Push endpoints are allowlisted (FCM, Mozilla, Apple, Windows) in the database and again in the Worker before any call.
- `/api/push/line` answers an unknown endpoint with the plain line, so it never says whether an endpoint is registered. 60 per hour per IP.
- One reminder per browser per day, claimed in one statement. Gone endpoints (404, 410) are deleted.
- Room invites: only to players you follow, 30 per hour. A push only when they follow you back.
- Nudges: only between streak friends, only after you played, one per friend per day.
- Signing out removes this browser's reminder.

## Player-made puzzles `/api/puzzles`
- Signed in only, 10 per hour. zod: title and noun 2 to 40, text 60 to 900, 4 to 20 words of `[A-Za-z]{3,12}`. Control characters stripped.
- The engine runs server side with the same rule as the maker screen. Every word must hide across a word boundary, or 422 with the words that failed.
- Profanity filter on title, noun, text, words. Opened by share code only; there is no public list.

## Shared content
- Share codes: 8 char base32 from `crypto.getRandomValues`.
- Share pages and OG images render database data only, never query params.
- Escape all user text. No `dangerouslySetInnerHTML`.
- Finds on today's daily blocked server side.

## Headers (Pages `_headers`)
```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.gazecraft.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```
- Theme boot script as an external file (CSP).
- Worker CORS: app origins only. `Retry-After` is the one exposed header.

## Privacy
- Collect email, name, handle. Cookieless analytics (Cloudflare Web Analytics).
- The look ("Who are we dressing?") is optional and personal. It is kept off `profiles`, which everyone can read, in `profile_private`. No view or function reads it. It orders choices in the avatar editor and nothing else: never ranking, matching or ads. A guest's answer stays in the browser.
- Delete account cascades profile, plays, shares.
- Privacy page before launch.

## CI
Dependabot. `npm audit --audit-level=high`. Lockfile committed.

## Must pass
- Anon client cannot read `daily_answers` or any email.
- Nobody but its owner can read or change a player's look, and no public view carries it.
- Tampered play log rejected.
- A room play never credits a teammate's find, and never reaches the solo boards.
- A push endpoint outside the allowlist is refused by the database and never called.
- 6th guest generate in an hour returns 429.
- Two runs of one job make one model call and one puzzle.
- A third report hides a puzzle at once; a non-owner gets 404 from every owner endpoint.
- No client can read `puzzle_counts` or call `sponsor_report()` or `count_event()`.
- A puzzle the safety check fails is never saved; an unchecked one never becomes a daily candidate.
- Zero CSP violations on every route.
