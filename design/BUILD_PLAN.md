# Build plan

What is left, in sets that ship one at a time. What is built is in `SPEC.md` and git history. The picture of this plan is `NEWPLAN.html`; where they differ, this file wins.

Deploy: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`.

## Direction

- Offer: a few minutes of real detective work, in place of scrolling. Something is hidden in plain sight. Look closer and uncover it.
- One skill in every game: looking closely. Words today, numbers and shapes next.
- A case is a run of clues. A clue is one short sitting. The last clue puts the pieces together and unmasks who hid the secret.
- A new culprit each case, an ordinary character under a disguise. One unseen figure links the cases: every culprit leaves the same calling card.
- 4 partners work the case beside the player: Detective X (the cat, and the logo), Detective Tobs, Detective Puff and Robo-cop. A player picks 1, free, and unlocks the others with points. Who they are: `design/brand/index.html`.
- Tone: the motive is mischief, pride or a surprise, never harm. No violence, gangs, weapons, romance or fear.
- For all ages, not a children's product. Accounts from 13. Younger players join on a parent's device or room.
- We promise the practice, never a result. No word about memory, attention span, focus, IQ, brain training or "proven". Lumosity paid $2 million for claims like those.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- AI is never named in the UI. No "made by a machine" and no "written by a person". A puzzle that reads badly is not shown.
- A new feature replaces or folds into an old one. 2 new games done properly before any more.
- What a copy cannot have, so build toward it: the engine that makes and grades puzzles, the data on which words players miss, a case library the players write, home ground (Naija packs, Pidgin, Paystack), a player's own circle, a player's earned character, and trust.

## Revenue

This is a business. Running costs are near zero, so the first sale is profit. Nothing sold or shown may change a score.

| Model | What is sold | Who pays | Ready |
|---|---|---|---|
| Commissioned puzzle | Made to order: a wedding, a launch, a sermon series, a class topic | People, churches, schools, companies | Now |
| Private board | A circle with its own puzzles, by the month or the term | Schools, companies, churches | Now |
| Tournament | A week's contest on one puzzle, prize from the sponsor | Brands, companies, schools | Now |
| Sponsored puzzle | A puzzle on the sponsor's subject, marked "With NAME", their link on the result and the share card | Brands | After set 1a |
| Sponsored daily | "Today's daily, with NAME" for a day or a week | Brands | After set 1a |
| Sponsored case | A whole case in the sponsor's world | Brands | After sets 2d and 3c |
| Season takeover | A holiday case and the seasonal dress, "with NAME" | Brands | After set 5c |
| Supporter | One payment: no ads ever, a badge | Players | Needs Paystack |
| Plus, by the month | More puzzles in Make, private rooms, extra outfits | Players | Needs Paystack, set 6e |
| Special outfits | Cosmetic only | Players | Needs Paystack, set 3d |
| Partner unlock | The points to unlock another partner. Bought points unlock partners only and never count for rank, boards or leagues | Players | Needs Paystack, set 3g |
| Licence | The game under a school's or a publisher's own name | Schools, publishers, media houses | After private boards are proven |
| Footer ad | One a page, still image, never near a puzzle | Advertisers | Needs the domain, and consent in the EU and UK |

Never for sale: hints, extra tries, time, or anything that touches a score; streak freezes; spins, chests, paid chances; player data; anything that was free on the day a player joined. A sponsored puzzle pays points at the normal rate, never a multiplier.

## Owner

- [ ] Decide: the name (suggested: keep Gazecraft, detective theme inside it. Free as .com and .game on 9 Oct 2026, registry check only: gazecraft, keensleuth, sleuthtrail, cluestop, plainsleuth, loupequest).
- [ ] Prices for the models above, and the points a partner costs. None is set.
- [ ] "Robo-cop" is close to RoboCop, a registered film trademark. Check it, or rename, before the robot is in the game.
- [ ] A list of 20 people to ask first: brands, schools, churches, event planners.
- [ ] What a sponsor may and may not write.
- [ ] Reset the database password (Supabase, Database, Settings). It was shared in chat and is still the live one.
- [ ] Buy the domain. Unlocks reliable email, Paystack on our own address, and ads.
- [ ] Paystack: account, the business details it asks for, a test payment.
- [ ] A lawyer's read before private boards for schools, before ads, and before any under-13 account.
- [ ] OpenRouter: buy $10 of credit once. The daily limit goes from 50 requests to 1,000.
- [ ] Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded email is ready.
- [ ] Reminder keys: `npm run push:keys`, the public key and `VAPID_SUBJECT` in `worker/wrangler.toml`, `npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml`, `npm run deploy:api`.
- [ ] Groq key, optional: `npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml` and `worker/.dev.vars`.
- [ ] Read: the look tags on hairstyles (`src/avatar/parts/hair.ts`), the 4 Naija packs in `data/games.json`, the 7 terms in `worker/src/blocklistLocal.ts`, and 10 machine-written puzzles from the live site.
- [ ] Eid dates and a puzzle for `data/holidays.json`.
- Still under the old name until the domain exists: fignda.pages.dev, the Cloudflare projects `fignda` and `fignda-api`, the local Supabase project id, the database functions `fignda_day_no` and `fignda_score`.

## To build, in sets

One set at a time. Each set is small, works on its own and leaves the live game whole. After each set: lint, typecheck, unit tests and the browser tests pass, the work stops, the owner tries it and pushes, and only then does the next set start. A set that turns out too big is split, not rushed.

Rules for every set: write it into `SPEC.md` first. Engine work is pure TS with unit tests, and the UI never re-implements matching. Every line comes from `src/copy` pools. Scores on existing boards do not change. Read `SECURITY.md` before data, auth or Worker work. Motion follows `SPEC.md` section 8 (from <https://github.com/emilkowalski/skills>).

### 1. Sell now

- [x] **Set 1a.** The "With NAME" mark from one field on a puzzle: game row, daily card, result, share card, link preview. Built 9 Oct 2026, in `SPEC.md` section 5 (With NAME). To try it: add `"sponsor": { "name": "...", "url": "https://..." }` to a puzzle in `data/games.json`, then `npm run og:render`. No puzzle carries one yet.
- [ ] **Set 1b.** A sponsor report from the database: players, plays, finish rate, shares. Counts only.
- [ ] **Set 1c.** A one page pitch with the price list.

### 2. Sittings

A long puzzle is played in short passages. Short must not mean thin: every sitting ends with something won, and the whole puzzle stays as the hard one.

- [ ] **Set 2a. Engine only, nothing on screen.** `passages(puzzle)` cuts at sentence ends where no answer runs across the cut, 5 to 9 answers each, a short tail joined to the passage before. Measured: all 25 puzzles cut cleanly into about 55 passages. A puzzle with no clean cut stays whole.
- [ ] **Set 2b. Save and resume.** Leaving a puzzle keeps the finds, the hints and the clock. The clock counts time on the puzzle, not time away. Useful by itself, before passages exist.
- [ ] **Set 2c. A passage can be played.** Its own screen, result, stars and clean read. Reached by link only. Passages are never ranked against whole puzzles.
- [ ] **Set 2d. Passages on the path.** Each passage is a clue, the whole puzzle is the last clue of its case, with its board and scores as they are. A whole-puzzle score from before shows its passages as done. A case shows how many clues are left, never how many minutes. A room plays the whole puzzle. The daily is not cut.

### 3. Cases

- [ ] **Set 3a. Names.** Case (was chapter), clue (was stop), unmasking (the last clue), in the UI and the code. Ranks replace level bands: Rookie, Detective, Inspector, Chief (`BANDS` in `src/engine/level.ts`).
- [ ] **Set 3b. The secret, engine only.** Each clue gives one piece and the last puts them together. Never typed by hand. A puzzle that changes must not break its case.
- [ ] **Set 3c. Culprits and the unmasking.** One disguise per case, drawn on top of an ordinary avatar the way the Festive items are (`src/avatar`, append only). Copy pools: a line to open a case, a confession to close it, the calling card. Motion: a "Case closed" stamp and the mask coming off. No cutscenes.
- [ ] **Set 3d. Outfits.** Detective pieces (coat, hat, magnifying glass, badge) earned by closing cases and rising in rank. Everything that helps someone look like themselves stays free.
- [ ] **Set 3e. Server.** Clue progress and case badges saved from verified plays, a guest's progress moved to the account on sign in, ranks as a view over points. 2 devices with different progress, and a player with history before cases exist.
- [ ] **Set 3f. Rooms as a squad.** Every player's finds count toward the same secret.
- [ ] **Set 3g. Partners** (SPEC section 5, Partners). The art exists: `design/characters` draws them, `design/brand/elements` holds the states, bubbles and case files. To build: the pick in the first minute, the partner on screen states, the waiting screen and the result, the choice saved with the profile, switching in Settings, unlocking with points. Buying points for an unlock waits for Paystack.

### 4. More games

Engine first (`expectedAnswers`, unit tests), then the `Board`, with no change to the shell. Number and shape games are made and checked by the engine, so they never run out. Designs are in `prototype/Gazecraft Future Games.dc.html`.

- [ ] **Set 4a.** A `family` on each registry type (Verbal, Quantitative, Non-verbal). Nothing new on screen.
- [ ] **Set 4b. Buried sums.** Runs of digits that add up to a target, same drag. In "All games" first.
- [ ] **Set 4c. The rhythm.** Number clues join the path: word, word, number, word.
- [ ] **Set 4d. Mirror.** Hidden words that read right to left. It reuses every paragraph.
- [ ] **Set 4e. Unmask.** Reveal a phrase letter by letter. It becomes the last clue of a case.
- [ ] **Set 4f. One shape game.** Odd one out, or Trace. Then the rhythm gains a shape.
- Later, once those are being played: Liar, Relay, Number series, Bury it.

### 5. Holiday cases

- [ ] **Set 5a. The case archive.** A place for cases that are not on the path. Empty until 5b.
- [ ] **Set 5b. One holiday case.** It opens on the date for everyone, beside the path, 3 to 5 clues, and never blocks the player's own case. After the date it moves to the archive and its outfit piece and badge can still be earned.
- [ ] **Set 5c. Seasonal dress** for the path, the dock and avatars, from `data/holidays.json`. Off under reduced motion.
- [ ] **Set 5d. The rest of the calendar,** one case at a time: Christmas week, New Year, Easter, Eid, Independence Day, Children's Day, Halloween, Valentine's.

### 6. Make, one feature

"Any topic" goes away. It is Make with the system making the choices the player did not make. Engine and server parts exist: `hideForMe`, `topicIcon`, `giveaway`, `safetyCheck`, the job endpoints.

- [ ] **Set 6a. The background wait.** The any-topic box uses the job (`startGenerate`, `runGenerateJob`, `getGenerateJob`), keeps the job id in the browser and picks the wait up on return.
- [ ] **Set 6b. Topic icons** on every puzzle: lucide through `<Icon>` from `data/topicIcons.json`, 12 of our own for home subjects in `src/components/icons/`, one default. `--muted`, never lime.
- [ ] **Set 6c. One box on `/make`,** signed in: "What should we hide words in?" Nothing typed and "Surprise me", a topic, an emoji (from `data/topicEmoji.json`; unknown ones are asked about), or a paragraph of 60 or more characters with "Hide some for me". "Write it myself" opens the full form.
- [ ] **Set 6d. Preview before publishing:** change the title, swap a word, another go, pick the icon. Publish is always the player's tap. Fewer than 4 hidden words: nothing is published.
- [ ] **Set 6e. One kind of puzzle.** A system-written one belongs to the player who asked ("Made by @handle", votes, reports, the daily candidate rule). Today `player_puzzles` leaves out rows with a `topic_key`. One limit: 20 Make requests an hour. Each player gets their own copy of a cached topic.
- [ ] **Set 6f. Any topic removed:** the box on the games screen, `CustomTopic.tsx`, the `Custom` category. Old guest-made puzzles keep opening by link.
- [ ] **Set 6g. Quality:** reject with `readsBadly` or hidden profanity before the player sees it. Google first for signed in players. Log the provider and the seconds on `games`.
- Edge cases across the sets: one letter, only spaces, a real person's name, emoji in every form, Pidgin, 5,000 characters, the same topic twice, the session expiring mid way, the daily free limit reached.

### 7. Points, ranks and rewards (server)

All decided on the server from verified plays. One currency: lifetime points set rank and never drop, weekly points set the league and reset on Monday. No boosts, paid or free.

- [ ] **Set 7a. Rest day:** 1 a week, earned by playing 5 of the last 7, used by itself, free. The same for friend streaks.
- [ ] **Set 7b. Skill pays:** a clean read and a rare find add to the tally. Skill badges shown first: Clean read, No-hint perfect, Long word, Deep find, Rare eye, Case master.
- [ ] **Set 7c. Sharp eye:** the share of rare words caught over the last 14 dailies.
- [ ] **Set 7d. Crowns:** the first in your circle to find each word in today's daily. "Ahead of 62% today" on the global board from 5 players up.
- [ ] **Set 7e. A goal the player picks** (Light, Regular, Keen: 1, 2 or 4 sittings a day), apart from the run. The run needs only the daily.
- [ ] **Set 7f. Personal records** copied to the server, with best week.
- [ ] **Set 7g. Leagues:** tables of about 20, 5 tiers, top 5 up, bottom 5 down. Weekly points come only from dailies and first clears, so nobody wins by grinding on Sunday night. No message about dropping, a player can leave, fewer than 5 players moves nobody down.

### 8. Data and privacy (GDPR, Nigeria's NDPA)

Play with no account, and sponsors get numbers, never people.

- [ ] "Download my data" in Settings. Delete exists.
- [ ] How long play logs, jobs, reports and notifications are kept, written into `SECURITY.md` and deleted by the hourly job.
- [ ] Find data kept as counts per word and per puzzle. A deleted account leaves the counts and takes the plays.
- [ ] Private boards: a data agreement with the school or company, and an organiser who sees only its own members.
- [ ] Age 13 stated at sign up. EU players under 16 checked before any marketing there.
- [ ] The privacy page lists every company that receives data and where the database sits.

### 9. Smaller

- [ ] Read the packs against `PUZZLE_STANDARD.md` and fix the worst. `giveaways` flags bible, bnote, broad, nigeria, bpeople, world, afrobeats, eagles.
- [ ] Pick dailies from the `daily_candidates` view. Nothing reads it yet.
- [ ] Usage per feature per week from the database. Under 2% of weekly players after a month moves behind "More".
- [ ] A circle offered after the third daily. "Days this month" on the profile.
- [ ] A public list of player-made puzzles.
- [ ] "Gazecraft" in page titles. Reminders by email, once SMTP is set.
- [ ] `e2e/onboarding.spec.ts`, and a count of new visitors who finish a puzzle and then sign in.

## Checks still owed

- [ ] Signed in browser tests since the sign in flash fix. Docker was down on 9 Oct 2026.
- [ ] The safety model (Llama Guard) with one real call. Its answer shape is assumed.
- [ ] On real phones: the dock on an iPhone Home Screen app, a room game on 2 phones, a machine-written puzzle through the site, the waiting screen with the phone locked.
- [ ] Signed in screens on the live site with a real second account.
- [ ] One real push on Android and iPhone. Needs the reminder keys.
- [ ] The numbers in `INSIGHTS.html` against primary sources before any goes on a public page.

## How puzzles are written today

`AI_PROVIDER` in `worker/wrangler.toml` is asked in order: OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`, 1 to 2.5 minutes, 50 a day, clumsy at times), Google (`gemini-3.5-flash`, 30 seconds, 20 a day), Groq (never called for real). The brief is `PUZZLE_STANDARD.md`. Test models with `npm run ai:bench`; it spends the daily free requests.

## Switched off on purpose

- Google sign in: until the provider is set up in Supabase, then build with `VITE_GOOGLE_AUTH=1`.
- Reminders: until the keys are set.

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself.
- Two players finding the same word at the same moment both see it as theirs. The Together board credits the earlier one.
- A room player who closes the tab before the end sends no play.
- Reminder times follow the saved time zone. The daily changes at midnight UTC.
- Machine-written puzzles stop for the day when the free limits run out.
- The avatar on the waiting screen bobs and does not blink.
- Stars, shelf counts and personal records are kept in the browser, from 9 Oct 2026 on.
