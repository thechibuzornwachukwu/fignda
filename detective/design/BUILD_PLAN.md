# Build plan

What is left for Lantern Row, in sets that ship one at a time, each leaving the live game whole. What is built is in `design/ACCOMPLISHED STUFF.md` (read it only when you need it) and in `SPEC.md`. How a case is written: `design/CASE_WRITING.md`. How the game flows: `design/flow.html` and `design/flow.jpg`.

Deploy, once the backend exists: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.

## Direction

- A detective game: a few minutes of real detective work, in place of scrolling. One skill in every case: looking closely.
- A case is a story first. The puzzles are made from it (`CASE_WRITING.md`), never the other way.
- A case is worked as a detective works one: a brief, the scene, then steps that each end on a lead to the next, then the closer.
- 4 kinds of work, and a case holds every kind that has a method built: finding what is there, reading what was left, talking to people, and weighing what could have happened.
- Every method has a physical reason: each is a real thing somebody left, kept or tried to destroy, and the play is what you would do with it in your hands.
- Nobody leaves clues on purpose. Evidence clears suspects. The lead is given, the clearing is earned.
- The case board is what a player watches change. It opens nearly empty, gains a pin a step, and no 2 cases open on the same arrangement.
- Chapters differ: 5 shapes (who did it, prove it, what is it really, where is it, nothing was taken).
- Pictures are mixed by what they are for. What a player examines can be a photo, free to use and credited. People are always drawn, never photographed. A room that is searched is drawn.
- The cast returns. A suspect cleared in 1 case can be a witness in the next. Nobody is the culprit twice in a casebook.
- A new culprit each case, an ordinary person under a disguise. The motive is mischief, pride or a surprise, never harm.
- The player is a detective, seen in their own coat (`CHARACTERS.md`), with a pet that comes along on every case: Detective X (the cat), Detective Tobs (the dino), Detective Puff (the dog) and Agent 404 (the robot).
- Nothing to learn before playing: no secret society, no code words, no term a player must be taught. A thing that needs a line to explain it goes.
- Your Notebook keeps everything found: every case, every clue, every person met, every lead, in 1 place.
- 1 thread runs through the book, and it is plain: somebody hands each culprit a card with a lantern drawn on it, and the card is left at the scene. Case 8 finds out who, and why: what they saw in 2011.
- A story is for players anywhere: names, food, money and places read without a footnote, and a cast is mixed.
- What brings a player back is the calendar: later cases are written for a season and open on its date.
- For all ages, not a children's product. We promise the practice, never a result.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- Nothing bought makes a case faster or easier.
- Answers stay hard to take: what a player has not solved yet is not in the page they downloaded (set 1d).

## How the cases are structured

| Level | What it is | Size | On screen |
|---|---|---|---|
| Casebook | A place and its cases, with a thread behind them | 8 cases | A named banner on the path |
| Case | 1 story: something was taken, hidden or faked | A brief, 5 to 7 steps, the closer, the ending | A file on the path, showing its board |
| Step | 1 sitting on 1 piece of evidence | 2 to 4 minutes | A mark on the case, a screen of its own |
| Cold case | A closed case, worked again with no tip-offs | The same case | A gold seal on its file |

The rules (the engine checks the ones marked *):
- 1 path. Every case has the same bones: brief, steps, closer, ending.
- Every kind of work that has a method built is in the case.*
- No method more than twice in a case.*
- 1 new method a case at most, after the first.*
- No 2 neighbouring cases share a shape or a number of suspects.*
- Inside a case: a method is met plain, then harder, then with a twist. The closer tests the whole case.
- Each case leaves 1 loose end, and it is the first line of the next brief.
- Guessing is pointless, never punished: whoever the evidence cleared cannot be named, the closer has 2 tries, and then the mask comes off anyway.
- 1 score a player keeps: stars. Points only order Ranks (`SPEC.md` section 9).
- A step exists because the case needs its fact. Nothing is gated by time.
- The 2011 question runs through the book: case 1 leaves it open whether a name was planed off fairly, case 4 finds the record, case 8 reads it.
- Art never blocks the path: a case waiting on a drawing swaps places with one written to stand in either slot.

Casebook 1: Lantern Row. All 8 cases are written and open.

