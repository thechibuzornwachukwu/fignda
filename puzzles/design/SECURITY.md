# Gazecraft security

Risks: leaked keys, faked scores, AI endpoint abuse, injected text in shared content. All items required.

## Secrets
- Client holds only the Supabase anon key.
- AI key, Supabase service role key, OG secret: Worker secrets only (`wrangler secret put`).
- `.env*` gitignored.

## Auth
- Supabase email OTP (6 digits, 10 min expiry, 5 tries then 15 min lock) and Google OAuth with PKCE.
- Redirect allowlist: prod domain, Pages preview domain.
- Refresh token rotation on.
- A guest plays 2 games, then is asked to sign in.

## Database (RLS on, default deny)
| Table | Read | Write |
|---|---|---|
| profiles (name, handle) | all | own row |
| profile_private (look) | own row | own row; `feminine`, `masculine`, `mixed` or null |
| plays | own rows; public view exposes handle, score, time | Worker only |
| clue_plays (a clue of a case: best stars and score) | own rows, through `my_progress()` only | Worker only, through `record_clue()`; a guest's own progress through `merge_guest_progress()`, unverified |
| player_partners (which partners a player holds, and the one beside them) | own row, through `my_partner()` only | through `choose_partner()` only: the first is free, another only when checked points allow one more |
| partner_cases (the cases closed with each partner) | own counts, through `my_partner()` only | database trigger on checked plays only |
| daily_answers | service role only until day ends | none |
| games curated | all | none |
| games custom | owner, or anyone with share code | Worker only |
| shares | by code | Worker only |
| room_plays, room_finds | through `together_board()` only | Worker only |
| push_subs | own rows | own rows; endpoint must be a known push service |
| friend_streaks, streak_links, game_invites, puzzle_ratings | through functions only | through functions only |
| play_days (the days a checked clue was finished) | own days, through `my_play_days()` only | a trigger on checked clues only |
| notifications | own, through `my_notifications()` | database triggers only; a client can only mark its own read |
| badges | all, through `badges_of()` | database trigger on verified plays only |
| puzzle_reports | none | Worker only, through `report_puzzle()` |
| generate_jobs | none; the Worker hands out a job's state by its id | Worker only |
| daily_candidates (view) | service role only | none |
| puzzle_counts | none; the owner reads totals through `sponsor_report()` | Worker only, through `count_event()` |

- `league_players`, `league_seats`, `league_weeks` (leagues): no policies and no grants.
- `export_my_data()` and `my_records()`: the caller's own rows only.
- Email lives only in `auth.users`.
- Handle: unique, 2 to 20, `[a-z0-9._]`, reserved list (admin, gazecraft, fignda, support, root, help).

## Score integrity
- Client sends a play log: ordered selections `{a, b, t}`, hint times, finish time.
- Worker replays it with the shared engine against server answers and recomputes score.
- Reject: duplicate finds, finish before start, bursts faster than 150ms per find, log over 500 events.
- Guest scores and merged guest results are `unverified` and never ranked.
- The client logs real picks only.
- Room plays: each player's own log is replayed and only the words in it are stored, with the time of each.
- It reads checked plays only and returns no handle, score or row.
- Clean read (every word, no wrong picks, no hints) is worked out by the same replay and stored on the play.
- A clue of a case (`/api/plays` with `clue`): the Worker cuts the catalogue puzzle into passages with the shared engine, replays the log against that passage alone, and works out the stars and the score itself.
- They are for the database alone: no role but the Worker's may call them, and it only through `own_streak`, `pair_streak`, `my_friend_streaks`, `claim_due_reminders` and `reminder_context`, whose grants are as they were.
- Guest progress (`merge_guest_progress`): clues done before sign in move to the account as `unverified`.
- Points count a clue's best checked score once.
- Case badges (`cases_1`, `cases_5`, `cases_10`, `cases_25`) count checked plays of whole catalogue puzzles only.

## AI generation `/api/generate`
- Rate limit: 5 per hour per IP (guest), 20 per hour per user.
- Topic: trim, max 60 chars, strip control chars, reject empty.
- Fixed server prompt.
- Validate JSON with zod: paragraph ≤ 900 chars, ≤ 20 words, each `[A-Za-z]{3,12}`.
- Run engine server side.
- Profanity filter on title, text, words.
- Cache by normalised topic 24h.
- Background making (`"background": true`): the POST writes a `generate_jobs` row and answers at once.
- One runner per job: the claim is one SQL statement.
- One waiting job per player (user id, or address plus a random key the browser keeps).
- A signed in player's job answers only to them.
- A failed attempt gives a guest the request back, once.
- `/run`: 60 per hour per IP.

