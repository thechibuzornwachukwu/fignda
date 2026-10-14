# Build plan

What is left for Lantern Row, in sets that ship one at a time. What is built is in `SPEC.md` and git history. Lantern Row was split out of Gazecraft on 14 Oct 2026: the puzzle game lives on in `../puzzles`, with its own account, site and plan.

Deploy, once the backend exists: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.

## Direction

- This is a detective game. It began as a word game, and hidden words is now 1 method among several, never the game.
- Offer: a few minutes of real detective work, in place of scrolling. Something is hidden in plain sight. Look closer and uncover it.
- One skill in every game: looking closely. Each method is a way of looking: at words, numbers, pictures, a room, a torn page.
- A case is worked the way a detective works one: a brief, the scene, then steps that each end on a lead to the next, then the line-up. A step is one short sitting. The reasons are in `INSIGHTS.html` section 9, and the screens are in the prototype canvas "Gazecraft case storyline" (<https://claude.ai/artifact/Rif6VsH8K4MdDTBXSHSSF4>).
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
- A chapter is plotted backward from the culprit's evening: what they needed, what they touched, what they tried to destroy, what they forgot. Every clue is a thing somebody kept for their own reasons, and every clue is used. A suspect may lie, for a reason of their own that a record then shows. The motive is human and nobody judges it: the ending says what was found, what the culprit says and what is still undecided. Why: the stories people call machine-made are tidy, run on 1 track, explain their own point and never let a choice be hard, and the mysteries readers throw down have a culprit with no reason, a clue kept back or an answer reached by luck (`INSIGHTS.html` section 9, Knox's rules, and the reading of 12 Oct 2026).
- A story is for players anywhere. Names, food, money and places in a chapter are ones a player in Lagos, London or Lima reads without a footnote, and a cast is mixed. Home ground is its own thing: the Naija packs and Pidgin are offered as that, by name, never as the default voice of the game.
- What brings a player back is the calendar. After the first cases, the cases down the line are written for a season, a celebration or a holiday, and open on their date for everybody.
- A seasonal chapter dresses the path, and a season arrives slowly: its dress starts faint on a set date and thickens toward the day, then clears the day after it ends. Snow starts faintly on 1 December. The seasons and what each one brings are the table in section 5. Dress is drawn, never a photo, never over a board being read, and off under reduced motion.
- Chapters differ. A chapter takes 1 of 5 shapes (who did it, prove it, what is it really, where is it, nothing was taken) and draws 5 or 6 methods to suit it.
- Pictures are mixed by what they are for. Things a player examines are real photos: the item in the brief, the 4 pictures, a close-up of evidence. People are always drawn: suspects, the culprit, pets, the player. No photo of a real person, ever. A room that is searched is drawn, because every out-of-place thing in it is put there by hand.
- Photos are free to use and say so. Public domain and CC0 first, then CC BY and CC BY-SA with the credit they ask for. Each photo is stored with its source, its author and its licence, and the game has a credits page. No recognisable person, logo or brand name in any of them. Wikimedia Commons first for home subjects.
- A new culprit each case, an ordinary character under a disguise. One unseen figure links the cases, the Open Eye: every culprit leaves its card, and it teaches people to pass messages in plain sight. That is why words are hidden at all. A case's hidden-words step is a message to the Open Eye, intercepted.
- The player has a pet that comes along on every case: Detective X (the cat), Detective Tobs (the dino), Detective Puff (the dog) and Agent 404 (the robot). Any of the 4, free, picked in Settings.
- Tone: the motive is mischief, pride or a surprise, never harm. No violence, gangs, weapons, romance or fear.
- For all ages, not a children's product. Accounts from 13. Younger players join on a parent's device or room.
- We promise the practice, never a result. No word about memory, attention span, focus, IQ, brain training or "proven". Lumosity paid $2 million for claims like those.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- A guest plays as a guest. With sign in set up, 2 steps, then sign in. The account keeps the stars and puts a player on the board.

## How the cases are structured

The reasons for each line are in `INSIGHTS.html` section 10. This is the structure they give.