| # | Case | Shape | Suspects | New method | The loose end it leaves |
|---|---|---|---|---|---|
| 1 | The long spoon | Who did it | 4 | Blotter, buried sums, hidden words, line-up | Does the 19th name stay |
| 2 | The open box | Nothing was taken | 2 | Which account fits | 1 card in the box is not a vote: it is the lantern card |
| 3 | The early bus | Prove it | 1 | Could it be done | The hall clock can be set from outside |
| 4 | The year that is missing | Where is it | 3 | Walk it back, the trail | The 2011 page, found uncut |
| 5 | The light in the hall | What is it really | 4 | Sweep the room, the missing step | A key nobody signed for |
| 6 | The 2 signs | Who did it | 2 | None | Both signs repainted by 1 hand |
| 7 | The other spoon | Prove it | 1 | The torn page | The seller was sent the names by post |
| 8 | Who carries the cards | Who did it | 5 | None | The card-giver is named, and the 2011 page is read |

At the end of what is written the game never just stops: cold cases, then a seasonal case when one is open, then the next casebook's file, closed, with "Tell me when it opens".

## To build, in sets

### 0. Before launch (owner)

- [ ] Create the Supabase project, link it (`npx supabase link`), push the 1 migration, and put its URL and anon key in `.env.production.values`. Until then the site is guest only and Ranks leads to Cases.
- [ ] Confirm the Cloudflare names, `lantern-row` (Pages) and `lantern-row-api` (Worker), then `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.toml`.
- [ ] The name. Lantern Row is a working name.
- [ ] A logo. Until then the header shows the name as text and the favicon is an eye.
- [ ] Custom SMTP so sign in emails carry a 6 digit code, and Google sign in.

### 1. Essentials: what a new player meets and an ad can show

In this order. Together they make case 1 something worth putting an ad on.

- [ ] **Set 1-map. Cases is the map of Lantern Row.** The drawn street (`design/sketches/the-street.html`), with each case a pin at its `where`: closed with a tick, a gold seal when worked cold, the open one lit, the rest dim. Inside a case, the places of its steps light up on the same map as they are worked, joined by a route drawn from place to place, and Your Notebook shows each case's route. A place off the street is reached down the road at the edge. The light theme is the street by day, the dark theme the same street at night: cream ink, the lamps and the hall clock lit (`--map-*` colours in the sketch, moved into `tokens.css`).

