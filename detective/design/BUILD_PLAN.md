# Build plan

Only what is left, in sets that ship one at a time, each leaving the live game whole. What the game is: `SPEC.md` section 0. What is built: `ACCOMPLISHED STUFF.md`. Cases and the casebook: `CASE_WRITING.md`. The flow: `flow.html`.

Deploy, once the backend exists: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.

## To build, in sets

### 0. Before launch (owner)

- [ ] Create the Supabase project, link it (`npx supabase link`), push the 1 migration, and put its URL and anon key in `.env.production.values`. Until then the site is guest only and Ranks leads to Cases.
- [ ] Confirm the Cloudflare names, `lantern-row` (Pages) and `lantern-row-api` (Worker), then `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.toml`.
- [ ] The name. Lantern Row is a working name.
- [ ] A logo. Until then the header shows the name as text and the favicon is an eye.
- [ ] Custom SMTP so sign in emails carry a 6 digit code, and Google sign in.

### 1. Essentials: what a new player meets and an ad can show

In this order. Together they make case 1 something worth putting an ad on.

- [ ] **Set 1-map. Cases is the 3D street.** Each case a pin at its `where` (ticked when closed, gold seal when cold, the open one lit, the rest dim), framed round the open case on a phone. Inside a case its places light up as worked, joined by a route seen from above; Your Notebook shows each route. Still to add to the street: the sky dial, cloud shadows, the morning after (`after`: wreckage, a fallen tree and torn roofs after the storm; mud, a tide line and sandbags after the flood), worn roofs on the old buildings, posters on the billboards.
- [ ] **Set 1-town. Trails cross town.** A case can lead streets away, not only next door. Lantern Row becomes 1 street on a town map; the places now at the map's edge (the depot, Rosa's night stall, the secretary's house) become places on it. A route is drawn at the scale it needs: the street for a short hop, the town for a long one.
- [ ] **Set 1-travel. How the detective gets there.** By distance: on the street they walk with their pet; across town they ride. The ride is the player's own: a bicycle to start, then others to earn or buy (a car, a horse). Cosmetic only: no ride arrives sooner.
- [ ] **Set 1-visits. Been here before.** Every place a step is worked in is kept. Back at a place in a later case, the map says so, and the places collected are a badge set. Earned only.