| Level | What it is | Size | On screen |
|---|---|---|---|
| Casebook | A place and its cases, with a thread behind them | 8 cases | A named banner on the path, and its own look |
| Case | 1 story: something was taken, hidden or faked | A brief, 5 to 7 steps, the line-up, the ending | A file on the path, showing its board |
| Step | 1 sitting on 1 piece of evidence | 2 to 4 minutes | A mark on the case, a screen of its own |
| Interlude | 1 message to the Open Eye, intercepted between cases | 1 sitting | A small mark on the path between 2 cases |
| Cold case | A closed case, worked again with no tip-offs | The same case | A gold seal on its file |

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
- Nothing is gated by time. A case is open when the one before it is closed, and never by a date. We add about 1 case a fortnight, and a seasonal case opens on its date beside the path and never blocks it.
- Shapes rotate: no 2 cases next to each other have the same shape, and no 2 next to each other have the same number of suspects.

Decided on 13 Oct 2026, by the owner's leave ("make the right choices"). Each can still be changed, and a case is only fixed once it is written.

- The place: Lantern Row. A market street with a hall behind it, a bakery, a bus stop, a library and a row of houses. It is nowhere in particular, so a player anywhere can stand in it. Casebook 1 is called Lantern Row, and every case in it happens there. A new casebook is a new place.
- The cast returns. The 14 characters the game can draw live on Lantern Row. A suspect cleared in 1 case can be a witness in the next and a suspect again later, so a player comes to know the street. Nobody is the culprit twice in a casebook.
- The pace is the player's. Every case that is written is open, in order, and nothing waits for a date. A player may close a case in an evening or the whole casebook in 3 days, with tip-offs or without, and that is a good outcome, never a problem to prevent. No timer, no daily cap, no wait between cases, as Duolingo's path is all there and a learner goes as fast as they like.
- A fortnight is how fast we write, not how fast anybody plays. We expect a step or 2 a day, which is a case in about 4 days and the casebook in about 5 weeks, and we plan for a player who goes 3 times that fast.
- Casebook 1 is the game: all 8 cases are written and open. A date is given only for a case already written and checked.
- What a player finds at the end of what is written, so the game never just stops: (1) cold cases: any closed case again with no tip-offs, for a gold seal; (2) practice: the drills; (3) a seasonal case, when one is open; (4) the next file on the path, closed, with "Tell me when it opens" and no date unless it is written. Their run goes on: a step of a cold case or a drill counts as a day.
- Nothing bought makes a case faster or easier. A tip-off costs points earned by playing, and points are never sold for it (Revenue: never for sale). What a player can buy is how their detective and their pet look.
- Art never blocks the path. Case 5 needs the first drawn room. If the room is not ready, case 6 is released in its place and case 5 follows: both are written to stand in either slot.
- The 2011 question runs through the book. The long spoon leaves it open whether a name was planed off fairly. Case 4 finds the record of that year, and case 8 reads it. It is the thread a player follows, and the Open Eye is behind it.

Casebook 1: Lantern Row. The premise of each case is 1 line and is where its writing starts, not a script. Each is plotted backward and passed by `checkChapter` before it is built.

| # | Case | Shape | Suspects | New method | Premise | The loose end it leaves |
|---|---|---|---|---|---|---|
| 1 | The long spoon (written) | Who did it | 4 | The line-up | The prize spoon is gone from a locked cabinet the night before the 20th final | The committee must vote on whether the 19th name stays |
| 2 | The open box (written) | Nothing was taken | 2 | Which account fits | The morning after the vote the ballot box is found unsealed, with every vote in it | 1 card in the box is not a vote: it has an open eye on it |
| 3 | The early bus (written) | Prove it | 1 | Could it be done | The last bus left 9 minutes early on the night of the final. The driver says the hall clock was fast | Somebody showed him the clock can be set from outside |
| 4 | The year that is missing (written) | Where is it | 3 | Walk it back, the trail | The hall's minute book for 2011 is gone from its shelf in the library | It is found with the page uncut. Reading it waits for case 8 |
| | Interlude: The bookmark (written) | | | | A message to the Open Eye, found in the returned book | |
| 5 | The light in the hall (written) | What is it really | 4 | Sweep the room | A light moves about the locked hall at night, and the street has decided it is haunted | Whoever it was had a key nobody signed for |
| 6 | The 2 signs (written) | Who did it | 2 | The missing step | 2 stalls wake to each other's signs on market day, and each owner blames the other | Both signs were repainted by the same hand |
| 7 | The other spoon (written) | Prove it | 1 | The torn page | A second Long Spoon turns up for sale, with all 20 names on it | The seller was sent the list of names by post |
| | Interlude: The envelope (written) | | | | The envelope the list came in | |
| 8 | Who carries the cards (written) | Who did it | 5 | None: every method so far | 7 cases, 7 cards with an open eye. 1 person on Lantern Row has been handing them out | The page from 2011 is read. The Open Eye itself is not named |

