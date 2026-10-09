# Build plan

What is left. Everything built so far is recorded in git history and `SPEC.md`. A piece of work is done when its checks pass.

Deploy: `npm run deploy:site`, `npm run deploy:api`. Database: `npx supabase db push`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`. `db push --include-seed` only records the file's hash, it does not run it.

## Live

Since 7 Oct 2026: room games on the Together board, holiday dailies, streak lines, friend streaks with invite links and nudges, room invites, points, the new player profile, "only 8% found", player-made puzzles, answers pages, 4 Naija packs.

Since 8 Oct 2026: any-topic puzzles, and an avatar for every player in a room (guests and your own row included).

Since 9 Oct 2026: the Gazecraft name and logo, the first minute for new players (`/welcome`), the journey path on the Games tab, one header on the 4 tabs, rings, the waiting screen, stars, skill lines and personal records on the result, clean reads, reports on player-made puzzles, the safety check, background puzzle jobs on the server.

## The promise

Decided direction, 8 Oct 2026. The research and the reasoning are in `design/INSIGHTS.html`.

- Gazecraft is the opposite of a feed: one paragraph a day with words hidden in plain sight. About 5 minutes, then it is over.
- Line: "Slow down. Look closer." The dare stays as the hook: "Think you read carefully? You don't."
- We promise the practice, never a result. No claims about attention span, memory, grades or brain rot. Lumosity paid $2 million for claims like those.
- Every game element stays: score, points, badges, boards, streaks, friend streaks, rooms, avatars. What changes is what they reward: skill and winnable contests, not showing up.
- One rule from now on: a new feature must replace or fold into an old one.
- AI is never named in the UI or in any flow (owner, 8 Oct 2026; the way Duolingo makes lessons with AI and does not label them). No "made by a machine" label, and no "written by a person" or "no slop" claim either, since some puzzles are machine-made. The quality bar does the work: a machine-made puzzle that reads badly is not shown. The privacy page still names the AI providers that receive what a player types.

## How the system writes puzzles today

- `AI_PROVIDER` in `worker/wrangler.toml` is a list, asked in order: OpenRouter, then Google, then Groq. A provider without a key is skipped.
- OpenRouter, `nvidia/nemotron-3-super-120b-a12b:free`: the only free model there that hides words (11 tried). 1 to 2.5 minutes a puzzle. 50 requests a day, 1,000 once the account has bought $10 of credit. Its sentences can be clumsy.
- Google, `gemini-3.5-flash`: about 30 seconds and cleaner writing, but 20 requests a day.
- Groq: written and unit tested, never called for real. It joins once `GROQ_API_KEY` is stored.
- It is live as "Or any topic" on the games screen, open to guests. It moves into Make a puzzle (To build next, 5).
- The player keeps the page open the whole time. Worst case is about 5 minutes and then a failure.
- Test models again with `npm run ai:bench` when the free lists change. It spends the daily free requests, so test few topics.

## Owner

- [ ] Reset the database password (Supabase, Database, Settings). It was shared in chat and is still the live one.
- [ ] OpenRouter: buy $10 of credit once. Free models stay free, and the daily limit goes from 50 requests to 1,000.
- [ ] Groq key, optional (console.groq.com, API Keys). Store it as `GROQ_API_KEY` with `npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml` and in `worker/.dev.vars`.
- [ ] Reminder keys: `npm run push:keys`, put the public key and `VAPID_SUBJECT` in `worker/wrangler.toml`, `npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml`, `npm run deploy:api`. Reminders are built and stay off until then.
- [ ] Buy a domain. Unlocks reliable email, ads later, and a keyword in the address.
- [ ] Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded code email is ready and applies once this is set. Until then Supabase sends its own plain email with a link.
- [ ] Review the look tags on hairstyles (`src/avatar/parts/hair.ts`): which are usually feminine, masculine, or for anyone. Outfits no longer count toward the look.
- [ ] Read the 4 Naija packs (`data/games.json`: afrobeats, nollywood, lagos, eagles) for names you would add or drop. The engine has checked that every word is hidden across word boundaries.
- [ ] Holiday calendar (`data/holidays.json`): Eid is not in it. Its date depends on the moon sighting and no current puzzle fits. Add the dates and a puzzle when ready.
- [ ] Read 10 any-topic puzzles made on the live site and say whether the writing is good enough to keep OpenRouter first.
- Name decided, 8 Oct 2026: Gazecraft. Domains wanted: gazecraft.com and gazecraft.game (not checked or bought). Still under the old name until the domain exists: the address fignda.pages.dev, the Cloudflare project names `fignda` and `fignda-api`, the local Supabase project id, and the database functions `fignda_day_no` and `fignda_score`.

## To build next

Order matters. 1 to 3 make the game better and cost nothing. 4 to 6 serve Make a puzzle.
Please factor in the ideas herein: https://github.com/emilkowalski/skills/tree/main


### 2. A better game

Six parts, from the six principles in `INSIGHTS.html`. Each is small enough to ship alone. Engine work is pure TS with unit tests against `data/games.json`; the UI never re-implements matching.

**2a. The find itself (principle 1)**

- [ ] Paragraphs worth reading: read the existing packs against `design/PUZZLE_STANDARD.md` and fix the worst. `giveaways` in `src/engine/giveaway.ts` flags bible, bnote, broad, nigeria, bpeople, world, afrobeats and eagles.
- [ ] Player-made dailies with no person in the loop: something that picks a daily from the `daily_candidates` view. The view already holds the rule (safety passed, 20 different players other than the maker, 80% "Good one", no reports, not hidden). Nothing reads it yet.
- [ ] Limits to say out loud: an AI check misses things, most of all local slang and in-jokes about real people. The local blocklist (`worker/src/blocklistLocal.ts`) has 7 terms: read it and add to it. The report rule is the real safety net.

**2b. Local, winnable competition (principle 2)**

- [ ] Crowns: for each hidden word in today's daily, the first player in your circle to find it. Shown in the circle's Today table and under your result ("First in your circle to find KENYA"). Server side only, from verified play logs.
- [ ] Weekly tables of about 20 players, with tiers to move up and down: see Leagues in 3c.
- [ ] On the global board, "ahead of 62% today" beside the rank, from 5 verified players up.
- [ ] A player with no circle is offered one after their third daily, not before.

**2c. Less at once (principle 3)**

Nothing is removed. Things appear when they mean something.

- [ ] Count what is used before building more: plays per feature per week from the database (rooms, circles, friend streaks, make, any-topic). Anything under 2% of weekly players after a month moves behind a "More" link.

**2d. Anticipation, not obligation (principle 4)**

- [ ] Rest day: 1 a week, earned by playing 5 of the last 7 days, used by itself when a day is missed. Free. Never sold. The run line says so ("Rest day used. Your run holds.").
- [ ] "Days this month" where the profile and the account show the run.
- [ ] Friend streaks get the same rest day, shared.
- [ ] No reward that looks like gambling: no spins, no chests, no paid chances.


**2f. Skill over attendance (principle 6)**

- [ ] Keep all 13 badges. Add a skill family, shown first: Clean read, No-hint perfect, Long word (9 or more letters), Deep find (3 joins), Rare eye (a word under 10% found), Pack master (every puzzle in a pack perfect).
- [ ] Personal records: best week, and a server copy so they follow the player across devices.
- [ ] Sharp eye: the share of rare words you caught over your last 14 dailies, with a 14 day strip. This is the number that shows a player getting better.
- [ ] Points also pay for skill: a clean read and a rare find add to the tally. Volume alone keeps counting as today.
- [ ] A few avatar looks unlock from skill badges. Everything that helps someone look like themselves stays free and open.

**Checks for all of section 2**

- [ ] Scores on existing boards do not change. Anything new is additive.
- [ ] Every new line comes from `src/copy` pools.
- [ ] Each part has an e2e path for a guest, a new signed in player and a player with history.
- [ ] `SECURITY.md` read before crowns, weekly tables and rest days: all three are decided on the server from verified plays.

### 3. Screens that feel like a game

The reasoning is in `INSIGHTS.html` sections 7 to 9. Done on 9 Oct 2026: the phone tab bar is now a floating dock with a raised Daily button (SPEC section 5, Tab bar).

**3a. Pages that stand alone** (learned from Duolingo's core tabs redesign)

- [ ] The dock, still to check: on a real iPhone with the Home Screen app (safe area), on a 320px phone, with the keyboard open on Players search, and that the lime tick appears the moment the daily is finished without a reload.

**3b. The first minute** (owner, 9 Oct 2026: onboarding is not great)

- [ ] `e2e/onboarding.spec.ts`: a guest, a new signed in player and a returning player. Only the unit tests and the sign up path of the other specs cover the flow today.
- [ ] Edge cases in a browser: one who leaves half way and returns, one who signs in on a second device, reduced motion, a 320px phone, a screen reader.
- [ ] Measure: new visitors who finish one puzzle, and finished players who then sign in (INSIGHTS section 10). Nothing in the repo counts visits yet.

**3c. The journey** (owner, 9 Oct 2026: the Games page feels boring)

The Games tab becomes a path the player travels, the way Duolingo's home is a path and not a list. It replaces the list as the first thing on the tab. It does not sit on top of it.

- [ ] The chapter badge saved on the server.
- [ ] Levels from the server: a view over points with the thresholds of `src/engine/level.ts`. Then `<LevelBadge>` beside the avatar in rooms and boards.
- [ ] Leagues: the weekly tables of 2b, with tiers. 5 tiers to start. About 20 players in a table, grouped each Monday within a tier. The week's score is the points earned that week from dailies and first clears on the path. Top 5 move up a tier, bottom 5 move down, the top tier keeps its top 3 on a wall. Decided on the server by the hourly job that already exists.
- [ ] Keep leagues on the right side of principle 4: no message about dropping, a player can leave leagues in Settings, a week with no play moves nobody down more than 1 tier, and rest days (2d) apply.
- [ ] More stops need more puzzles. New chapters come from puzzles that passed the daily candidate rule (2a), so the path grows without anyone writing to order.
- [ ] A guest's path moves to the account on sign in. Leagues need sign in.
- [ ] The level-up moment after a game, on the result, once levels come from the server.
- [ ] Edge cases still open: stars worked out from the best verified play, 2 devices with different guest progress on sign in, a table with fewer than 5 players (nobody moves down), a tie on the cut line, the week turning over mid game.
- [ ] Database: `journey_progress`, `levels` as a view over points, `leagues` and `league_weeks`. Migrations with RLS, written by the Worker only. Read `SECURITY.md` first.

### 4. Waiting screen with the player's avatar

Asked for by the owner on 8 Oct 2026. Write it into `SPEC.md` first (section 8, Motion, and the any-topic line), then build.

What it is:


Where it is used:


Edge cases to test (unit tests for the component, e2e for the flows):

- [ ] Phone locked or app switched mid wait: on return the puzzle opens if it is ready, or the wait carries on.
- [ ] 320px wide, and both themes.

### 5. Make the puzzle in the background

Needed because a 1 to 5 minute request that dies with the page is fragile on phones. The waiting screen sits on top of this.

How it works (decided 9 Oct 2026): `waitUntil` gives a Worker about 30 seconds after its answer, and a puzzle takes 1 to 2.5 minutes, so the slow call cannot hang off the POST. A Queue is not needed either. The POST (with `"background": true`) only writes the job. The page then opens `GET /api/generate/:id/run`, an ordinary long request that does the work and writes the result to the job, while asking `GET /api/generate/:id` every 5 seconds. Only one runner gets a job (a claim in the database, renewed every 20 seconds). If the page dies the claim goes stale after 60 seconds, the state says `run: true`, and the next visit opens `/run` again. Without the flag the POST waits as before, so the current screen keeps working until it is switched.

- [ ] The page uses the background job: `startGenerate`, `runGenerateJob` and `getGenerateJob` in `src/lib/api.ts`, asking every 5 seconds. The server side is in.
- [ ] The job id is kept in the browser, so closing the tab or losing signal does not lose the puzzle. Coming back to `/play` picks the wait up again, or shows "Your puzzle is ready" with a link.

### 6. Make a puzzle takes over any-topic

Owner, 8 Oct 2026. There is one feature, Make a puzzle. "Any topic" is not a second feature: it is Make with the system making the choices the player did not make. Everything any-topic has today moves inside Make and the name goes away.

How it works:

- [ ] Sign in is needed for all of Make, as today. A guest who opens `/make` gets the sign in screen and returns to Make after.
- [ ] `/make` opens with one box: "What should we hide words in?" The player fills as much as they want and the system chooses the rest:
  - Nothing typed, "Surprise me": the system picks the topic, writes the paragraph and hides the words.
  - A word, a name or a topic: the system writes the paragraph and hides the words.
  - An emoji typed as the topic is fine (owner, 8 Oct 2026): a football means football, a pot of food means cooking. Read from a small table in `data/`, not guessed by the AI. An emoji with no entry gets "Tell us in a word what that one means." The emoji is input only: on screen the puzzle shows its topic icon.
  - A paragraph of 60 characters or more: the player lists the hidden words, as Make does today. A "Hide some for me" button lets the system find words that are already hidden in it, using the engine only.
- [ ] "Write it myself" opens the full form from the start.
- [ ] The player sees the result before it is published and can change the title, swap a word or ask for another go. Publish is always the player's tap.

Folding the rest in:

- [ ] One kind of puzzle. A system-written puzzle belongs to the player who asked: it carries "Made by @handle", shows in Your puzzles with plays and likes, takes Good one / Not for me votes, and follows the same safety check, report rule and daily candidate rule (2a). Today those are skipped: `player_puzzles` leaves out rows with a `topic_key`.
- [ ] One endpoint and one limit. `/api/generate` becomes a step of the Make endpoint, signed in only. The guest limit of 5 an hour goes; the signed in limit of 20 an hour covers every Make request.
- [ ] The 24 hour topic cache stays as a speed-up, but each player gets their own copy of the puzzle so that plays, votes and the maker's name are theirs.
- [ ] Remove "Or any topic" from the games screen, `CustomTopic.tsx`, its SPEC line and its tests. Remove the `Custom` category name where it shows; these are player puzzles.
- [ ] Old any-topic puzzles made by guests keep working by link. They have no maker, so they never become daily candidates.
- [ ] The waiting screen (4) and background making (5) belong to Make now. Their text says "Making your puzzle", never anything about topics or AI.
- [ ] Topic icons (owner, 8 Oct 2026: icons, not emoji). Every puzzle and every pack carries one small icon for what it is about.
  - First choice: `lucide-react` through `<Icon>`, already the rule. Stroke 1.75, size 20 on cards and 16 inline.
  - `data/topicIcons.json`: topic words to icon names (football, music, food, animals, space, cars, money, school, faith, places, people, and so on). The system picks from this table by matching the topic. The AI never chooses or draws an icon.
  - Where lucide has nothing fitting, mostly home subjects (a pot of jollof, a talking drum, a danfo bus, a gele, the eagle), draw our own in `src/components/icons/`: same 24 grid, same 1.75 stroke, round caps, `currentColor`, no fills. Start with 12 and add only when a pack needs one.
  - No match: one neutral default icon. Never a blank space and never a wrong guess.
  - The maker can change the icon before publishing, from a short picker.
  - Shown on game rows, Your puzzles, the Make preview and share cards. Colour is `--muted`; never lime, which means found.
  - Emoji stay only where they already are: the copied text result (the green, white and bulb squares).

Edge cases to test:

- [ ] One letter. Only spaces. A number. A full name of a real person (the safety check decides).
- [ ] Emoji only, with and without an entry in the table. Emoji mixed with words. A flag. A skin tone variant. 10 emoji in a row. In every case the published puzzle shows an icon, never the emoji.
- [ ] Topic icon: a topic with no match gets the default; a topic matching 2 icons gets the first in the table; a custom icon and a lucide icon sit on the same baseline at 16 and 20; both themes.
- [ ] A topic in Pidgin or another language.
- [ ] 60 characters of one repeated word. A paste of 5,000 characters.
- [ ] The same topic twice in 24 hours, by the same player and by 2 players.
- [ ] "Surprise me" 3 times in a row gives 3 different topics.
- [ ] The system finds fewer than 4 hidden words: the player is told and nothing is published.
- [ ] Signed out part way through (session expired): the typed text survives the sign in round trip.
- [ ] The daily free AI limit is reached: "Write it myself" still works, and the short path says to try again tomorrow.

Quality and speed of the system's writing:

- [ ] Reject a puzzle whose paragraph reads badly before it reaches the player. Start cheap: a list of give-away patterns (a hidden word that is also a whole word in the text, the same trick used 3 times).
- [ ] Filter the hidden words themselves, not only the text: a word hidden across "dog rapeseed" style joins must not spell something rude. `isProfane` checks whole strings today.
- [ ] Try Google first for signed in players (30 seconds, better writing) and OpenRouter for the rest, within Google's 20 a day.
- [ ] Log which provider made each puzzle and how long it took (a column on `games`), so the order can be decided on numbers.
- [ ] Generate one hidden word at a time and check each with the engine, if whole-paragraph quality stays poor.

### 7. Other

- [ ] Holiday dailies, phase 2: a themed puzzle for each holiday, made with the AI, checked by the engine and by the same safety check and standard as any other puzzle (2a). Same file, new puzzle ids.
- [ ] Player-made puzzles, public list: today they open by link only. A browse list needs a report button and a way to hide a puzzle first. Any-topic puzzles need the same before they are listed anywhere.
- [ ] Search traffic, name part: "Gazecraft: the hidden words game" in titles. The name is decided (Gazecraft); the titles are not changed yet.
- [ ] Reminders by email for players whose browser cannot do push. Needs the SMTP above.

## Ideas parked

- More than one game (asked for on 9 Oct 2026): families like the reasoning papers at school, Verbal, Quantitative and Non-verbal, all practising the same close look. Written into `SPEC.md` section 9. After sections 1 to 3. Order when it starts:
  - A `family` field on each registry type, shown on game rows and as a filter. Nothing new on screen until a second family has a game.
  - Buried sums as the first Quantitative game: engine first, pure TS, with `expectedAnswers` in `data/games.json` and unit tests, then its `Board`.
  - One Non-verbal game (Trace) after that.
  - It follows the one rule: families fold into the games list and the journey (3c), they do not add a screen.
  - The wish behind it is helping people get their focus back. We can build for that. We cannot say it: the promise allows the practice, never a result.
- Seasonal avatar touches could switch on by date (a Santa hat row that appears in December), and a few special ones could be earned or sold. Everything that helps someone look like themselves stays free.
- Notifications by push as well as in the app (a follow, a streak ask, a badge), once reminders are switched on. Each kind needs its own off switch first.
- A home screen widget or app badge showing the week ring. Duolingo's biggest single lift after the streak itself.
- Friend streak milestones (7, 30, 100 days together) with a card to share.
- A push when a background puzzle is ready, once reminders are on.

## Business, once people are playing

- [ ] Paystack: remove ads forever, past dailies archive, paid "make your own puzzle". The streak freeze is no longer for sale: rest days are free (2d). Selling relief from a worry we created breaks the promise, and the EU is looking at exactly that.
- [ ] A paid AI model for any-topic puzzles if the free ones stay slow. Needs a spending cap and a price per puzzle worked out first.
- [ ] AdSense footer ad: one per page, still image, never near the puzzle. Needs the domain. Update the privacy page (it says "No ads" today).
- [ ] Sponsored puzzles for brands, schools and churches, with a one page pitch.

Rule for all of it: nothing sold or shown may affect scores.

## Checks still owed

- [ ] `npm run e2e` over everything built on 9 Oct 2026. The specs were written or updated and never run.
- [ ] The safety model (Llama Guard) with one real call. Its answer shape is assumed.
- [ ] The numbers in `INSIGHTS.html` against their primary sources, before any of them goes on a public page. Several came from news reports.

- [ ] One any-topic puzzle from a phone on fignda.pages.dev. Only the API address was tested with a real wait, not the site's `/api` path.
- [ ] A real room game on 2 phones. The room tests run in tabs of one browser, not over the live connection.
- [ ] The privacy page: what a player types into Make goes to OpenRouter, Google and Groq. Say so if it does not.
- [ ] Mobile Lighthouse with Google PageSpeed (92 measured on this machine; Google's quota had run out).
- [ ] Signed in screens on the live site with a real second account: start a circle, save a character, follow someone, start a friend streak from a link, invite into a room. The Players lists stay empty until a second account exists.
- [ ] One real push on Android Chrome and on an iPhone with the site on the Home Screen. Needs the reminder keys.

## Switched off on purpose

- Google sign in: hidden until the provider is set up in Supabase, then build with `VITE_GOOGLE_AUTH=1`.
- Reminders: until the keys are set (see Owner). The settings switch says so.

## Known limits

- The avatar on the waiting screen bobs and does not blink: the face parts cannot blink without redrawing the character.
- Shelf counts, stars and personal records are kept in the browser, from 9 Oct 2026 on. Earlier plays and other devices are not counted.
- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself, and its own per address limit applies instead.
- If two players in a room find the same word at the same moment, both see it as theirs in the room. The Together board credits one of them, the earlier find by the server's clock.
- A room player who closes the tab before the game ends sends no play, so their finds do not count for the team.
- Reminder times follow the player's time zone as saved when they turned reminders on. The daily itself still changes at midnight UTC.
- Room plays made before the Together board shipped are not on it.
- Any-topic puzzles stop for the day when the free limits run out: about 50 requests on OpenRouter and 20 on Google. Players then see the failure line.
