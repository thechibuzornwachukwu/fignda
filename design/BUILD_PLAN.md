# Build plan

What is left, in sets that ship one at a time. What is built is in `SPEC.md` and git history. The picture of this plan is `NEWPLAN.html`; where they differ, this file wins.

Deploy: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`.

## Direction

- This is a detective game. It began as a word game, and hidden words is now 1 method among several, never the game. Anything that is a word hunt for its own sake gets a reason from a case, moves to practice, or goes (section 4).
- Offer: a few minutes of real detective work, in place of scrolling. Something is hidden in plain sight. Look closer and uncover it.
- One skill in every game: looking closely. Each method is a way of looking: at words, numbers, pictures, a room, a torn page.
- A case is worked the way a detective works one: a brief, the scene, then steps that each end on a lead to the next, then the line-up. A step is one short sitting. The reasons are in `INSIGHTS.html` section 11, and the screens are in the prototype canvas "Gazecraft case storyline" (<https://claude.ai/artifact/Rif6VsH8K4MdDTBXSHSSF4>).
- Nobody leaves clues on purpose. A clue is a trace left by accident, a record somebody else kept, a message meant for somebody else, or something the suspect tried to destroy.
- A case has 3 kinds of work, and a chapter should have all 3: finding what is there (searching a scene), reading what was left (messages, records, traces), and weighing what could have happened (scenarios). The first chapter has only the second. Without the other 2 a player reads evidence and never looks for it or reasons from it.
- Show it, do not caption it. A thing on screen explains itself by how it is drawn, and a thing a player earned looks earned: badges are medals with tiers, in metal, worth sharing. A line under a card that says what it is or whose it is means the drawing failed. Names that are identity stay.
- Every method has a physical reason. A detective never plays a game: each method is a real thing somebody left, kept or tried to destroy (a blotter that kept a note back to front, a page written in lemon juice, a torn receipt), and the play is what you would do with it in your hands. A method with no such reason is left out. The full list, 22 of them, is the sheet "Every method has a physical reason" on the prototype canvas.
- Evidence clears suspects. Every suspect is met in the brief and nobody new turns up at the end.
- The case board is what a player watches change. It is a pinboard: photos, notes and thread. It opens nearly empty on the brief, gains a pin for each step solved, shows the cleared suspects taped over at the line-up, and reads "Solved" at the end. Threads are dotted until something is proved.
- The opening board is different in every case. What is pinned on it comes from the chapter: the thing that is missing, the note about where and when, who the suspects are and how many, and what was left behind. A "prove it" opens on 1 face and an alibi. A "where is it" opens on a map with no faces. A "what is it really" opens on a blurred photo of the thing people saw. No 2 cases open on the same arrangement, so a new case never looks like the last one.
- The lead is given, the clearing is earned. Finishing a step always gives its lead, so the trail never stops and nobody is locked out. Clearing a suspect needs 2 stars or more, and a step can be played again to earn it. Why: feeling able is what brings players back, more than rank does (`INSIGHTS.html`, principle 6), and nothing may lock a player out.
- Backup is not a second currency. Every case comes with 1 favour. It is not earned, not saved, not carried to the next case and never sold. A tip-off costs what a hint costs, and calling a friend in is free. Why: one currency was a rule learned from games whose economy nobody could explain, and each extra thing to count costs more attention than it returns (`INSIGHTS.html`, principle 3).
- The Open Eye stays masked. Every 5 cases closed gives 1 fact about it, and no case ever names it. Why: an answer that is always one step off holds people more than one that is handed over (`INSIGHTS.html`, principle 4).
- Chapters are written by us, one file each in `design/stories/`, and `checkChapter` (`src/engine/chapter.ts`) refuses one that is not a fair fight. The first is The long spoon. A pack with no chapter is not a case: it is practice (section 4).
- A chapter is plotted backward from the culprit's evening: what they needed, what they touched, what they tried to destroy, what they forgot. Every clue is a thing somebody kept for their own reasons, and every clue is used. A suspect may lie, for a reason of their own that a record then shows. The motive is human and nobody judges it: the ending says what was found, what the culprit says and what is still undecided. Why: the stories people call machine-made are tidy, run on 1 track, explain their own point and never let a choice be hard, and the mysteries readers throw down have a culprit with no reason, a clue kept back or an answer reached by luck (`INSIGHTS.html` section 11, Knox's rules, and the reading of 12 Oct 2026).
- A story is for players anywhere. Names, food, money and places in a chapter are ones a player in Lagos, London or Lima reads without a footnote, and a cast is mixed. Home ground is its own thing: the Naija packs and Pidgin are offered as that, by name, never as the default voice of the game.
- No dailies. The concept is gone, not hidden: cases are the anchor of the game, and nothing a player sees, earns or is reminded of is a daily. What is left to take out is in set 4a.
- What brings a player back is the calendar. After the first cases, the cases down the line are written for a season, a celebration or a holiday, and open on their date for everybody.
- A seasonal chapter dresses the path, and a season arrives slowly: its dress starts faint on a set date and thickens toward the day, then clears the day after it ends. Snow starts faintly on 1 December. The seasons and what each one brings are the table in section 5. Dress is drawn, never a photo, never over a board being read, and off under reduced motion.
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

## How the cases are structured

The reasons for each line are in `INSIGHTS.html` section 12. This is the structure they give.

| Level | What it is | Size | On screen |
|---|---|---|---|
| Casebook | A place and its cases, with a thread behind them | 8 cases | A named banner on the path, and its own look |
| Case | 1 story: something was taken, hidden or faked | A brief, 5 to 7 steps, the line-up, the ending | A file on the path, showing its board |
| Step | 1 sitting on 1 piece of evidence | 2 to 4 minutes | A mark on the case, a screen of its own |
| Interlude | 1 message to the Open Eye, intercepted between cases | 1 sitting | A small mark on the path between 2 cases |
| Cold case | A closed case, worked again with no tip-offs | The same case | A gold seal on its file |
| Practice | Drills: the old word packs | As many as a player likes | A shelf at the foot of Cases, off the path |

The rules:

- 1 path. Cases, interludes and the next thing to do are on it in order, and the Play button opens the next one. Nothing a player needs is in a menu. A player never chooses what to do next unless they want to.
- Every case has the same bones: brief, steps, line-up, ending. What changes is its shape, its methods and its story.
- A case has all 3 kinds of work: finding, reading and weighing. Until the methods for finding and weighing are built, a case has the 2 it can.
- 1 new method a case, at most. It is met alone and easy, with nothing to lose. It comes back in each of the next 2 cases, mixed with older methods and harder. A method has 3 levels: plain, mixed, hard. No case is all 1 method.
- Inside a case, 4 beats: a method is met plain, then harder, then with a twist (a suspect who lied, the obvious one cleared), then the line-up tests the whole case.
- Most cases stand alone. In a casebook of 8, the 4th and the 8th carry the Open Eye. A player who misses a week loses nothing, and the 8th is worth reaching.
- Each case leaves 1 loose end, and it is the first line of the next brief.
- A sitting ends on a step with a lead, and the board shows everything found. We do not count on a player remembering where they were.
- Guessing is pointless, never punished: whoever the evidence cleared cannot be named, the line-up has 2 tries, and then the mask comes off anyway.
- 1 score: stars. A step read clean with no tip-off is 3. We do not add a second count.
- A step exists because the case needs its fact. One that could be lifted out without the case changing is cut.
- Cadence: 1 new case a fortnight, said out loud, so a player knows when to come back. A seasonal case opens on its date beside the path and never blocks it.
- Shapes rotate: no 2 cases next to each other have the same shape, and no 2 next to each other have the same number of suspects.

Casebook 1, as a proposal. Titles and stories are the owner's to change. Each is plotted backward and passed by `checkChapter` before it is built.

| # | Case | Shape | Suspects | New method | Work |
|---|---|---|---|---|---|
| 1 | The long spoon (written) | Who did it | 4 | The line-up | Reading |
| 2 | A case with no thief | Nothing was taken | 2 | Which account fits | Reading, weighing |
| 3 | A case where we know who | Prove it | 1 | Could it be done | Reading, weighing |
| 4 | The first Open Eye case | Where is it | 3 | Walk it back, the trail | Reading, weighing |
| | Interlude: an intercepted message | | | | Reading |
| 5 | A haunting that is not one | What is it really | 3 | Sweep the room (the first drawn room) | Finding, reading, weighing |
| 6 | A case with 2 accounts and no witness | Who did it | 2 | The missing step | Finding, weighing |
| 7 | A case about a forged thing | Prove it | 1 | The torn page | Finding, reading, weighing |
| | Interlude: an intercepted message | | | | Reading |
| 8 | The Open Eye case that closes the book | Who did it | 5 | None: every method so far | Finding, reading, weighing |

What this asks of the build, in order: the path shows a casebook (set 4e), the second case is written with its new method (set 1i-d), the packs move to practice (set 4c), interludes (set 1e), cold cases (after casebook 1 is out).

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
- [ ] Decide: what is sold to a church, a school or a wedding now. The price list sells a puzzle on the buyer's subject, which is a word hunt. It can stay that (sold as a drill, or a message hidden for the guests) or become a short case written for them, which costs more to make.
- [ ] Decide: the 25 packs, one by one (set 4d). Suggested: chapters for the first 3 on the path and the 4 Naija packs, practice for the rest, and retire what reads badly.
- [ ] Read The long spoon (`design/stories/the-long-spoon.json`) and say what is wrong with it before 1c is built on it. It is told on Market day (`fruits`): confirm or move it.
- [ ] Read casebook 1 ("How the cases are structured") and change what is wrong: the 8 cases, their shapes, and the name of the place they share. Say yes or no to 1 case a fortnight.
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
- [ ] The dates of the moving seasons for the year ahead, for `data/holidays.json`: Lunar New Year, Easter, Ramadan and Eid, Diwali.
- [ ] Decide: which seasons a player sees by default. Suggested: the ones the whole world shares the weather or the date for (New Year, spring, summer, harvest, December snow), and the rest by where the player is or what they choose.
- Still under the old name until the domain exists: fignda.pages.dev, the Cloudflare projects `fignda` and `fignda-api`, the local Supabase project id, the database functions `fignda_day_no` and `fignda_score`.

## To build, in sets

One set at a time. Each set is small, works on its own and leaves the live game whole. After each set: lint, typecheck, unit tests and the browser tests pass, the work stops, the owner tries it and pushes, and only then does the next set start. A set that turns out too big is split, not rushed.

Rules for every set: write it into `SPEC.md` first. Engine work is pure TS with unit tests, and the UI never re-implements matching. Every line comes from `src/copy` pools. Scores on existing boards do not change. Read `SECURITY.md` before data, auth or Worker work. Motion follows `SPEC.md` section 8 (from <https://github.com/emilkowalski/skills>). A list, board or section that can be empty or fail to load says so with the player's pet (`<PartnerNote>`, `SPEC.md` section 4): large and centred when the empty state is the screen, small beside the line inside a busy one, one pet a screen. Anything that loads ships with its skeleton (`SPEC.md` section 4, Skeletons): a new screen, section or component gets a matching one in the same set, with a row in the table there, and a set that changes a layout changes its skeleton.

### 1. The case, worked like a detective (next)

Build in this order. The aim of 1c to 1g is one thing: The long spoon played from its brief to its ending, by a new player, on a phone. Each set leaves the live game whole: a case with no written chapter keeps today's flow until section 4 moves it.

- [ ] **Set 1c. Photos on the board.** Photos for `item` pins replace the icon when the photo store exists (set 1i).
- [ ] **Set 1e. The Open Eye file.** Every message to the Open Eye that a player has read is filed in one place, and the file grows across cases and across days: a case's notice, and each day's intercept with its fact. The texts of The long spoon are written and pass the engine (`design/stories/the-long-spoon.json`).
- [ ] **Set 1g. 5 people play it.** The long spoon is played by 5 people who have never seen the game, and what stops them is fixed. This no longer holds the second case back: the owner has asked for cases to be the game now, and 1 case is not a game.
- [ ] **Set 1h. Call for backup.** On any step: a tip-off from the pet, a friend called into the step, or the case's 1 favour.
- [ ] **Set 1i. New methods,** one a set, engine first, in this order: spot what is off (a drawn scene, the first method of set 1i-c), the torn page, 4 pictures and 1 word (real photos, with the photo store and the credits page it needs), invisible ink, rub the pad, ink not word, what stood here. No clock on any of them. The rest are on the canvas sheet. "Bigger tag" is left out: nothing in a real case asks for it. The long spoon uses 3 methods because 3 are built. Each new one is first used in a chapter, never shipped by itself.
- [ ] **Set 1i-b. Walk it back** (the memory palace, or method of loci: things are remembered by where they stood along a route). 2 forms, engine first, no clock on either.
  - The room, seen once. The physical reason: the scene was tidied before anybody photographed it, so the only record is the walk the detective took through it. The player walks a drawn room in a fixed order (door, shelf, window, table) with 1 thing at each stop, turns away when they choose, and then puts each thing back where it stood, or taps the stop where something is now missing or new. What was moved is the lead.
  - The trail, before the line-up. The places of the case are the stops: store room, night stall, bakery, gate, notice board. The finds are handed back out of order and the player pins each to the place it was found. It is the case told once more in 30 seconds, and it is the only step made of the chapter itself, so it needs nothing written.
  - A stop holds 1 thing, a room holds 4 to 6, and a tip-off puts 1 thing back. Wrong places cost nothing but a star: nobody is locked out.
  - On screen it is "Walk it back", never "memory palace", "memory" or "recall". We promise the practice, never a result (Direction), and a method that says it trains memory breaks that promise.

- [ ] **Set 1i-c. Search the scene.** Finding the clues, not being handed them. A drawn room, no clock, and a tip-off points at a quarter of the room, never at the thing. Built one at a time, engine first:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| Sweep the room | Searchers work a room in lanes or quarters so nothing is passed over | Tap everything that could matter among ordinary things. 5 to 7 are evidence, the rest are the room | 1 drawn room |
| By torchlight | The power is off, or it is night | Move a circle of light over a dark room and tap what it shows | The same room, dimmed |
| Look under it | Things are hidden where nobody dusts: under the rug, behind the frame, in the back of a drawer | Lift, slide and open. Each thing moved shows what was behind it | Layers in the drawing |
| Bag and tag | Evidence is useless until it is sorted by what it answers | Each thing found goes in 1 of 3 bags: how, why, when. A wrong bag costs nothing but a star | Nothing drawn: the finds of the case |
| What does not belong to the room | A scene holds what the visitor brought and forgot | Among the things found, pick the 1 that nobody who lives or works here owns | The finds, and 1 line on who uses the room |

- [ ] **Set 1i-d. What could have happened.** Weighing scenarios. A detective holds more than 1 account at once and lets evidence rule them out: fixing on the first one is how real cases go wrong (`INSIGHTS.html` section 11, rule 3). Most of these need no drawing, so they are the cheapest new methods in the plan:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| Which account fits | 3 people tell the evening 3 ways. Only 1 can be true | Read 3 short accounts. Each piece of evidence already found strikes out 1. Name the one left standing | Words only |
| Could it be done | A claim has to survive the tape measure and the clock | Check a claim against 2 facts: a window 40 cm wide and a thing 90 cm long, or 12 minutes for a 20 minute walk. Say possible or not, and which fact decides it | Words and 2 numbers |
| The missing step | A chain of events has a gap, and only 1 thing can fill it | 4 events in order with 1 blank. Pick, from 3, the event that must have happened in between | Words only |
| Which came first | Traces lie on top of each other: a dry print under a wet one, dust over a ring | Put 3 or 4 traces in the order they were made | Small drawings of traces |
| Walk it through | A route has to fit the building and the time | On a floor plan, lay the path from where they were seen to where the thing was. A path through a locked door, or one too long for the time, is refused | 1 floor plan |
| Line of sight | A witness can only have seen what was in view | On the plan, from where the witness stood: could they have seen it? Tap what blocks the view, or say nothing does | The same floor plan |
| Who could reach it | Means is physical: a shelf has a height and a person has a reach | The hook is 2.1 m up. Set each suspect against it, with or without the step ladder that was found | Words and numbers |

- Rules for both sets. No clock on any of them. Nobody is harmed in a scene: no blood, no weapons, no body, and a room is searched for a thing that was taken or hidden. A scenario is never a trick: every fact a method uses is on the board first. A wrong answer costs a star and never the lead.
- Order: Which account fits, Could it be done and The missing step first, because they need no art and they give a chapter its third kind of work at once. Then Sweep the room, which needs the first drawn room. The second chapter is written to use at least 1 method from each set.
- `checkChapter` learns each method as it is built, and then asks a chapter for all 3 kinds of work.
- [ ] **Set 1j. The other 4 shapes,** one written chapter each, each plotted backward and passed by `checkChapter`, which learns each shape's ending as it comes.
- Later, once those are being played: Liar, Relay, Number series, Bury it.

### 2. Sell now

- [ ] **Set 2a.** A one page pitch with the price list.

### 3. Pets

- [ ] **Set 3m. Pet outfits.** A pet can wear things: a row of outfits per pet on You, tried on the stage like gear, drawn for all 4 pets in every mood. A few are earned, the rest are bought once Paystack is in. Cosmetic only. Needs the art first.

### 4. From a word game to a detective game

The path, the daily, Make and the words on screen were built for a word game. This section moves each one. Nothing a player earned is lost: stars, scores, records and badges stay as they are.

- [ ] **Set 4h. Nothing is anchored on the word game.** The owner's word, 13 Oct 2026: remove the concept of the game being anchored on the old word game format. Records are off You. Left, in this order: (1) the landing page and the first minute lead with a case and a board, not a sentence with words hidden in it; (2) Cases is the cases: the path of 25 word packs moves to a practice shelf (set 4c) and no longer reads as the game; (3) a result speaks of what was learned, never of words found, time and score, outside practice; (4) the share card of a pack, its records, and the result lines about long words and rare finds go with the packs to practice; (5) the profile shows cases closed, medals and the run, never puzzles played and words found.
- [ ] **Set 4a. No dailies, anywhere.** The owner's word: remove the concept completely, cases are the anchor. Done: no screen, link, reminder or search page offers a daily, `/d/N` and its answers open Cases, Ranks is the case board, and the run, friend streaks, points and badges count steps and clues on the server. Left, in passes that each leave the game working: (1) what a player can still read: a circle's table (it shows the last dailies: it becomes the case board for its members, which needs `chapter_board` to take a circle), a profile's "Last 14 dailies" and its daily counts, the "Perfect daily" badge, and the words daily or dailies in Privacy, Squad and sign in; (2) the code nobody can reach: the daily's branch of the game screen, its share card and text, its copy pools (`wrongDaily`, `doneToday`, `recordDaily`, `interceptBrief`, `interceptFact`), its records, and `src/games/daily.ts`; (3) the server: `/api/plays` stops taking a daily and the daily's own endpoints go, while its rows are kept so no score or badge is lost; (4) the tests of all of it. `dayNo` stays: it is the calendar a run is counted on, not the daily.
- [ ] **Set 4b. The words on screen.** Every "puzzle", "game", "word game" and "find N words" a player reads is checked against the direction: the landing, the first minute, share text, the SEO pages. Reminders and the end of day line already say intercept. A case is a case, a sitting is a step, and a pack is practice. The search pages keep the words people search for until the numbers say what brings players in.
- [ ] **Set 4c. Practice.** A shelf off the path for packs with no chapter, named as what they are in the story: drills the Open Eye sets its pupils. A drill has no culprit, no secret and no unmasking, so the 14 culprits stop repeating. It keeps its stars and its room.
- [ ] **Set 4d. The 25 packs are sorted,** one at a time: rewritten as a chapter, moved to practice, or retired. The 3 a new player meets first and the 4 Naija packs get chapters first. The read against `PUZZLE_STANDARD.md` happens here (`giveaways` flags bible, bnote, broad, nigeria, bpeople, world, afrobeats, eagles). A pack that reads badly is rewritten or retired, never just moved.
- [ ] **Set 4e. The path is a casebook.** Cases shows casebook 1 under its banner: each case a file with its board, its steps as marks, and what is next lit. A case not yet written shows as a closed file with the date it opens. Closed cases fold. Interludes sit between cases as small marks. Practice is a shelf at the foot. Sums and Mirror clues stop being added to a pack by rule: a method is in a case because its chapter put it there.

### 5. Seasonal cases

These replace the daily as the reason to come back. A case here is a written chapter like any other (`design/stories`, `checkChapter`), told for players anywhere, and tied to a date.

- [ ] **Set 5a. The case archive.** A place for cases that are not on the path. Empty until 5b.
- [ ] **Set 5b. One holiday case.** It opens on the date for everyone, beside the path, 3 to 5 clues, and never blocks the player's own case. After the date it moves to the archive and its outfit piece and badge can still be earned.
- [ ] **Set 5c. Seasonal dress** for the path, the dock and avatars, from `data/holidays.json`. One season at a time, each with its own things, a ramp and an end. Drawn, never over a board, off under reduced motion. The first to build is the one whose date comes next.

| Season | When | On the path | How it arrives |
|---|---|---|---|
| New Year | 31 Dec to 2 Jan | Paper streamers, a clock at 5 to 12, sparklers | Streamers from 29 Dec. The clock strikes on the night |
| Lunar New Year | Its date, and the 2 weeks after | Red lanterns, paper cuttings, red envelopes | 1 lantern a day until the path is lit |
| Valentine's | 14 Feb | Paper hearts, sealed envelopes, a ribbon. Cards between friends: no romance in a case | Envelopes from 10 Feb |
| Spring | March and April | Blossom on the branches, a kite, puddles | Buds first, then blossom, then petals on the ground |
| Easter | Its weekend | Painted eggs half hidden beside the path, lilies, a basket | 1 more egg a day through the week before |
| Ramadan and Eid | The month, then Eid | A crescent that fills night by night, lanterns, dates on a plate | The moon is the ramp. Lanterns are all lit on Eid |
| Children's Day | Its date where the player is | Balloons, chalk drawings on the path, a paper crown | The day only |
| Summer | June to August | Bunting, an ice cream cart, long shadows | Bunting first, then the cart |
| Harvest | Late September to November | Falling leaves, baskets of corn and yams, a scarecrow | A few leaves, then drifts of them |
| Diwali | Its 5 days | Clay lamps along the path, rangoli underfoot, marigolds | 1 more row of lamps each evening |
| Halloween | 31 Oct | Pumpkins, a bat, paper ghosts on a string, sweets. Playful, never frightening | 1 pumpkin from 25 Oct, a patch by the day |
| Christmas | December | Snow, gift boxes, a manger, a wreath, lights on a string | Snow starts faintly on 1 Dec and thickens. Gifts from 18 Dec. The manger on the 24th |

- A season with a moving date (Lunar New Year, Easter, Ramadan and Eid, Diwali) takes its dates from `data/holidays.json`, set a year ahead by the owner, never worked out in the browser.
- A season that belongs to one country or one faith is offered, never forced: it shows where the player is or where they chose, and Settings can turn dress off. Somebody who does not keep Christmas still gets snow in December and no manger.
- Nothing in a season is for sale or timed out: a case opened in its season can be finished after it, and moves to the archive (set 5a).
- [ ] **Set 5d. The rest of the calendar,** one case at a time, each with its dress from the table above, in the order their dates come. A national day (Independence Day and others) is written only where there are players to play it.

### 6. Make, one feature
This is somewhat redundant though, given the game has changed to Detective type "Cases"
In the story, Make is a player writing a message that hides words in plain sight, as the Open Eye teaches: a drill for their circle, filed with practice (set 4c). It is never called a case, because it has no suspects and no evidence. "Any topic" goes away. It is Make with the system making the choices the player did not make. Engine and server parts exist: `hideForMe`, `topicIcon`, `giveaway`, `safetyCheck`, the job endpoints.

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

- [ ] A medal shared as a picture: a card with the medal, the player's detective and their name, drawn as the share cards are. Today a medal is shared as a line of text and a link.
- [ ] Read every screen against "show it, do not caption it" and take out the lines that explain: the stage on You ("Detective X is with you. New kit at 3."), Settings, Squad, the first minute.

- [ ] Pick dailies from the `daily_candidates` view. Nothing reads it yet.
- [ ] Usage per feature per week from the database. Under 2% of weekly players after a month moves behind "More".
- [ ] A public list of player-made puzzles.
- [ ] Reminders by email, once SMTP is set.
- [ ] Later, once there are players to help: a help centre on GitBook (how a case works, tip-offs, circles, the account, privacy), linked from Settings and the footer. Advised to the owner. Check its free plan and whether it can sit on our own domain first.
- [ ] Later, with it: email sequences on Loops, to teach a new player the game a little at a time (the first case, the daily, a circle, a pet). Advised to the owner. It needs the domain and a yes from the player at sign up, it is a new company that receives email addresses, so the privacy page names it, and every email has a way out. No guilt and no word about what would be lost, as in reminders.
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
- A written chapter's suspects are drawn from the 14 culprits (`culpritWho`), so chapters share faces until more are drawn.
- There are 14 culprits (`culpritWho`), so a player who closes many cases learns the names. The list cannot simply grow: a case finds its culprit by position in it, so adding one changes who the culprit of old cases is.
- A clue's popup shows in this browser at the finish only. A clue finished on another device shows its result with no popup.
- A following board shows your own row only when it is among its rows: your place among the people you follow is not worked out by the server.
- Personal records are kept in the browser, from 9 Oct 2026 on. Stars and closed cases are on the account from 10 Oct 2026; a guest's are in the browser until they sign in.
- A guest's clues move to the account on sign in with their stars but no points: only a clue played signed in is checked and scored. A points badge earned by a clue shows after the next whole puzzle or daily.
- A guest's place on today's board is worked out from a score the browser sent, so it is a guide, never a rank.
- An unfinished puzzle is kept in the browser it was played in, not on the account: a second device starts clean. Safari clears a site's stored data after 7 days without a visit, so a guest there can lose a kept game, a run and their stars.
- The sponsor report's games and shares are counted in the browser from 10 Oct 2026, guests included, and are not checked by replay: anyone can push one up, 240 an hour per address. A deleted account leaves them and comes out of the signed in players.