Suspects run 4, 2, 1, 3, 4, 2, 1, 5, so no 2 neighbours match, and the shapes run through all 5 before any repeats twice.
What this asks of the build, in order: Lantern Row is written and open, all 8 cases and both interludes, with the Open Eye file and cold cases. Next: cold cases and interludes kept on the account, "Tell me when it opens" on the next casebook once the reminder keys are set, badges worth unlocking (set 5e), and casebook 2 once the owner has decided its place.

## To build, in sets

One set at a time. Each leaves the live game whole. After each: lint, typecheck, unit tests and the browser tests pass.

### 0. Before launch

- [ ] Owner: create the Supabase project, link it (`npx supabase link`), push the 1 migration, and put its URL and anon key in `.env.production.values`. Until then the site is guest only and Ranks leads to Cases.
- [ ] Owner: confirm the Cloudflare names, `lantern-row` (Pages) and `lantern-row-api` (Worker), then `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.toml`.
- [ ] Owner: the name. Lantern Row is a working name.
- [ ] A logo. Until then the header shows the name as text and the favicon is an eye.
- [ ] Custom SMTP so sign in emails carry a 6 digit code, and Google sign in.
- [ ] Read every case in `design/stories` as a player would, and say what is wrong.

### 1. The case, worked like a detective (next)

Build in this order. The aim of 1c to 1g is one thing: The long spoon played from its brief to its ending, by a new player, on a phone. Each set leaves the live game whole: a case with no written chapter keeps today's flow until section 4 moves it.

- [ ] **Set 1c. Photos on the board.** Photos for `item` pins replace the icon when the photo store exists (set 1i).
- [ ] **Set 1g. 5 people play it.** The long spoon is played by 5 people who have never seen the game, and what stops them is fixed. This no longer holds the second case back: the owner has asked for cases to be the game now, and 1 case is not a game.
- [ ] **Set 1h. Call for backup.** On any step: a tip-off from the pet, a friend called into the step, or the case's 1 favour.
- [ ] **Set 1i. New methods,** one a set, engine first, in this order: 4 pictures and 1 word (real photos, with the photo store and the credits page it needs), invisible ink, rub the pad, ink not word, what stood here. Sweep the room (case 5) and the torn page (case 7) are built. No clock on any of them. The rest are on the canvas sheet. "Bigger tag" is left out: nothing in a real case asks for it. The long spoon uses 3 methods because 3 are built. Each new one is first used in a chapter, never shipped by itself.
- [ ] **Set 1i-b. Walk it back, the room** (the memory palace, or method of loci). The trail is built (`SPEC.md` section 6). Left: the room, seen once. The physical reason: the scene was tidied before anybody photographed it, so the only record is the walk the detective took through it. The player walks a drawn room in a fixed order (door, shelf, window, table) with 1 thing at each stop, turns away when they choose, and then puts each thing back where it stood, or taps the stop where something is now missing or new. What was moved is the lead. A room holds 4 to 6 things, and a tip-off puts 1 back. No clock. On screen it is "Walk it back", never "memory palace", "memory" or "recall". Needs the first drawn room.

- [ ] **Set 1i-c. Search the scene.** Finding the clues, not being handed them. A drawn room, no clock, and a tip-off points at a quarter of the room, never at the thing. Built one at a time, engine first:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| By torchlight | The power is off, or it is night | Move a circle of light over a dark room and tap what it shows | The same room, dimmed |
| Look under it | Things are hidden where nobody dusts: under the rug, behind the frame, in the back of a drawer | Lift, slide and open. Each thing moved shows what was behind it | Layers in the drawing |
| Bag and tag | Evidence is useless until it is sorted by what it answers | Each thing found goes in 1 of 3 bags: how, why, when. A wrong bag costs nothing but a star | Nothing drawn: the finds of the case |
| What does not belong to the room | A scene holds what the visitor brought and forgot | Among the things found, pick the 1 that nobody who lives or works here owns | The finds, and 1 line on who uses the room |

- [ ] **Set 1i-d. What could have happened.** Weighing scenarios. A detective holds more than 1 account at once and lets evidence rule them out: fixing on the first one is how real cases go wrong (`INSIGHTS.html` section 9, rule 3). Most of these need no drawing, so they are the cheapest new methods in the plan:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| Which came first | Traces lie on top of each other: a dry print under a wet one, dust over a ring | Put 3 or 4 traces in the order they were made | Small drawings of traces |
| Walk it through | A route has to fit the building and the time | On a floor plan, lay the path from where they were seen to where the thing was. A path through a locked door, or one too long for the time, is refused | 1 floor plan |
| Line of sight | A witness can only have seen what was in view | On the plan, from where the witness stood: could they have seen it? Tap what blocks the view, or say nothing does | The same floor plan |
| Who could reach it | Means is physical: a shelf has a height and a person has a reach | The hook is 2.1 m up. Set each suspect against it, with or without the step ladder that was found | Words and numbers |

