# Build plan

What is left, in sets that ship one at a time. What is built is in `SPEC.md` and git history. The picture of this plan is `NEWPLAN.html`; where they differ, this file wins.

Deploy: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`.

## Direction

- Offer: a few minutes of real detective work, in place of scrolling. Something is hidden in plain sight. Look closer and uncover it.
- One skill in every game: looking closely. Each method is a way of looking: at words, numbers, pictures, a room, a torn page.
- A case is worked the way a detective works one: a brief, the scene, then steps that each end on a lead to the next, then the line-up. A step is one short sitting. The reasons are in `INSIGHTS.html` section 11, and the screens are in the prototype canvas "Gazecraft case storyline" (<https://claude.ai/artifact/Rif6VsH8K4MdDTBXSHSSF4>).
- Nobody leaves clues on purpose. A clue is a trace left by accident, a record somebody else kept, a message meant for somebody else, or something the suspect tried to destroy.
- Every method has a physical reason. A detective never plays a game: each method is a real thing somebody left, kept or tried to destroy (a blotter that kept a note back to front, a page written in lemon juice, a torn receipt), and the play is what you would do with it in your hands. A method with no such reason is left out. The full list, 22 of them, is the sheet "Every method has a physical reason" on the prototype canvas.
- Evidence clears suspects. Every suspect is met in the brief and nobody new turns up at the end.
- The case board is what a player watches change. It is a pinboard: photos, notes and thread. It opens nearly empty on the brief, gains a pin for each step solved, shows the cleared suspects taped over at the line-up, and reads "Solved" at the end. Threads are dotted until something is proved.
- The opening board is different in every case. What is pinned on it comes from the chapter: the thing that is missing, the note about where and when, who the suspects are and how many, and what was left behind. A "prove it" opens on 1 face and an alibi. A "where is it" opens on a map with no faces. A "what is it really" opens on a blurred photo of the thing people saw. No 2 cases open on the same arrangement, so a new case never looks like the last one.
- The lead is given, the clearing is earned. Finishing a step always gives its lead, so the trail never stops and nobody is locked out. Clearing a suspect needs 2 stars or more, and a step can be played again to earn it. Why: feeling able is what brings players back, more than rank does (`INSIGHTS.html`, principle 6), and nothing may lock a player out.
- Backup is not a second currency. Every case comes with 1 favour. It is not earned, not saved, not carried to the next case and never sold. A tip-off costs what a hint costs, and calling a friend in is free. Why: one currency was a rule learned from games whose economy nobody could explain, and each extra thing to count costs more attention than it returns (`INSIGHTS.html`, principle 3).
- The Open Eye stays masked. Every 5 cases closed gives 1 fact about it, and no case ever names it. Why: an answer that is always one step off holds people more than one that is handed over (`INSIGHTS.html`, principle 4).
- Chapters are written by us. All 25 cases frame the paragraphs they have as things found at the scene. The first 3 cases a new player meets get new scenes written for them.
- Chapters differ. A chapter takes 1 of 5 shapes (who did it, prove it, what is it really, where is it, nothing was taken) and draws 5 or 6 methods to suit it.
- Pictures are mixed by what they are for. Things a player examines are real photos: the item in the brief, the 4 pictures, a close-up of evidence. People are always drawn: suspects, the culprit, pets, the player. No photo of a real person, ever. A room that is searched is drawn, because every out-of-place thing in it is put there by hand.
- Photos are free to use and say so. Public domain and CC0 first, then CC BY and CC BY-SA with the credit they ask for. Each photo is stored with its source, its author and its licence, and the game has a credits page. No recognisable person, logo or brand name in any of them. Wikimedia Commons first for home subjects.
- A new culprit each case, an ordinary character under a disguise. One unseen figure links the cases, the Open Eye: every culprit leaves its card, and it teaches people to pass messages in plain sight. That is why words are hidden at all. A case's hidden-words step is a message to the Open Eye, intercepted.
- The player has a pet that comes along on every case: Detective X (the cat, and the logo), Detective Tobs (the dino), Detective Puff (the dog) and Agent 404 (the robot). A player picks 1, free, and unlocks the others with points. They are pets, not partners: something a player owns, dresses and shows off, which is what makes an outfit for one worth buying. Who they are: `design/brand/index.html`.
- Tone: the motive is mischief, pride or a surprise, never harm. No violence, gangs, weapons, romance or fear.
- For all ages, not a children's product. Accounts from 13. Younger players join on a parent's device or room.
- A guest gets 2 games, then signs in. The account is where a detective, a pet and a case live.
- Who you are is the front of the game: your detective and your pet are chosen on a stage (the You tab), never in Settings.
- We promise the practice, never a result. No word about memory, attention span, focus, IQ, brain training or "proven". Lumosity paid $2 million for claims like those.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- AI is never named in the UI. No "made by a machine" and no "written by a person". A puzzle that reads badly is not shown.
- A new feature replaces or folds into an old one. 2 new games done properly before any more.
- What a copy cannot have, so build toward it: the engine that makes and grades puzzles, the data on which words players miss, a case library the players write, home ground (Naija packs, Pidgin, Paystack), a player's own circle, a player's earned character, and trust.

## Screens: one job each

The rule for every screen: one job, one main action, and the fewest taps to it. Anything that is not the job moves to the screen whose job it is, or goes. A player should never have to choose where to go to play: the dock's Play button always knows.

Navigation, on a phone: no bar across the top. Each screen is its title, one action at most, and the bell. The dock is the only way around: Cases, You, Play, Squad, Ranks. An icon stands alone only where everyone reads it (a gear, a bell, a pencil on a picture); anything else carries its word.

| Screen | Its one job | Main action | State |
|---|---|---|---|
| Play (dock) | Start the next thing | Today's daily, then the next clue | Built |
| Cases `/play` | Show where you are in the case | The next clue on the path | Built: daily card, then the path. Closed cases fold into one row |
| Puzzle, clue | Find the words | Done | Built |
| Result | Say what happened and lead on | Next clue, or Share | Built: a popup at the finish of a clue, then one line and 2 buttons, the rest behind "More" |
| Unmasking | Name the culprit | Pick a letter | Built: the last clue of a case, made to be won. A line about the culprit, first letters given, a bank of letters, a hint. 6 tries, then the mask comes off either way |
| You `/me` | Who you are: detective, pet, gear | Select, or Wear | Built. Holds the week, badges and records. `/u/HANDLE` is only what others see |
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
| Sponsored daily | "Today's daily, with NAME" for a day or a week | Brands | Now |
| Sponsored case | A whole case in the sponsor's world | Brands | Now |
| Season takeover | A holiday case and the seasonal dress, "with NAME" | Brands | After set 5c |
| Supporter | One payment: no ads ever, a badge | Players | Needs Paystack |
| Plus, by the month | More puzzles in Make, private rooms, extra outfits | Players | Needs Paystack, set 6e |
| Pet outfits | Outfits for the player's pet. Cosmetic only | Players | Needs Paystack, set 3m |
| Special outfits | For the player's own detective. Cosmetic only | Players | Needs Paystack |
| Pet unlock | The points to unlock another pet. Bought points unlock pets only and never count for rank, boards or leagues | Players | Needs Paystack |
| Licence | The game under a school's or a publisher's own name | Schools, publishers, media houses | After private boards are proven |
| Footer ad | One a page, still image, never near a puzzle | Advertisers | Needs the domain, and consent in the EU and UK |

Never for sale: hints, extra tries, time, or anything that touches a score; streak freezes; spins, chests, paid chances; player data; anything that was free on the day a player joined. A sponsored puzzle pays points at the normal rate, never a multiplier.

## Owner

- [ ] Set up Google sign in in Supabase. A 6 digit email code is the hardest step for a new player, and one tap removes it. Likely worth more than any change to guest mode.
- [ ] Decide: the name (suggested: keep Gazecraft, detective theme inside it. Free as .com and .game on 9 Oct 2026, registry check only: gazecraft, keensleuth, sleuthtrail, cluestop, plainsleuth, loupequest).
- [ ] Decide: do the pets keep "Detective" and "Agent" in their names now that they are pets, and is the cat in the logo the player's pet or its own character.
- [ ] Read every photo before it ships. In a first search of Wikimedia Commons, 2 of 7 photos had to be thrown out after a look: a guitar shown from the back, and beads with no string in the shot. The licence was fine on both. Somebody has to look.
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
- [ ] Eid dates and a puzzle for `data/holidays.json`.
- Still under the old name until the domain exists: fignda.pages.dev, the Cloudflare projects `fignda` and `fignda-api`, the local Supabase project id, the database functions `fignda_day_no` and `fignda_score`.

## To build, in sets

One set at a time. Each set is small, works on its own and leaves the live game whole. After each set: lint, typecheck, unit tests and the browser tests pass, the work stops, the owner tries it and pushes, and only then does the next set start. A set that turns out too big is split, not rushed.

Rules for every set: write it into `SPEC.md` first. Engine work is pure TS with unit tests, and the UI never re-implements matching. Every line comes from `src/copy` pools. Scores on existing boards do not change. Read `SECURITY.md` before data, auth or Worker work. Motion follows `SPEC.md` section 8 (from <https://github.com/emilkowalski/skills>). A list, board or section that can be empty or fail to load says so with the player's pet (`<PartnerNote>`, `SPEC.md` section 4): large and centred when the empty state is the screen, small beside the line inside a busy one, one pet a screen. Anything that loads ships with its skeleton (`SPEC.md` section 4, Skeletons): a new screen, section or component gets a matching one in the same set, with a row in the table there, and a set that changes a layout changes its skeleton.

### 1. The case, worked like a detective (next)

Build in this order. Each set is one chapter-sized step and leaves the 25 live cases playable: a case with no written chapter keeps today's flow.

- [ ] **Set 1b. A chapter is written down.** One file per chapter: its shape, the item, the place, 4 suspects, and its steps in order, each with a place, a method, the fact it leaves and where that leads. One chapter in full first: The missing shekere, a "who did it".
- [ ] **Set 1c. The brief and the case board.** A case opens on its board, laid out from the chapter's own data, so every case opens differently. The same board is on the case card, gains a pin after each step, and is the line-up and the ending.
- [ ] **Set 1d. Every step ends on a lead.** A step's result says what was learned and where to go next: it clears a suspect, or gives means, motive or chance. A step's screen is the way back, the marks, a title and the board. No line above the title.
- [ ] **Set 1e. Hidden words are an intercepted message.** The text is something the suspect sent to a partner, never a witness talking. Each one is filed under the Open Eye, and the file grows across cases.
- [ ] **Set 1f. The line-up.** The last step of a "who did it": name who is left, with means, motive and chance shown. 2 tries, then the mask comes off. "Spell the name" stays as a method for other shapes.
- [ ] **Set 1g. Call for backup.** On any step: a tip-off from the pet, a friend called into the step, or the case's 1 favour.
- [ ] **Set 1i. New methods,** one a set, engine first, in this order: spot what is off (a drawn scene), the torn page, 4 pictures and 1 word (real photos, with the photo store and the credits page it needs), invisible ink, rub the pad, ink not word, what stood here. No clock on any of them. The rest are on the canvas sheet. "Bigger tag" is left out: nothing in a real case asks for it.
- [ ] **Set 1j. The other 4 shapes,** one written chapter each.
- Later, once those are being played: Liar, Relay, Number series, Bury it.

### 2. Sell now

- [ ] **Set 2a.** A one page pitch with the price list.

### 3. Pets

- [ ] **Set 3m. Pet outfits.** A pet can wear things: a row of outfits per pet on You, tried on the stage like gear, drawn for all 4 pets in every mood. A few are earned, the rest are bought once Paystack is in. Cosmetic only. Needs the art first.

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
- [ ] EU players under 16 checked before any marketing there.

### 9. Smaller

- [ ] Read the packs against `PUZZLE_STANDARD.md` and fix the worst. `giveaways` flags bible, bnote, broad, nigeria, bpeople, world, afrobeats, eagles.
- [ ] Pick dailies from the `daily_candidates` view. Nothing reads it yet.
- [ ] Usage per feature per week from the database. Under 2% of weekly players after a month moves behind "More".
- [ ] A public list of player-made puzzles.
- [ ] Reminders by email, once SMTP is set.
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
- Reminder times follow the saved time zone. The daily changes at midnight UTC.
- Machine-written puzzles stop for the day when the free limits run out.
- The avatar on the waiting screen bobs and does not blink.
- Mirror words are found, not written: they are whatever everyday words a paragraph happens to hold backwards, so they have nothing to do with the puzzle's subject. A case whose text holds fewer than 3 has no Mirror clue.
- Sums and Mirror clues give no piece of the secret.
- There are 14 culprits (`culpritWho`), so a player who closes many cases learns the names. The list cannot simply grow: a case finds its culprit by position in it, so adding one changes who the culprit of old cases is.
- A clue's popup shows in this browser at the finish only. A clue finished on another device shows its result with no popup.
- A following board shows your own row only when it is among its rows: your place among the people you follow is not worked out by the server.
- Personal records are kept in the browser, from 9 Oct 2026 on. Stars and closed cases are on the account from 10 Oct 2026; a guest's are in the browser until they sign in.
- A guest's clues move to the account on sign in with their stars but no points: only a clue played signed in is checked and scored. A points badge earned by a clue shows after the next whole puzzle or daily.
- A guest's place on today's board is worked out from a score the browser sent, so it is a guide, never a rank.
- An unfinished puzzle is kept in the browser it was played in, not on the account: a second device starts clean. Safari clears a site's stored data after 7 days without a visit, so a guest there can lose a kept game, a run and their stars.
- The sponsor report's games and shares are counted in the browser from 10 Oct 2026, guests included, and are not checked by replay: anyone can push one up, 240 an hour per address. A deleted account leaves them and comes out of the signed in players.