- [ ] **Set 1a. Every case from its story.** A story file for each of the 8 cases (`the-long-spoon.md` is the first), then each chapter file rewritten from it until the case is off the `OWED` list in `src/engine/chapter.test.ts`: 6 cases have no find work, and case 5 brings 2 new methods. With it, buried sums is made of the case's own figures (the till roll's real sales, the gate book's real cars) in place of a row the engine makes up.
- [ ] **Set 1b. Talking to people.** The talk kind (`CASE_WRITING.md` section 3), engine first: *Question them* (pick what to ask; a pin shown against what they said makes them say more; a question with no reason behind it ends the talk early) and then *Sit with them* (a real game or a meal: chess first, an endgame from a position they set, legal moves checked by a chess rules library chosen in this set for a licence that allows sale). Each first used in a chapter, and once built, every case needs talk work.
- [ ] **Set 1c. The player's detective.** Drawn to `CHARACTERS.md`: the proportion sheet, then the face and fixed parts, then the outfit layers, then the suspects redrawn on the same figure. Replaces the round avatars in `src/avatar`. Shown on the path, the ending and Settings.
- [ ] **Set 1d. Answers stay on the server.** Today every chapter, with its culprit, its accounts and its evidence, is bundled into the page. The Worker serves a step's playable part when it opens and the ending once it is earned, guests included. Nothing on screen can be hidden from a determined copier, so the lead is the writing and the art, and this keeps the answers from being one download away.
- [ ] **Set 1e. 5 people play it.** The long spoon, from brief to ending, on a phone, by 5 people who have never seen the game. What stops them is fixed.
- [ ] **Set 1f. Search the scene.** More find methods, so not every case sweeps a room. No clock, and a tip-off points at a quarter of the room, never at the thing:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| By torchlight | The power is off, or it is night | Move a circle of light over a dark room and tap what it shows | The same room, dimmed |
| Look under it | Things are hidden where nobody dusts | Lift, slide and open. Each thing moved shows what was behind it | Layers in the drawing |
| What does not belong | A scene holds what a visitor brought and forgot | Among the finds, pick the 1 nobody who uses the room owns | The finds, and 1 line on who uses the room |
| Piece it together | A print or a pattern comes off in pieces | Lift the marks from the glass and set them into the print they make (the friend's glove print) | The pieces, drawn |

Rooms are drawn as `design/sketches` shows: warm cream ground, 1 ink line weight with a slight wobble, flat muted fills, even light, no lime. The evidence is fixed by the chapter; take it out and the room no longer tells the story.

### 2. After the essentials

- [ ] **Set 2a. Weigh what could have happened.** Most need no drawing:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| Which came first | Traces lie on top of each other | Put 3 or 4 traces in the order they were made | Small drawings of traces |
| Walk it through | A route has to fit the building and the time | Lay the path on a floor plan. A locked door or too long a walk is refused | 1 floor plan |
| Line of sight | A witness can only have seen what was in view | From where they stood: tap what blocks the view, or say nothing does | The same plan |
| Who could reach it | A shelf has a height and a person has a reach | Set each suspect against the hook, with or without the ladder found | Words and numbers |
| Bag and tag | Evidence is useless until it is sorted | Each find goes in 1 of 3 bags: how, why, when | The finds of the case |

- [ ] **Set 2b. Call a friend.** On any step, besides the pet's tip-off: a friend called into the step to look with you.
- [ ] **Set 2c. Walk it back, the room.** The scene was tidied before it was photographed, so the only record is the detective's walk. A room seen once in a fixed order, then each thing put back, or the stop tapped where something moved. 4 to 6 things. On screen "Walk it back", never "memory".
- [ ] **Set 2d. Photos on the board**, for `item` pins, with the photo store and a credits page. Then 4 pictures and 1 word, invisible ink, rub the pad, ink not word, what stood here.
- [ ] **Set 2e. Progress on the account.** Which cases are open, cold seals and Your Notebook move from this browser to the account.
- [ ] **Set 2f. Casebook 2.** Its place chosen by the owner. "Theft of the Ember award" (a friend's draft, `design/MYSTERY STORIES-WPS Office.docx`) is a candidate, finished story first, with the security head locked out of his office in place of the blow to the head.

### 3. Later

- [ ] **Pet outfits.** A row per pet, drawn for all 4 in every mood. A few earned, the rest bought once payments are in. Cosmetic only.
- [ ] **The case archive**, for cases not on the path.
- [ ] **Seasonal cases**, one at a time, the next date first. Each is a written chapter tied to a date, with its dress on the map, laid on the drawing's `data-anchor` shapes (roofs, doors, trees, lamps, awnings, the sky) so the street is never redrawn: snow on the roofs and gift boxes by the doors in December, pumpkins on the steps and bats in the sky at Halloween. The dress starts faint on a set date, thickens toward the day, and clears the day after. Moving dates come from `data/holidays.json`, set a year ahead by the owner. A season of 1 country or 1 faith is offered, never forced, and Settings can turn dress off. A case opened in its season can be finished after it.
- [ ] **Badges worth unlocking.** Each its own drawing, collected in sets: 1 a case, 1 a method done clean, 1 a pet, the gold seals, 1 a season. One not yet earned is its silhouette. Unlocking is a moment, and Share is 1 tap.
- [ ] **Download my data** in Settings, and how long play logs are kept, written into `SECURITY.md` and deleted by a job.

## Checks still owed

- [ ] On real phones: the dock on an iPhone Home Screen app, a step with the phone locked.
- [ ] Signed in screens on the live site with a real second account, once the backend exists.
- [ ] The numbers in `INSIGHTS.html` against primary sources before any goes on a public page.

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself.
- A step answered by picking, played again, is played knowing the answer. It scores no points, so no board moves.
- Until set 2e, a case opens by the stars in this browser, and cold cases are kept in this browser only.
- The trail gives a find 1 pick.
- Suspects are drawn from the 14 culprits (`culpritWho`), so chapters share faces until more are drawn.
