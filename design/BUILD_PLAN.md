# Build plan

What is left. Everything built so far is recorded in git history and `SPEC.md`. A piece of work is done when its checks pass.

Deploy: `npm run deploy:site`, `npm run deploy:api`. Database: `npx supabase db push`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`. `db push --include-seed` only records the file's hash, it does not run it.

## Live

Since 7 Oct 2026: room games on the Together board, holiday dailies, streak lines, friend streaks with invite links and nudges, room invites, points, the new player profile, "only 8% found", player-made puzzles, answers pages, 4 Naija packs.

Since 8 Oct 2026: any-topic puzzles, and an avatar for every player in a room (guests and your own row included).

## The promise

Decided direction, 8 Oct 2026. The research and the reasoning are in `design/INSIGHTS.html`.

- Fignda is the opposite of a feed: one paragraph a day with words hidden in plain sight. About 5 minutes, then it is over.
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
- [ ] Decide the name before the domain is bought (see the name line below). The name can change later, but a change after the domain costs the search ranking earned under the old one.
- [ ] Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded code email is ready and applies once this is set. Until then Supabase sends its own plain email with a link.
- [ ] Review the look tags on hairstyles (`src/avatar/parts/hair.ts`): which are usually feminine, masculine, or for anyone. Outfits no longer count toward the look.
- [ ] Read the 4 Naija packs (`data/games.json`: afrobeats, nollywood, lagos, eagles) for names you would add or drop. The engine has checked that every word is hidden across word boundaries.
- [ ] Holiday calendar (`data/holidays.json`): Eid is not in it. Its date depends on the moon sighting and no current puzzle fits. Add the dates and a puzzle when ready.
- [ ] Read 10 any-topic puzzles made on the live site and say whether the writing is good enough to keep OpenRouter first.
- [ ] Pick a name that fits the promise. Free as .com on 8 Oct 2026 (registry check only; trademarks and social handles not checked): eyedey.com, notisam.com, seamword.com, sabisee.com, peepam.com, slowdey.com, betwixa.com. Notes on each are in `design/INSIGHTS.html`.

## To build next

Order matters. 1 and 2 make the game better and cost nothing. 3 to 5 serve Make a puzzle.

### 1. Say the promise

Write each change into `SPEC.md` first.

- [ ] Landing: keep "Find it." / "Figure it out." and the demo. Add the promise under the hero and a short "Why" block: it ends, it is worth reading, it respects you. No numbers from the research on the page until the primary sources are checked.
- [ ] Page titles and descriptions (`src/seo/pages.ts`): keep the dare, add the promise to the home description. Unit tests in `worker/test/meta.unit.test.ts` pin the current strings.
- [ ] After the daily: one calm line that the day is done, from a new `doneToday` pool in `data/copy.json`. More games stay one tap away, never pushed.
- [ ] "Made by @handle" stays on player-made puzzles. Nothing else says who or what wrote a puzzle.
- [ ] Reminder and streak lines (`remind`, `remindStreak`, `streakKeep`): read every line and remove any that works by guilt or loss. They talk about today's puzzle.
- [ ] About page: the promise. Privacy page: the 3 AI providers that receive what a player types into Make a puzzle, and the safety check on player-made puzzles.
- [ ] A check in `npm test` that no copy pool or page string holds the banned claims (attention span, brain training, memory, IQ, proven).

### 2. A better game

Six parts, from the six principles in `INSIGHTS.html`. Each is small enough to ship alone. Engine work is pure TS with unit tests against `data/games.json`; the UI never re-implements matching.

**2a. The find itself (principle 1)**

- [ ] After the game, the reveal: each missed word shown where it hides, with the join marked ("a mos|t" for AMOS). One at a time, tap to step through. Today missed answers are only shaded.
- [ ] "You read past it": count how many of your own selections crossed a missed word. Needs nothing new from the server, the play log has the spans.
- [ ] Difficulty from the engine: for each answer, how many word joins it crosses and how long it is. `src/engine` gains `difficulty(answer)`. Used by 2b, 2d and 2f.
- [ ] Clean read: a game finished with no wrong picks and no hints. Shown on the result and counted on the profile.
- [ ] Paragraphs worth reading: a written standard for every puzzle, used by the pack writers and given to the AI as its brief (a true small scene, plain words, no sentence bent out of shape to fit a word). Read the existing packs against it and fix the worst.
- [ ] Player-made dailies with no person in the loop (the owner has no time to read them). A puzzle from `/make` becomes a daily candidate only when all of these hold:
  - the word list and the paragraph pass `isProfane`, including every hidden word and every join;
  - an AI safety check passes: vulgar, sexual, hateful, racist, violent, self-harm, and attacks on a named person. Use a free safety model first (Llama Guard on the Workers AI binding already in `worker/wrangler.toml`; confirm the model id and the free allowance), with the any-topic provider list as the fallback;
  - players liked it: at least 20 verified plays and 80% "Good one";
  - nobody has reported it.
- [ ] The safety check also runs on every player-made and machine-made puzzle before it gets a link. A fail gives the maker a plain line and nothing is saved.
- [ ] Report on every puzzle that is not ours. 3 reports from different players hide it at once and take it out of the daily queue. Hidden puzzles are listed on one owner page, newest first, with Restore and Remove.
- [ ] Limits to say out loud: an AI check misses things, most of all local slang, in-jokes about real people, and words that are only rude in Pidgin, Yoruba, Igbo or Hausa. Add a local blocklist to `isProfane`, and treat the report rule as the real safety net.

**2b. Local, winnable competition (principle 2)**

- [ ] The leaderboard opens on your crowd: circle if you have one, else people you follow, else everyone. Segmented control keeps all three.
- [ ] Crowns: for each hidden word in today's daily, the first player in your circle to find it. Shown in the circle's Today table and under your result ("First in your circle to find KENYA"). Server side only, from verified play logs.
- [ ] Weekly tables: about 20 players of similar level, grouped each Monday from last week's dailies. Top 3 named on Sunday. No promotion or relegation ladder yet.
- [ ] On the global board, "ahead of 62% today" beside the rank, from 5 verified players up.
- [ ] A player with no circle is offered one after their third daily, not before.

**2c. Less at once (principle 3)**

Nothing is removed. Things appear when they mean something.

- [ ] First visit shows the daily and the games list only.
- [ ] Each element appears when the player has done what it scores: boards after the first finished game, badges and points after the first verified play, circles and friend streaks after the third daily, Make a puzzle after 5 plays. A direct link always works.
- [ ] `/players` leads with one thing, not 3 sections.
- [ ] Count what is used before building more: plays per feature per week from the database (rooms, circles, friend streaks, make, any-topic). Anything under 2% of weekly players after a month moves behind a "More" link.

**2d. Anticipation, not obligation (principle 4)**

- [ ] Rest day: 1 a week, earned by playing 5 of the last 7 days, used by itself when a day is missed. Free. Never sold. The run line says so ("Rest day used. Your run holds.").
- [ ] "Days this month" beside the run, so a break does not zero everything the player sees.
- [ ] Friend streaks get the same rest day, shared.
- [ ] Variable days: the daily already hides how many words there are. Add what today holds without saying how much: some days a long word (9 or more letters), some days a deep one (3 joins). After the game: "Today hid 11. Most days hide 8."
- [ ] Rare find grows up: the result shows the rarest word you found and how rare, every day there are 5 players, not only when half or fewer found it.
- [ ] No reward that looks like gambling: no spins, no chests, no paid chances.

**2e. Closing the ring (principle 5)**

- [ ] `<Ring>` in `src/components`: an open circle that fills. Tokens only. Reduced motion: it jumps to its value. Lime only when closed, since lime means found.
- [ ] Packs: the ring replaces the ProgressLine beside "12 / 30".
- [ ] Daily: the count stays hidden. When 3 are left the bar says "3 left" and the ring shows the gap. Before that it shows finds only.
- [ ] Week ring on the games screen: 7 parts, one per day played, rest days drawn differently.
- [ ] Pack shelves: "4 of 12 finished" on each category.

**2f. Skill over attendance (principle 6)**

- [ ] Keep all 13 badges. Add a skill family, shown first: Clean read, No-hint perfect, Long word (9 or more letters), Deep find (3 joins), Rare eye (a word under 10% found), Pack master (every puzzle in a pack perfect).
- [ ] Personal records on the profile and the result: fastest clean read per pack, most found in a daily, longest word, best week. A new record gets its own line and sound.
- [ ] Sharp eye: the share of rare words you caught over your last 14 dailies, with a 14 day strip. This is the number that shows a player getting better.
- [ ] Points also pay for skill: a clean read and a rare find add to the tally. Volume alone keeps counting as today.
- [ ] A few avatar looks unlock from skill badges. Everything that helps someone look like themselves stays free and open.

**Checks for all of section 2**

- [ ] Scores on existing boards do not change. Anything new is additive.
- [ ] Every new line comes from `src/copy` pools.
- [ ] Each part has an e2e path for a guest, a new signed in player and a player with history.
- [ ] `SECURITY.md` read before crowns, weekly tables and rest days: all three are decided on the server from verified plays.

### 3. Waiting screen with the player's avatar

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

- [ ] A. A puzzle the system is writing in Make (full). Replaces "Creating..." and the line under the input.
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

### 4. Make the puzzle in the background

Needed because a 1 to 5 minute request that dies with the page is fragile on phones. The waiting screen sits on top of this.

- [ ] `POST /api/generate` answers at once with a job id. The Worker carries on with `ctx.waitUntil`. A `generate_jobs` table (migration, RLS, Worker only) holds the state: waiting, done with the puzzle code, or failed.
- [ ] `GET /api/generate/:id` gives the state. The waiting screen asks every 5 seconds.
- [ ] The job id is kept in the browser, so closing the tab or losing signal does not lose the puzzle. Coming back to `/play` picks the wait up again, or shows "Your puzzle is ready" with a link.
- [ ] A failed attempt gives the guest's request back (today a failure still counts toward 5 an hour).
- [ ] One job per player at a time. A second ask returns the first job.
- [ ] Check first that `waitUntil` lasts long enough on the free Workers plan for a 2.5 minute model call. If it does not, use a Queue or keep the request open as today.
- [ ] Read `SECURITY.md` before the table and the endpoint.

### 5. Make a puzzle takes over any-topic

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
- [ ] The waiting screen (3) and background making (4) belong to Make now. Their text says "Making your puzzle", never anything about topics or AI.
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

### 6. Other

- [ ] Holiday dailies, phase 2: a themed puzzle for each holiday, made with the AI, checked by the engine and by the same safety check and standard as any other puzzle (2a). Same file, new puzzle ids.
- [ ] Player-made puzzles, public list: today they open by link only. A browse list needs a report button and a way to hide a puzzle first. Any-topic puzzles need the same before they are listed anywhere.
- [ ] Search traffic, name part: "Fignda: the hidden words game" in titles. Waiting on the name decision.
- [ ] Reminders by email for players whose browser cannot do push. Needs the SMTP above.

## Ideas parked

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

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself, and its own per address limit applies instead.
- If two players in a room find the same word at the same moment, both see it as theirs in the room. The Together board credits one of them, the earlier find by the server's clock.
- A room player who closes the tab before the game ends sends no play, so their finds do not count for the team.
- Reminder times follow the player's time zone as saved when they turned reminders on. The daily itself still changes at midnight UTC.
- Room plays made before the Together board shipped are not on it.
- Any-topic puzzles stop for the day when the free limits run out: about 50 requests on OpenRouter and 20 on Google. Players then see the failure line.
