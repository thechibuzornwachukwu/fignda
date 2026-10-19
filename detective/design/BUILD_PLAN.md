# Build plan

What is left for Lantern Row, in sets that ship one at a time. What is built is in `SPEC.md` and git history.

Deploy, once the backend exists: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.

## Direction

- This is a detective game.
- Offer: a few minutes of real detective work, in place of scrolling.
- One skill in every game: looking closely.
- A case is worked the way a detective works one: a brief, the scene, then steps that each end on a lead to the next, then the line-up.
- Nobody leaves clues on purpose.
- A case has 3 kinds of work, and a chapter should have all 3: finding what is there (searching a scene), reading what was left (messages, records, traces), and weighing what could have happened (scenarios).
- Show it, do not caption it.
- Every method has a physical reason.
- Evidence clears suspects.
- The case board is what a player watches change.
- The opening board is different in every case.
- The lead is given, the clearing is earned.
- Backup is not a second currency.
- The Open Eye stays masked.
- Chapters are written by us, one file each in `design/stories/`, and `checkChapter` (`src/engine/chapter.ts`) refuses one that is not a fair fight.
- A chapter is plotted backward from the culprit's evening: what they needed, what they touched, what they tried to destroy, what they forgot.
- A story is for players anywhere.
- What brings a player back is the calendar.
- A seasonal chapter dresses the path, and a season arrives slowly: its dress starts faint on a set date and thickens toward the day, then clears the day after it ends.
- Chapters differ.
- Pictures are mixed by what they are for.
- Photos are free to use and say so.
- A new culprit each case, an ordinary character under a disguise.
- The player has a pet that comes along on every case: Detective X (the cat), Detective Tobs (the dino), Detective Puff (the dog) and Agent 404 (the robot).
- Tone: the motive is mischief, pride or a surprise, never harm.
- For all ages, not a children's product.
- We promise the practice, never a result.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- A guest plays as a guest.

## How the cases are structured

The reasons for each line are in. This is the structure they give.

| Level | What it is | Size | On screen |
|---|---|---|---|
| Casebook | A place and its cases, with a thread behind them | 8 cases | A named banner on the path, and its own look |
| Case | 1 story: something was taken, hidden or faked | A brief, 5 to 7 steps, the line-up, the ending | A file on the path, showing its board |
| Step | 1 sitting on 1 piece of evidence | 2 to 4 minutes | A mark on the case, a screen of its own |
| Interlude | 1 message to the Open Eye, intercepted between cases | 1 sitting | A small mark on the path between 2 cases |
| Cold case | A closed case, worked again with no tip-offs | The same case | A gold seal on its file |

The rules:

- 1 path.
- Every case has the same bones: brief, steps, line-up, ending.
- A case has all 3 kinds of work: finding, reading and weighing.
- 1 new method a case, at most.
- Inside a case, 4 beats: a method is met plain, then harder, then with a twist (a suspect who lied, the obvious one cleared), then the line-up tests the whole case.
- Most cases stand alone.
- Each case leaves 1 loose end, and it is the first line of the next brief.
- A sitting ends on a step with a lead, and the board shows everything found.
- Guessing is pointless, never punished: whoever the evidence cleared cannot be named, the line-up has 2 tries, and then the mask comes off anyway.
- 1 score: stars.
- A step exists because the case needs its fact.
- Nothing is gated by time.
- Shapes rotate: no 2 cases next to each other have the same shape, and no 2 next to each other have the same number of suspects.

Each can still be changed, and a case is only fixed once it is written.

- The place: Lantern Row.
- The cast returns.
- The pace is the player's.
- A fortnight is how fast we write, not how fast anybody plays.
- Casebook 1 is the game: all 8 cases are written and open.
- What a player finds at the end of what is written, so the game never just stops: (1) cold cases: any closed case again with no tip-offs, for a gold seal; (2) practice: the drills; (3) a seasonal case, when one is open; (4) the next file on the path, closed, with "Tell me when it opens" and no date unless it is written.
- Nothing bought makes a case faster or easier.
- Art never blocks the path.
- The 2011 question runs through the book.

Casebook 1: Lantern Row. The premise of each case is 1 line and is where its writing starts, not a script.

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
What this asks of the build, in order: Lantern Row is written and open, all 8 cases and both interludes, with the Open Eye file and cold cases. Next: cold cases and interludes kept on the account, "Tell me when it opens" on the next casebook once the reminder keys are set, badges worth unlocking , and casebook 2 once the owner has decided its place.

## To build, in sets

