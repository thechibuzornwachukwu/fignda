# Build plan

What is left for Gazecraft, in sets that ship one at a time. What is built is in `SPEC.md` and git history.

Deploy: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`.

## Direction

- A puzzle game, and only that: words and numbers hidden in plain sight. No story. No cases, culprits, thieves, suspects or crime of any kind. A pack is a set of puzzles played in order, and a puzzle is one sitting.
- Simple, not bland. Like Sudoku: one board, one rule, play. Few things on a screen, each drawn with colour and weight. Plain never means beige.
- One skill in every game: looking closely.
- Show it, do not caption it. A thing on screen explains itself by how it is drawn, and a thing a player earned looks earned: badges are medals with tiers, in metal, worth sharing. A line under a card that says what it is or whose it is means the drawing failed. Names that are identity stay.
- For players anywhere. Names, food, money and places in a puzzle are ones a player in Lagos, London or Lima reads without a footnote. Home ground is its own thing: the Naija packs and Pidgin are offered as that, by name, never as the default voice of the game.
- Tone: warm and playful. No violence, crime, weapons, romance or fear.
- For all ages, not a children's product. Accounts from 13. Younger players join on a parent's device or room.
- A guest gets 2 games, then signs in. The account is where a player's character, pet and progress live.
- Who you are is the front of the game: your character and your pet are chosen on the You tab, never in Settings.
- We promise the practice, never a result. No word about memory, attention span, focus, IQ, brain training or "proven". Lumosity paid $2 million for claims like those.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- AI is never named in the UI. No "made by a machine" and no "written by a person". A puzzle that reads badly is not shown.
- A new feature replaces or folds into an old one. 2 new games done properly before any more.
- What a copy cannot have, so build toward it: the engine that makes and grades puzzles, the data on which words players miss, a puzzle library the players write, home ground (Naija packs, Pidgin, Paystack), a player's own circle, a player's earned character, and trust.

## Screens: one job each

The rule for every screen: one job, one main action, and the fewest taps to it. Anything that is not the job moves to the screen whose job it is, or goes. A player should never have to choose where to go to play: the dock's Play button always knows.

Navigation, on a phone: no bar across the top. Each screen is its title, one action at most, and the bell. The dock is the only way around: Cases, You, Play, Squad, Ranks. An icon stands alone only where everyone reads it (a gear, a bell, a pencil on a picture); anything else carries its word.

| Screen | Its one job | Main action | State |
|---|---|---|---|
| Play (dock) | Start the next thing | The next clue | Built |
| Cases `/play` | Show where you are on the path | The next puzzle | Built: the path, a pack a card |
| Puzzle, clue | Find the words | Done | Built |
| Result | Say what happened and lead on | Next clue, or Share | Built: a popup at the finish of a clue, then one line and 2 buttons, the rest behind "More" |
| You `/me` | Who you are: character and pet | Select, or Wear | Built. Holds the week, badges and records. `/u/HANDLE` is only what others see |
| Squad `/players` | The people you play with | Follow, or invite | Built in order: friend streaks, circles, top players, suggestions, find |
| Ranks `/leaderboard` | Where you stand today | None: it is read | Built: one board at a time, your own row pinned in view |
| Settings | The account | Save | Built: account only. Reached from the gear on You |
| First minute `/welcome` | Make a new player someone | Keep this look | Built: a new player lands in a clue, and the character and pet are asked after the first result |
| Guest wall | Turn a guest into a player | Sign in | Built: after 2 games |
| Make `/make` | Write a puzzle | Publish | Built. To do: sets 6a to 6g. Reached from the foot of Cases, once unlocked |
| Notifications | What happened while you were away | Open the thing | Built. Reached from the bell |

## Revenue

This is a business. Running costs are near zero, so the first sale is profit. Nothing sold or shown may change a score.

| Model | What is sold | Who pays | Ready |
|---|---|---|---|
| Commissioned puzzle | Made to order: a wedding, a launch, a sermon series, a class topic | People, churches, schools, companies | Now |
| Private board | A circle with its own puzzles, by the month or the term | Schools, companies, churches | Now |
| Tournament | A week's contest on one puzzle, prize from the sponsor | Brands, companies, schools | Now |
| Sponsored puzzle | A puzzle on the sponsor's subject, marked "With NAME", their link on the result and the share card | Brands | Now |
| Season takeover | A holiday pack and the seasonal dress, "with NAME" | Brands | After set 5c |
| Supporter | One payment: no ads ever, a badge | Players | Needs Paystack |
| Plus, by the month | More puzzles in Make, private rooms, extra outfits | Players | Needs Paystack, set 6e |
| Pet outfits | Outfits for the player's pet. Cosmetic only | Players | Needs Paystack, set 3m |
| Special outfits | For the player's own character. Cosmetic only | Players | Needs Paystack |
| Pet unlock | The points to unlock another pet. Bought points unlock pets only and never count for rank, boards or leagues | Players | Needs Paystack |
| Licence | The game under a school's or a publisher's own name | Schools, publishers, media houses | After private boards are proven |
| Footer ad | One a page, still image, never near a puzzle | Advertisers | Needs the domain, and consent in the EU and UK |

Never for sale: hints, extra tries, time, or anything that touches a score; streak freezes; spins, chests, paid chances; player data; anything that was free on the day a player joined. A sponsored puzzle pays points at the normal rate, never a multiplier.

## Owner

- [ ] Decide: the pets' names. Detective X, Detective Tobs, Detective Puff and Agent 404 carry the old story. Suggested: Mochi, Tobs, Puff and 404.
- [ ] Set up Google sign in in Supabase. A 6 digit email code is the hardest step for a new player, and one tap removes it. Likely worth more than any change to guest mode.
- [ ] Decide: the name (suggested: keep Gazecraft. Free as .com and .game on 9 Oct 2026, registry check only: gazecraft, keensleuth, sleuthtrail, cluestop, plainsleuth, loupequest).
- [ ] Decide: what is sold to a church, a school or a wedding now. The price list sells a puzzle on the buyer's subject.
- [ ] Prices for the models above. None is set. Pets open at 3,000, 9,000 and 20,000 points for now (`PARTNER_POINTS` and `partner_slots`): confirm or change.
- [ ] The robot is named Agent 404. A trademark search on that name has not been run.
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
- [ ] The dates of the moving seasons for the year ahead, for `data/holidays.json`: Lunar New Year, Easter, Ramadan and Eid, Diwali.
- [ ] Decide: which seasons a player sees by default. Suggested: the ones the whole world shares the weather or the date for (New Year, spring, summer, harvest, December snow), and the rest by where the player is or what they choose.
- Still under the old name until the domain exists: fignda.pages.dev, the Cloudflare projects `fignda` and `fignda-api`, the local Supabase project id, the database functions `fignda_day_no` and `fignda_score`.

## To build, in sets

One set at a time. Each set is small, works on its own and leaves the live game whole. After each set: lint, typecheck, unit tests and the browser tests pass.

### 1. No story

The owner's word, 14 Oct 2026: the puzzle game has no story line, and nothing about criminals or thieves. Simple, not beige.

- [ ] **Set 1a. The unmasking goes.** A pack ends on its whole puzzle. Out: culprits and disguises, the secret word and its pieces, the unmasking board and its type, the Worker's unmasking replay, the confession, calling card and culprit lines, the 6 tries.
- [ ] **Set 1b. The words on screen.** Every case, clue, detective, suspect, evidence, intercept and Open Eye line in the copy pools, the SPEC and the screens goes or becomes plain: a pack, a puzzle. The dock and the page titles get plain names.
- [ ] **Set 1c. The character.** Detective gear (the badge, the magnifier and the rest) goes. "Your detective" is "You". Earned pieces become plain things worth wearing.
- [ ] **Set 1d. Simple, not beige.** Once the story is out, every screen is looked at again for colour and weight: one board, one action, nothing grey for its own sake.

### 2. Sell now

- [ ] **Set 2a.** A one page pitch with the price list.

### 3. Pets

- [ ] **Set 3m. Pet outfits.** A pet can wear things: a row of outfits per pet on You, tried on the stage like gear, drawn for all 4 pets in every mood. A few are earned, the rest are bought once Paystack is in. Cosmetic only. Needs the art first.

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
- [ ] **Set 7b. Skill pays:** a clean read and a rare find add to the tally. Skill badges shown first: Clean read, No-hint perfect, Long word, Deep find, Rare eye.
- [ ] **Set 7e. A goal the player picks** (Light, Regular, Keen: 1, 2 or 4 sittings a day), apart from the run.
- [ ] **Set 7f. Personal records** copied to the server, with best week.
- [ ] **Set 7g. Leagues:** tables of about 20, 5 tiers, top 5 up, bottom 5 down. Weekly points come only from first clears, so nobody wins by grinding on Sunday night. No message about dropping, a player can leave, fewer than 5 players moves nobody down.

### 8. Data and privacy (GDPR, Nigeria's NDPA)

Play with no account, and sponsors get numbers, never people.

- [ ] How long play logs, jobs, reports and notifications are kept, written into `SECURITY.md` and deleted by the hourly job.
- [ ] Find data kept as counts per word and per puzzle. A deleted account leaves the counts and takes the plays.
- [ ] Private boards: a data agreement with the school or company, and an organiser who sees only its own members.
- [ ] EU players under 16 checked before any marketing there.

### 9. Smaller

- [ ] Usage per feature per week from the database. Under 2% of weekly players after a month moves behind "More".
- [ ] A public list of player-made puzzles.
- [ ] Reminders by email, once SMTP is set.
- [ ] Later, once there are players to help: a help centre on GitBook (how a puzzle works, tip-offs, circles, the account, privacy), linked from Settings and the footer. Advised to the owner. Check its free plan and whether it can sit on our own domain first.
- [ ] Later, with it: email sequences on Loops, to teach a new player the game a little at a time (the first puzzle, a circle, a pet). Advised to the owner. It needs the domain and a yes from the player at sign up, it is a new company that receives email addresses, so the privacy page names it, and every email has a way out. No guilt and no word about what would be lost, as in reminders.
- [ ] `e2e/onboarding.spec.ts`, and a count of new visitors who finish a puzzle and then sign in.

## Checks still owed

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
- Reminder times follow the saved time zone.
- Machine-written puzzles stop for the day when the free limits run out.
- The avatar on the waiting screen bobs and does not blink.
- Mirror words are found, not written: they are whatever everyday words a paragraph happens to hold backwards, so they have nothing to do with the puzzle's subject. A pack whose text holds fewer than 3 has no Mirror puzzle.
- A clue's popup shows in this browser at the finish only. A clue finished on another device shows its result with no popup.
- A following board shows your own row only when it is among its rows: your place among the people you follow is not worked out by the server.
- Personal records are kept in the browser, from 9 Oct 2026 on. Stars and finished packs are on the account from 10 Oct 2026; a guest's are in the browser until they sign in.
- A guest's clues move to the account on sign in with their stars but no points: only a clue played signed in is checked and scored. A points badge earned by a clue shows after the next whole puzzle or daily.
- A guest's place on today's board is worked out from a score the browser sent, so it is a guide, never a rank.
- An unfinished puzzle is kept in the browser it was played in, not on the account: a second device starts clean. Safari clears a site's stored data after 7 days without a visit, so a guest there can lose a kept game, a run and their stars.
- The sponsor report's games and shares are counted in the browser from 10 Oct 2026, guests included, and are not checked by replay: anyone can push one up, 240 an hour per address. A deleted account leaves them and comes out of the signed in players.
