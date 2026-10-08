# Build plan

What is left. Everything built so far is recorded in git history and `SPEC.md`. A piece of work is done when its checks pass.

Deploy: `npm run deploy:site`, `npm run deploy:api`. Database: `npx supabase db push`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`. `db push --include-seed` only records the file's hash, it does not run it.

## Live

Since 7 Oct 2026: room games on the Together board, holiday dailies, streak lines, friend streaks with invite links and nudges, room invites, points, the new player profile, "only 8% found", player-made puzzles, answers pages, 4 Naija packs.

Since 8 Oct 2026: any-topic puzzles, and an avatar for every player in a room (guests and your own row included).

## How any-topic puzzles work today

- `AI_PROVIDER` in `worker/wrangler.toml` is a list, asked in order: OpenRouter, then Google, then Groq. A provider without a key is skipped.
- OpenRouter, `nvidia/nemotron-3-super-120b-a12b:free`: the only free model there that hides words (11 tried). 1 to 2.5 minutes a puzzle. 50 requests a day, 1,000 once the account has bought $10 of credit. Its sentences can be clumsy.
- Google, `gemini-3.5-flash`: about 30 seconds and cleaner writing, but 20 requests a day.
- Groq: written and unit tested, never called for real. It joins once `GROQ_API_KEY` is stored.
- The player keeps the page open the whole time. Worst case is about 5 minutes and then a failure.
- Test models again with `npm run ai:bench` when the free lists change. It spends the daily free requests, so test few topics.

## Owner

- [ ] Reset the database password (Supabase, Database, Settings). It was shared in chat and is still the live one.
- [ ] OpenRouter: buy $10 of credit once. Free models stay free, and the daily limit goes from 50 requests to 1,000.
- [ ] Groq key, optional (console.groq.com, API Keys). Store it as `GROQ_API_KEY` with `npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml` and in `worker/.dev.vars`.
- [ ] Reminder keys: `npm run push:keys`, put the public key and `VAPID_SUBJECT` in `worker/wrangler.toml`, `npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml`, `npm run deploy:api`. Reminders are built and stay off until then.
- [ ] Buy a domain. Unlocks reliable email, ads later, and a keyword in the address.
- [ ] Decide the name before the domain is bought: keep Fignda, or rename (checked free on 7 Oct 2026: peepam.com, sabisee.com, oyalook.com, lookwell.game).
- [ ] Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded code email is ready and applies once this is set. Until then Supabase sends its own plain email with a link.
- [ ] Review the look tags on hairstyles (`src/avatar/parts/hair.ts`): which are usually feminine, masculine, or for anyone. Outfits no longer count toward the look.
- [ ] Read the 4 Naija packs (`data/games.json`: afrobeats, nollywood, lagos, eagles) for names you would add or drop. The engine has checked that every word is hidden across word boundaries.
- [ ] Holiday calendar (`data/holidays.json`): Eid is not in it. Its date depends on the moon sighting and no current puzzle fits. Add the dates and a puzzle when ready.
- [ ] Read 10 any-topic puzzles made on the live site and say whether the writing is good enough to keep OpenRouter first.

## To build next

### 1. Waiting screen with the player's avatar

Asked for by the owner on 8 Oct 2026. Write it into `SPEC.md` first (section 8, Motion, and the any-topic line), then build.

What it is:

- [ ] `<Waiting>` in `src/components`: the player's avatar, 3 dots under it that bounce one after the other, one line of text, and a Cancel link. Nothing else on it.
- [ ] The avatar moves a little: a slow bob, and a blink if the face parts allow it without redrawing the character. It is drawn by the existing `<Avatar>`, never redrawn.
- [ ] Two sizes. Full: fills the page area under the header, avatar at 88. Inline: avatar at 40 with the dots beside it, for a wait inside a page.
- [ ] Motion comes from tokens only. Add the durations and the easing to `src/styles/tokens.css` (for example `--dur-bounce`, `--dur-bob`), no ms in the component.
- [ ] The dots use `--muted`. No lime: lime means found.
- [ ] The line under the dots comes from a new copy pool in `data/copy.json` (`waiting`), through `pick`. It changes every 20 seconds or so on a long wait, so the screen does not look stuck. No exclamation marks, no em dashes.
- [ ] Reduced motion: no bounce and no bob. The dots stay still and the text still changes.

Where it is used:

- [ ] A. A new any-topic puzzle (full). Replaces "Creating..." and the line under the input.
- [ ] B. Opening a puzzle by link, `/p/CODE` and `/play/c-...`, when it takes longer than 1 second (full).
- [ ] B. Making share images in the share sheet (inline). Replaces "Making images...".
- [ ] B. Publishing a puzzle you made, only if it passes 1 second (inline).
- [ ] B. Slow page loads, the blank `Suspense` fallback in `src/App.tsx` (full, after 1 second).
- [ ] Not used for anything that normally answers in under 1 second (save settings, follow, invite, sign in code). Those keep their button text. A loader that flashes is worse than none.

Edge cases to test (unit tests for the component, e2e for the flows):

- [ ] Guest, no avatar: the starter avatar shows. The seed is saved in the browser so the same guest sees the same character each time.
- [ ] Signed in, avatar code not loaded yet: the starter shows, then swaps to the real one without a jump in size or position.
- [ ] Answer in under 1 second (a topic made in the last 24 hours comes from the cache): the screen never appears.
- [ ] Answer just after it appears: it stays at least 600ms so it does not flicker.
- [ ] Failure (`genFail`), limit reached (429) and offline: the screen closes, the input keeps the topic, the right line shows. A 429 says when to try again, from `Retry-After`.
- [ ] Wait past 5 minutes: the request is stopped, the player gets the failure line, nothing spins forever.
- [ ] Cancel: stops the request and returns to the input with the topic kept.
- [ ] Double tap on Create, or Enter twice: 1 request only.
- [ ] Phone locked or app switched mid wait: on return the puzzle opens if it is ready, or the wait carries on.
- [ ] Back button during the wait: leaves cleanly, no late jump to the puzzle afterwards.
- [ ] Screen reader: one `role="status"` line, the avatar and dots hidden from it, new lines read out no more than once every 20 seconds.
- [ ] Keyboard: focus moves to the screen when it opens and back to the input when it closes.
- [ ] 320px wide, and both themes.
- [ ] Reduced motion on: nothing moves.
- [ ] Long name or long topic in the line: wraps, never pushes the avatar off screen.

### 2. Make the puzzle in the background

Needed because a 1 to 5 minute request that dies with the page is fragile on phones. The waiting screen sits on top of this.

- [ ] `POST /api/generate` answers at once with a job id. The Worker carries on with `ctx.waitUntil`. A `generate_jobs` table (migration, RLS, Worker only) holds the state: waiting, done with the puzzle code, or failed.
- [ ] `GET /api/generate/:id` gives the state. The waiting screen asks every 5 seconds.
- [ ] The job id is kept in the browser, so closing the tab or losing signal does not lose the puzzle. Coming back to `/play` picks the wait up again, or shows "Your puzzle is ready" with a link.
- [ ] A failed attempt gives the guest's request back (today a failure still counts toward 5 an hour).
- [ ] One job per player at a time. A second ask returns the first job.
- [ ] Check first that `waitUntil` lasts long enough on the free Workers plan for a 2.5 minute model call. If it does not, use a Queue or keep the request open as today.
- [ ] Read `SECURITY.md` before the table and the endpoint.

### 3. Any-topic quality and speed

- [ ] Reject a puzzle whose paragraph reads badly before it reaches the player. Start cheap: a list of give-away patterns (a hidden word that is also a whole word in the text, the same trick used 3 times).
- [ ] Filter the hidden words themselves, not only the text: a word hidden across "dog rapeseed" style joins must not spell something rude. `isProfane` checks whole strings today.
- [ ] Try Google first for signed in players (30 seconds, better writing) and OpenRouter for the rest, within Google's 20 a day.
- [ ] Log which provider made each puzzle and how long it took (a column on `games`), so the order can be decided on numbers.
- [ ] Generate one hidden word at a time and check each with the engine, if whole-paragraph quality stays poor.

### 4. Other

- [ ] Holiday dailies, phase 2: a themed puzzle for each holiday, made with the AI, checked by the engine and read by a person before it is scheduled. Same file, new puzzle ids.
- [ ] Player-made puzzles, public list: today they open by link only. A browse list needs a report button and a way to hide a puzzle first. Any-topic puzzles need the same before they are listed anywhere.
- [ ] Search traffic, name part: "Fignda: the hidden words game" in titles. Waiting on the name decision.
- [ ] Reminders by email for players whose browser cannot do push. Needs the SMTP above.

## Ideas parked

- Seasonal avatar touches could switch on by date (a Santa hat row that appears in December), and a few special ones could be earned or sold. Everything that helps someone look like themselves stays free.
- Notifications by push as well as in the app (a follow, a streak ask, a badge), once reminders are switched on. Each kind needs its own off switch first.
- A home screen widget or app badge showing the run. Duolingo's biggest single lift after the streak itself.
- Friend streak milestones (7, 30, 100 days together) with a card to share.
- A push when a background puzzle is ready, once reminders are on.

## Business, once people are playing

- [ ] Paystack: remove ads forever, streak freeze, past dailies archive, paid "make your own puzzle". The case for the freeze: Duolingo reports about 21% less churn for players near a break.
- [ ] A paid AI model for any-topic puzzles if the free ones stay slow. Needs a spending cap and a price per puzzle worked out first.
- [ ] AdSense footer ad: one per page, still image, never near the puzzle. Needs the domain. Update the privacy page (it says "No ads" today).
- [ ] Sponsored puzzles for brands, schools and churches, with a one page pitch.

Rule for all of it: nothing sold or shown may affect scores.

## Checks still owed

- [ ] One any-topic puzzle from a phone on fignda.pages.dev. Only the API address was tested with a real wait, not the site's `/api` path.
- [ ] A real room game on 2 phones. The room tests run in tabs of one browser, not over the live connection.
- [ ] The privacy page against any-topic: topics now go to OpenRouter, Google and Groq. Say so if it does not.
- [ ] Mobile Lighthouse with Google PageSpeed (92 measured on this machine; Google's quota had run out).
- [ ] Signed in screens on the live site with a real second account: start a circle, save a character, follow someone, start a friend streak from a link, invite into a room. The Players lists stay empty until a second account exists.
- [ ] One real push on Android Chrome and on an iPhone with the site on the Home Screen. Needs the reminder keys.

## Switched off on purpose

- Google sign in: hidden until the provider is set up in Supabase, then build with `VITE_GOOGLE_AUTH=1`.
- Reminders: until the keys are set (see Owner). The settings switch says so.

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself, and its own per address limit applies instead.
- If two players in a room find the same word at the same moment, both see it as theirs in the room. The Together board credits one of them, the earlier find by the server's clock.
- A room player who closes the tab before the game ends sends no play, so their finds do not count for the team.
- Reminder times follow the player's time zone as saved when they turned reminders on. The daily itself still changes at midnight UTC.
- Room plays made before the Together board shipped are not on it.
- Any-topic puzzles stop for the day when the free limits run out: about 50 requests on OpenRouter and 20 on Google. Players then see the failure line.