One set at a time. Each leaves the live game whole.

### 0. Before launch

- [ ] Owner: create the Supabase project, link it (`npx supabase link`), push the 1 migration, and put its URL and anon key in `.env.production.values`.
- [ ] Owner: confirm the Cloudflare names, `lantern-row` (Pages) and `lantern-row-api` (Worker), then `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.toml`.
- [ ] Owner: the name.
- [ ] A logo.
- [ ] Custom SMTP so sign in emails carry a 6 digit code, and Google sign in.
- [ ] Read every case in `design/stories` as a player would, and say what is wrong.

### 1. The case, worked like a detective (next)

Build in this order. The aim of 1c to 1g is one thing: The long spoon played from its brief to its ending, by a new player, on a phone.

- [ ] **Set 1c.
- [ ] **Set 1g. 5 people play it.** The long spoon is played by 5 people who have never seen the game, and what stops them is fixed.
- [ ] **Set 1h.
- [ ] **Set 1i.
- [ ] **Set 1i-b.

- [ ] **Set 1i-c.

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| By torchlight | The power is off, or it is night | Move a circle of light over a dark room and tap what it shows | The same room, dimmed |
| Look under it | Things are hidden where nobody dusts: under the rug, behind the frame, in the back of a drawer | Lift, slide and open. Each thing moved shows what was behind it | Layers in the drawing |
| Bag and tag | Evidence is useless until it is sorted by what it answers | Each thing found goes in 1 of 3 bags: how, why, when. A wrong bag costs nothing but a star | Nothing drawn: the finds of the case |
| What does not belong to the room | A scene holds what the visitor brought and forgot | Among the things found, pick the 1 that nobody who lives or works here owns | The finds, and 1 line on who uses the room |

- [ ] **Set 1i-d.

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| Which came first | Traces lie on top of each other: a dry print under a wet one, dust over a ring | Put 3 or 4 traces in the order they were made | Small drawings of traces |
| Walk it through | A route has to fit the building and the time | On a floor plan, lay the path from where they were seen to where the thing was. A path through a locked door, or one too long for the time, is refused | 1 floor plan |
| Line of sight | A witness can only have seen what was in view | On the plan, from where the witness stood: could they have seen it? Tap what blocks the view, or say nothing does | The same floor plan |
| Who could reach it | Means is physical: a shelf has a height and a person has a reach | The hook is 2.1 m up. Set each suspect against it, with or without the step ladder that was found | Words and numbers |

- How a room is drawn (learned from xiaohu-ip-studio and Comfyui-Anima-Wardrobe, 14 Oct 2026).
- Rules for both sets.
- Built: Which account fits (case 2), Could it be done (case 3) and The missing step (case 6), in `SPEC.md` section 6.
- `checkChapter` learns each method as it is built, and then asks a chapter for all 3 kinds of work.
- Later, once the 5 shapes are being played: Liar, Relay, Number series, Bury it.

### 3. Pets

- [ ] **Set 3m.

### 5. Seasonal cases

These are the reason to come back. A case here is a written chapter like any other (`design/stories`, `checkChapter`), told for players anywhere, and tied to a date.

- [ ] **Set 5a.
- [ ] **Set 5b.
- [ ] **Set 5c.

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
- A season that belongs to one country or one faith is offered, never forced: it shows where the player is or where they chose, and Settings can turn dress off.
- Nothing in a season is for sale or timed out: a case opened in its season can be finished after it, and moves to the archive .
- [ ] **Set 5d.

- [ ] **Set 5e.
A badge not yet earned is its silhouette, so the set shows what is missing without a word. Unlocking one is a moment: it is drawn in, the pet reacts, and Share is 1 tap.

### 8. Data and privacy

- [ ] "Download my data" in Settings.
- [ ] How long play logs are kept, written into `SECURITY.md` and deleted by a job.

## Checks still owed

- [ ] On real phones: the dock on an iPhone Home Screen app, a step with the phone locked.
- [ ] Signed in screens on the live site with a real second account, once the backend exists.
- [ ] The numbers in `INSIGHTS.html` against primary sources before any goes on a public page.

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself.
- A step answered by picking (the accounts, a claim) played again is played knowing the answer, so its 3 stars can always be had.
- A case opens when the one before it is closed, by the stars in this browser.
- A cold case, its gold seal and an interlude read are kept in this browser only.
- The trail gives a find 1 pick.
- A written chapter's suspects are drawn from the 14 culprits (`culpritWho`), so chapters share faces until more are drawn.