## Safety check (`worker/src/safety.ts`)
- Runs on every player-made and machine-made puzzle before it gets a link: the word filter over title, noun, paragraph and every hidden word, then Llama Guard (`SAFETY_MODEL`) on the Workers AI binding, then the `AI_PROVIDER` list with a fixed prompt.
- The result is stored on the puzzle: `passed`, or `unchecked` when no model could be reached.
- A link fails open: an `unchecked` puzzle still opens, since the word filter ran and reports are the net.
- Clients cannot write the state.

## Reports and owner power
- `POST /api/puzzles/:code/report`: signed in, 20 per hour, one per player per puzzle, never your own, player-made and machine-made puzzles only.
- The third report from different players hides the puzzle in the same transaction as the count.
- Owner power is a list of Supabase user ids in the Worker var `OWNER_USER_IDS` (`worker/wrangler.toml`), empty by default.
- `/api/owner/*` (list hidden, restore, remove) answers 404 to everyone else, the same as a path that does not exist.
- Restore keeps the old reports but they stop counting toward hiding it again.

## Play counts and the sponsor report
- `POST /api/counts` with `{ "game": id, "kind": "start" | "end" | "full" | "share" | "click" }`: guests too, 240 per hour per IP.
- These are counts from the browser, not replayed plays.
- `sponsor_report()` returns counts per puzzle and nothing else: no handle, no user id, no row per play.

## Push and invites
- VAPID private key is a Worker secret.
- Push endpoints are allowlisted (FCM, Mozilla, Apple, Windows) in the database and again in the Worker before any call.
- `/api/push/line` answers an unknown endpoint with the plain line, so it never says whether an endpoint is registered. 60 per hour per IP.
- One reminder per browser per day, claimed in one statement.
- Room invites: only to players you follow, 30 per hour.
- Nudges: only between streak friends, only after you played, one per friend per day.
- Signing out removes this browser's reminder.

## Player-made puzzles `/api/puzzles`
- Signed in only, 10 per hour. zod: title and noun 2 to 40, text 60 to 900, 4 to 20 words of `[A-Za-z]{3,12}`.
- The engine runs server side with the same rule as the maker screen.
- Profanity filter on title, noun, text, words.

## Shared content
- Share codes: 8 char base32 from `crypto.getRandomValues`.
- Share pages and OG images render database data only, never query params.
- Escape all user text.

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
- Worker CORS: app origins only.

## Retention
`prune_old_data()`, run by the Worker's hourly job:

| What | Kept for | Then |
|---|---|---|
| A play's log (`plays.log`, `room_plays.log`) | 90 days | emptied; the score and words found stay |
| Notifications | 90 days | deleted |
| Room invites | 1 day | deleted |
| Rate limit windows | 2 days | deleted |
| Puzzle reports | 365 days | deleted; a hidden puzzle stays hidden |
| Draft jobs (`generate_jobs`) | 2 days | deleted (`prune_generate_jobs`) |

## Counts
- `puzzle_players` and `word_finds`: how many players played each puzzle, and how many found each word.
- A rare word (`plays.rare_keys`) is worked out by the `plays_rare` trigger when a checked play is saved, from the counts as they stood, and never changes afterwards.

## Privacy
- Collect email, name, handle.
- The look ("Who are we dressing?") is optional and personal.
- Download my data: `export_my_data()`, signed in only, returns the caller's own rows as 1 JSON document.
- Delete account cascades profile, plays, shares.
- Privacy page before launch.

## CI
Dependabot. `npm audit --audit-level=high`.

## Must pass
- Anon client cannot read `daily_answers` or any email.
- Nobody but its owner can read or change a player's look, and no public view carries it.
- Tampered play log rejected.
- A room play never credits a teammate's find, and never reaches the solo boards.
- A push endpoint outside the allowlist is refused by the database and never called.
- 6th guest generate in an hour returns 429.
- Two runs of one job make one model call and one puzzle.
- A third report hides a puzzle at once; a non-owner gets 404 from every owner endpoint.
- `daily_place()` returns a place and a count and nothing about any player.
- No client can read `puzzle_counts` or call `sponsor_report()` or `count_event()`.
- Zero CSP violations on every route.