- How a room is drawn (learned from xiaohu-ip-studio and Comfyui-Anima-Wardrobe, 14 Oct 2026). The sketches are in `design/sketches`, each an `.html` drawing and its `.png`: the hall (case 5), the hall in layers, the floor plan of the hall, traces, the sale room (case 7) and the committee room seen once. 1 look for every room, never drifting: warm cream ground, ink line in 1 weight with a slight hand wobble, flat muted fills (terracotta, sage, dusty blue, ochre, wood), even light, no gradient, texture or blur. Lime is never in a drawing: it only marks what was found. Every thing in a room is locked or swappable: the evidence is fixed by the chapter, the ordinary things around it can change, and none may clash with it. The test: take the evidence out and the room no longer tells the story. Each drawing is checked by eye and redrawn when a thing reads as something else.
- Rules for both sets. No clock on any of them. Nobody is harmed in a scene: no blood, no weapons, no body, and a room is searched for a thing that was taken or hidden. A scenario is never a trick: every fact a method uses is on the board first. A wrong answer costs a star and never the lead.
- Built: Which account fits (case 2), Could it be done (case 3) and The missing step (case 6), in `SPEC.md` section 6. Sweep the room is built (case 5). The rest of set 1i-c follows, each on a room already drawn.
- `checkChapter` learns each method as it is built, and then asks a chapter for all 3 kinds of work.
- Later, once the 5 shapes are being played: Liar, Relay, Number series, Bury it.

### 3. Pets

- [ ] **Set 3m. Pet outfits.** A pet can wear things: a row of outfits per pet on You, tried on the stage like gear, drawn for all 4 pets in every mood. A few are earned, the rest are bought once Paystack is in. Cosmetic only. Needs the art first.

### 5. Seasonal cases

These are the reason to come back. A case here is a written chapter like any other (`design/stories`, `checkChapter`), told for players anywhere, and tied to a date.

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

- [ ] **Set 5e. Badges worth unlocking.** The owner's word, 14 Oct 2026: today's medals are 4 metal discs with a number on them, and they are not worth unlocking. Every badge is its own drawing, never the same disc with a different number, and a badge is collected in sets, as Duolingo's are:
  - The casebook: 1 badge a case, drawn from its story (the Long Spoon, the ballot tin, the bus clock, the green minute book, the 2 signs), and a large one for closing Lantern Row.
  - The methods: 1 for each way of looking the first time it is done clean (the blotter, the till roll, the trail, the accounts, the missing step).
  - The pets: Detective X, Tobs, Puff and Agent 404 each in a moment of their own, earned by closing cases with that pet beside you.
  - Cold cases: the gold seal of each case, in 1 set.
  - The seasons: 1 a season, from its things (a lantern, a pumpkin, a wreath), still earnable after the date.
  A badge not yet earned is its silhouette, so the set shows what is missing without a word. Unlocking one is a moment: it is drawn in, the pet reacts, and Share is 1 tap. Badges already earned on the server carry over to their new drawing. Drawn in the clean shapes of the cast, not in ink.

### 8. Data and privacy

- [ ] "Download my data" in Settings. Delete exists.
- [ ] How long play logs are kept, written into `SECURITY.md` and deleted by a job.

## Checks still owed

- [ ] On real phones: the dock on an iPhone Home Screen app, a step with the phone locked.
- [ ] Signed in screens on the live site with a real second account, once the backend exists.
- [ ] The numbers in `INSIGHTS.html` against primary sources before any goes on a public page.

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself.
- A step answered by picking (the accounts, a claim) played again is played knowing the answer, so its 3 stars can always be had. It scores no points, so no board moves.
- A case opens when the one before it is closed, by the stars in this browser. A player who closed case 1 on another device and is not signed in here finds case 2 shut.
- A cold case, its gold seal and an interlude read are kept in this browser only. A second device starts them again, and nothing about them is on the account or a board.
- The trail gives a find 1 pick. A player who taps the same stop 4 times finishes with 1 star and the lead.
- A written chapter's suspects are drawn from the 14 culprits (`culpritWho`), so chapters share faces until more are drawn.