- [ ] **Set 1a. Every case from its story.** A story file for each case (`the-long-spoon.md` done), then its chapter rewritten from it until it is off `OWED` in `src/engine/chapter.test.ts` (6 cases lack find work; case 5 brings 2 new methods). Buried sums is made of the case's own figures (the till roll's real sales, the gate book's real cars) in place of a row the engine makes up.
- [ ] **Set 1b. Talking to people.** The talk kind (`CASE_WRITING.md` section 3), engine first: *Question them* (pick what to ask; a pin shown against what they said makes them say more; a question with no reason behind it ends the talk early) and then *Sit with them* (a real game or a meal: chess first, an endgame from a position they set, legal moves checked by a chess rules library chosen in this set for a licence that allows sale). Each first used in a chapter, and once built, every case needs talk work.
- [ ] **Set 1c. The player's detective.** Drawn to `CHARACTERS.md`: the proportion sheet, then the face and fixed parts, then the outfit layers, then the suspects redrawn on the same figure. Replaces the round avatars in `src/avatar`. Shown on the path, the ending and Settings.
- [ ] **Set 1d. Answers stay on the server.** Today every chapter, culprit included, is bundled into the page. The Worker serves a step's playable part when it opens and the ending once earned, guests included.
- [ ] **Set 1e. 5 people play it.** The long spoon, from brief to ending, on a phone, by 5 people who have never seen the game. What stops them is fixed.
- [ ] **Set 1f. Search the scene.** More find methods, so not every case sweeps a room. No clock, and a tip-off points at a quarter of the room, never at the thing:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| By torchlight | The power is off, or it is night | Move a circle of light over a dark room and tap what it shows | The same room, dimmed |
| Look under it | Things are hidden where nobody dusts | Lift, slide and open. Each thing moved shows what was behind it | Layers in the drawing |
| What does not belong | A scene holds what a visitor brought and forgot | Among the finds, pick the 1 nobody who uses the room owns | The finds, and 1 line on who uses the room |
| Piece it together | A print or a pattern comes off in pieces | Lift the marks from the glass and set them into the print they make (the friend's glove print) | The pieces, drawn |

Rooms are drawn as `design/sketches/rooms` shows: warm cream ground, 1 ink line weight with a slight wobble, flat muted fills, even light, no lime. The evidence is fixed by the chapter; take it out and the room no longer tells the story.

### 2. After the essentials

- [ ] **Set 2a. Weigh what could have happened.** Most need no drawing:

| Method | Why it is real | What the player does | Needs |
|---|---|---|---|
| Which came first | Traces lie on top of each other | Put 3 or 4 traces in the order they were made | Small drawings of traces |
| Walk it through | A route has to fit the building and the time | Lay the path on a floor plan. A locked door or too long a walk is refused | 1 floor plan |
| Line of sight | A witness can only have seen what was in view | From where they stood: tap what blocks the view, or say nothing does | The same plan |
| Who could reach it | A shelf has a height and a person has a reach | Set each suspect against the hook, with or without the ladder found | Words and numbers |
| Bag and tag | Evidence is useless until it is sorted | Each find goes in 1 of 3 bags: how, why, when | The finds of the case |
| The recording | A camera keeps what crossed its view, with the time | Scrub the footage: stop on who passes, read the time off the frame. What the camera's wedge does not cover, it cannot clear | The 3 cameras on the map (`CAMERAS`) |

- [ ] **Set 2b. Call a friend.** On any step, besides the pet's tip-off: a friend called into the step to look with you.
- [ ] **Set 2c. Walk it back, the room.** The scene was tidied before it was photographed, so the only record is the detective's walk. A room seen once in a fixed order, then each thing put back, or the stop tapped where something moved. 4 to 6 things. On screen "Walk it back", never "memory".
- [ ] **Set 2d. Photos on the board**, for `item` pins, with the photo store and a credits page. Then 4 pictures and 1 word, invisible ink, rub the pad, ink not word, what stood here.
- [ ] **Set 2e. Progress on the account.** Which cases are open, cold seals and Your Notebook move from this browser to the account.
- [ ] **Set 2f. Casebook 2.** Its place chosen by the owner. "Theft of the Ember award" (a friend's draft, `design/MYSTERY STORIES-WPS Office.docx`) is a candidate, finished story first, with the security head locked out of his office in place of the blow to the head.
- [ ] **Set 2g. Weather cases.** A case's weather is in its story and its chapter (`weather`), and the engine refuses a step that needs what the weather rules out (a wet print on a dry night). Then 2 cases of their own: *the storm*, where the street says the wind took it and the evidence says it lies upwind of where the wind would have left it; and *the flood*, where the water was blamed for what was moved before it came.

### 3. Later

- [ ] **Pet outfits.** A row per pet, drawn for all 4 in every mood. A few earned, the rest bought once payments are in. Cosmetic only.
- [ ] **The case archive**, for cases not on the path.
- [ ] **Seasonal cases**, one at a time, the next date first. Each is a written chapter tied to a date, with its dress on the map, laid on the street's named parts (`anchor` in `src/map/street.ts`: roofs, doors, billboards; trees and lamps by their place): snow and gift boxes in December, pumpkins and bats at Halloween. The dress starts faint on a set date, thickens toward the day, and clears the day after. Moving dates come from `data/holidays.json`, set a year ahead by the owner. A season of 1 country or 1 faith is offered, never forced, and Settings can turn dress off. A case opened in its season can be finished after it.
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
