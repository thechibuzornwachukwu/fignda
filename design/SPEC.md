# Gazecraft spec

Values are tokens from `src/styles/tokens.css`. Prototype wins on visuals. This file wins on behaviour.

## 1. Brand

**Name:** Gazecraft. Two plain words fused, naming what you do. Looking closely is a craft you get better at, whether the puzzle is words, numbers, pictures or a board. In use: "Gazecraft level 12", "my Gazecraft league". One word, capital G only, in running text.

**Logo** (`src/brand/cat.ts` holds the cat and `src/components/logoPaths.ts` the letters; `design/brand/index.html` is the brand guide). Drawn, never typed, so it needs no font and stays sharp at any size. This section wins over the logo in the prototype files.
- Mark: the cat. Dark fur, tall ears, lime almond eyes, one lid lowered, a crooked smile. It is the main character of `design/characters`, head only, no hat.
- Wordmark: the cat, a gap, then GAZECRAFT in Bungee Regular with the font's own spacing. The letters are ink (`currentColor`, `--fg`). No letter takes a shade.
- The cat's colours are fixed brand art, the same in both themes. Its eyes are the only lime in the logo.
- Sizes are the height; capitals are 88% of it. Header wordmark 22; at 400 wide and under the mark alone, 28. Share card 52. Link preview 46. Email 24. Smallest wordmark 16, smallest mark 16.
- Clear space: about 12% of the height on every side.
- App icon: the cat's eyes up close, fur (`#454552`) to every edge, radius 25%. Export 32, 180, 512 (`npm run brand:render`). The 16 size is the SVG favicon.
- Icons used: ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Contrast, Lightbulb, Clock, Flag, Search, Check, X, Bell, Award, MousePointer2, Pointer.

## 2. Type

Two faces. Bungee (`--font-display`, 400 only, capitals only) for headings. Manrope (`--font`) for everything else. Bungee is wider and heavier than Manrope, so heading steps run smaller and take a softer ink: `--ink-display` (80% of `--fg`) on the two largest steps, `--ink-heading` (88%) on the rest. Its digits are not tabular, so clock and stat stay Manrope. Names, game rows, buttons, inputs and puzzle text stay Manrope.

| Token | Face | Size | Weight | Tracking | LH | Ink |
|---|---|---|---|---|---|---|
| display | Bungee | clamp(36px,7vw,96px) | 400 | -0.02em | 0.98 | `--ink-display` |
| gameTitle | Bungee | clamp(28px,5vw,68px) | 400 | -0.02em | 1 | `--ink-display` |
| resultTitle | Bungee | clamp(24px,3.6vw,46px) | 400 | -0.015em | 1.05 | `--ink-heading` |
| h2 | Bungee | clamp(22px,2.9vw,34px) | 400 | -0.015em | 1.05 | `--ink-heading` |
| h3 | Bungee | 17 | 400 | 0 | 1.2 | `--ink-heading` |

| Token | Size | Weight | Tracking | LH |
|---|---|---|---|---|
| clock | clamp(48px,7vw,96px) tabular | 800 | -0.05em | 0.85 |
| stat | clamp(36px,5vw,56px) tabular | 800 | -0.04em | 1 |
| row | clamp(24px,3.2vw,40px) | 700 | -0.035em | 1.1 |
| puzzle | clamp(20px,2.3vw,27px) | 600 | -0.015em | 1.7 |
| body | 16 | 500 | 0 | 1.55 |
| small / label | 14 / 13 | 600 | 0 | |
| itemTitle | 16 | 700 | -0.01em | 1.3 |
| figure | 18 tabular | 800 | -0.02em | 1.2 |
| caption | 14 | 500 | 0 | 1.45 |

`itemTitle` is a name or a title in a list row. `figure` is the score at the end of a row. `caption` is a muted line under something. Every text style on the 4 tabs (Games, Leaders, Players, You) composes one of these steps: no `font-size` is written in their CSS modules, and `src/test/type.test.ts` fails if one is. A weight or a colour may change on a step; a size may not.

## 3. Layout
- Max width 1200, gutter 24. Section gap clamp(64px,9vw,120px).
- Header, by context. Landing: logo, section links (How it works, About), account link, theme toggle, Play button (sm). App: logo, nav (Games, Leaders, Players) 14/600 `--muted`, account link, theme toggle 36 square radius 8. Under 640 the header is always one row: logo left; account (avatar only, no name), theme toggle and, on the landing page, Play on the right. Both navs are hidden there: the landing sections are a scroll away and the tab bar carries the app links. Sticky with quick return: hides on scroll down past its height, returns on any scroll up (8px tolerance), stays while focus is inside.
- Game mobile layout under 760.
- All text boxes reflow. `min-width: 0` on flex children with text. No fixed heights.

## 4. Components

| Component | Spec |
|---|---|
| Button primary | h48 (36 in header), px20, r8, bg `--fg`, text `--bg` 15/700, hover `--fg-strong` |
| Button accent | bg `--accent`, text `--on-accent`, hover `--accent-hover` |
| Button secondary | 1px `--line-3`, text `--fg`, hover bg `--surface-2` |
| TextLink | 14/600 `--muted`, underline offset 4 `--line-3`, hover `--fg` |
| FilterTabs | gap 20, 14/600, active `--fg` + 2px bottom border, else `--subtle` |
| GameRow | padding 24 0, 1px bottom `--line-2`. Category 84 wide 13/600 `--subtle` (hidden <760). Title `row`. Meta "N words · Level" 14 `--subtle`. Hover padding-left 12 |
| PageHeader | One per tab (Cases, Ranks, Squad, You). Title is the `h1` at `resultTitle`, left; one action slot on the right (a TextLink, or nothing), baseline aligned, wraps under the title when it does not fit. Same top padding (`--screen-top-game`) on all 4, phone and desktop |
| ProgressLine | 2px, track `--line`, fill `--bar`. Landing preview only |
| Ring | An open circle that fills clockwise from 12 o'clock. SVG, 20 (40 for the week), stroke 2.5, track `--line-3`, fill `--fg`. Closed (value 1) it turns `--accent-ink`: the only time it is lime, since lime means found. `value` 0 to 1 is a `progressbar`. `parts` makes a segmented ring (an `img` with a label), 12 degrees open between parts: done `--fg` 2.5, rest `--muted` 1.5 in 3 dashes, empty `--line-3` 1.5, so a rest day never reads by colour alone. A segmented ring closes when no part is empty and at least 1 is done |
| BigClock | label "Time" / "Final time" 13/600. Digits `clock`, `--subtle` playing, `--fg` finished. Hidden <760 |
| WordList | 2px `--fg` top rule. Header title + count. Rows 10 0, 1px `--line`, index 01 left. Chip: found `--accent`/`--on-accent`, missed `--miss`, unfound one • per letter `--line-4`. Chip 2 6, r4. Desktop sticky top 24, max-h min(62vh,640) scroll |
| Segmented | track p4 r10 `--surface` 1px `--line`. Option h36 r7 14/700. Active `--fg`/`--bg` |
| Toggle | 44x26 r13. Off `--line-2`, on `--accent`. Knob 20 |
| Input large | no box, 2px bottom `--line-3`, `row` type |
| Input form | h52 r8 1px `--line-2` bg `--surface` 16px, focus `--line-4` |
| Dialog | scrim `--scrim`, panel max 820 r14 1px `--line-2` bg `--bg`. Esc and outside click close. Focus trapped and restored |

## 5. The puzzle interaction
Paragraph renders one span per character. Letters carry `li` (index in lowercase letter stream `S`). Non letters carry `prev` and `next`.

**Letter states:** idle transparent · selecting `--sel`/`--sel-fg` · found `--accent`/`--on-accent` · missed (after finish) `--miss` · hint: a 2px `--fg` ring around the letter over a `--hint-bg` wash, and a hand (Pointer at 0.62em of the puzzle type, about 12 on a phone and 17 on a desk, `--fg` on `--bg`) under it pointing up, small enough to sit between two lines. Selecting and found win the fill, and the ring and the hand still show on them, so a hint for a word that starts inside a found word is seen. A non letter takes the state when both neighbours share it, so "a most" is one bar. r4, padding 2 0.

**Input**
- Mouse/pen: drag (pointerdown starts, window pointermove extends via `elementFromPoint`, pointerup evaluates), or click first letter then last. After the first click the range follows the mouse. `user-select: none`.
- Touch: swipe sideways, press and hold then drag, or tap first letter (copy `tapNext`) then last. A slow tap that never moves is still a tap. `touch-action: pan-y pinch-zoom` so the page still scrolls.
- Tap or click the anchored letter again to cancel. Escape clears.
- Second tap or click: the whole range shows as selecting for `--dur-connect` (220ms), then is checked. Any new touch, click or key checks it at once.

**Evaluate** (`reference/engine.js` `check`):
| Result | Action |
|---|---|
| hit | mark found, `onFound(ctx)` line, word moves to top of list |
| already | `already` line |
| near miss (`isClose`) | `close` line, no penalty |
| wrong, 3+ letters | `wrong` line. Daily: `wrongDaily`, +1 miss (-10) |
| under 3 letters | nothing |

Streak resets on wrong pick and on hint. `onFound` picks: first find, last one left, every 3rd in a row, quick (<6s), long (8+ letters), else generic. Pools never repeat a line twice in a row.

**Hint:** marks first letter of the earliest unfound answer, `hint` line, -25. A hinted letter that is off screen, or under the header or the phone bar, is scrolled to the middle of the screen (smooth, or at once under reduced motion). Asked again while the hand is still on that letter: a `hintStill` line, no charge, nothing in the play log.
**Finish:** "I'm done" or last find. Missed answers shade. Under the result actions, "What you missed" (h3): one missed word at a time, in reading order. Its name (13/600 `--subtle`) over the words it hides in at `puzzle` size in `--muted`, with the answer's letters on `--miss` in `--fg`, so AMOS shows "a mos" marked and "t" plain. With 2 or more: "1 of 4" and Previous / Next buttons (44 square, r8, 1px `--line-3`, ChevronLeft / ChevronRight at 18) that wrap around. No motion: it is stepped through often. Under it one `readPast` line when the player's own picks ran across any of them. Hidden when nothing was missed.
**Save and resume:** a game played alone that is left unfinished carries on where it stopped: the finds, the hints, the hand of a hint still showing, the wrong picks and the clock. One line from the `resumed` pool says so when there is a find or a hint to come back to.
- The clock counts time on the puzzle, not time away, in every game played alone, the daily included. It stops when the player leaves the page, closes the tab, switches app or locks the phone, and starts again on return. The play log uses the same clock, so the server's time is time on the puzzle too. A page that goes without telling us (a crash) keeps its clock running: an accident never shortens a ranked time.
- A puzzle that is not the daily is kept in this browser, one record each (`gazecraft-resume-ID`, `src/games/resume.ts`). The daily is kept as it always was (`gazecraft-daily-N`).
- A finished game is kept too. Opening it again shows its result, with Share and the board still there, until "Play again" starts clean. Leaving the result to look at the board no longer loses it. The play is sent to the server once: the kept game remembers that it went, so a result opened again is never sent twice. A guest who signs in from the result has that play sent when they come back to it.
- Nothing is dropped in normal play. The store holds 100 games, more than the catalogue and all its passages; past that, or when storage is full, a finished game goes first, then the game left longest ago, and the one being played is never the one to go.
- A kept game whose words no longer match the puzzle loses those finds and keeps the rest. Stored data that is missing or unreadable is no saved game. Signing out clears it with the rest of this browser's data.
- A room game is kept too, under its room (`gazecraft-resume-room-CODE-ID`), so a dropped connection or a reload loses nothing and a player's own finds stay their own. Its clock does not stop: the team plays on in real time, and the server settles who found a word first by that clock.

**Clean read:** every word found by you, no hints, no wrong picks (near misses do not count; a room game with a teammate's find is not one). One `cleanRead` line under the result title. One rule, `cleanReadOf` in `src/engine/skill.ts`; the session only adds that the game is over. Wrong picks are counted in every game for this and scored only on the daily. Result title picked once from `titlePerfect|titleGood|titleLow|titleZero`, then fixed.
**Result lines:** under the result title and its line, in this order, each only when it is true: stars, skill lines (2 at most), record lines (2 at most), rare find, the day's count, the run, `doneToday`. A helper with nothing true to say returns no line, so a game with 0 found or ended at once with "I'm done" shows the title, the line and the stats only (plus the run and `doneToday` on today's daily). Line helpers are pure and live in `src/games/resultLines.ts`.
**Stars (result):** a catalogue puzzle played alone (not the daily, not a room, not a player-made puzzle) earns 1 to 3 from `starsFor`. The best is kept per puzzle in this browser (`gazecraft-stars`). The result shows them with `<Stars>` at 20, under the result line. When this play raised them, the first finish included, they pop in and one `starsUp` line sits beside them. No stars row at 0 or for any other game.
**Skill lines:** from `skillsOf` on your own finds, one each, 2 at most, rarest first: clean read (`cleanRead`), no-hint perfect (`skillNoHint`: every word, no hint, said only when a wrong pick spoiled the clean read), deep find (`skillDeep`: a word across 3 joins or more, said as the 4 or more words it runs across), long word (`skillLong`: 9 letters or more). In every game, rooms included; a teammate's find never counts.
**Variable days:** today's daily only. Before it is finished, one line under the title that says what it holds and never how much: `todayDeep` when an answer crosses 3 joins or more, else `todayLong` when one has 9 letters or more, else nothing (`todayHoldsLine`, also for the daily card). After it: `dayHid` ("Today hid 11. Most days hide 8."), the middle count of the daily pool with today in it; `dayHidSame` when today is a usual day. No line when the pool has fewer than 3 puzzles.
**Personal records:** in this browser (`gazecraft-records`, `src/lib/records.ts`, `loadRecords()` for the profile): fastest clean read per pack (the puzzle's category; dailies count, player-made puzzles do not), most found in a daily, longest word found. Your own finds only. The first value of each is stored quietly: a record is something you beat, so a line (`recordClean`, `recordDaily`, `recordLong`) and the record sound come only from a later, strictly better play. A tie is not a record. 2 lines at most, in that order; every record is still stored. Stored values that are not numbers or words are dropped on read.
**Sound:** Web Audio, synthesized, no files (`src/lib/sound.ts`). A soft triangle tick per new letter in a selection, pitch up a semitone per letter from 660 Hz (cap 2 octaves), ticks under 25ms apart merge. A find plays C6 then G6. A new personal record plays E6, G6, C7, 0.45s after the game ends so it follows the last find. Misses are silent. On by default, `gazecraft-sound`=`off` mutes. Audio wakes on the first gesture only. Mute: speaker button on the puzzle screen (aria-pressed) and a Sounds switch in Settings. Safari ambient session: the iPhone silent switch mutes it.

**Together:** `?vs=handle` shows that player's best verified score (plays_public) above the board, then won / lost / level at the end; dailies show the score only until you finish. `?room=CODE` (6 chars, no 0 O 1 I L) joins a live room: Play together button on non-daily puzzles, room bar (who is in, Invite, Leave, Not ranked). Every player in the room has an avatar at 24, your own row included; a guest gets a starter drawn from their room id. Spans broadcast and re-checked with the engine; `teamFound` / `teamJoined` copy pools. When the game ends each signed in player sends their own play log with the room code; the server replays it for the Together board and never for the solo boards. Under the room bar, "Invite someone you follow" opens a list of the people you follow with an Invite button each.

**Text result:** Copy result button on results (secondary). Lines: title (dailies: `Gazecraft Daily #n`), `found · time · score` (dailies never print the total), marks in play order 🟩 find ⬜ miss 💡 hint in rows of 10 (max 40), `Beat it: <link>` (adds `?vs=handle` when signed in). Coarse pointers use the share sheet, others copy.

**Together board:** `/leaderboard/:id?board=together` (Segmented Solo / Together on every puzzle board). A team is 2 or more signed in players in one room. Rank: words found together, then the faster team, then the earlier finish. Each player's count is the words they found first. Guests are shown in the room and never ranked.

**Holiday dailies:** `data/holidays.json` (fixed `date` MM-DD, or `dates` for moving ones; `since` keeps days already played as they were). On a holiday the daily card kicker, the game meta line, the result line, the leaderboard kicker and link previews say "Christmas daily" in place of "Daily". The day before and after keep the rotation.

**Streaks:** the run is consecutive UTC days with a finished daily. Daily card, unplayed, run of 2 or more: sub line from `streakKeep`. After today's daily, one line under the result: `streakMilestone` at 7, 30, 50, 100, 365; `streakDay` from 2; `streakBack` on day 1 after a best run of 3 or more; else `streakStart`. Under it, one calm line from `doneToday` that the day is done. More games stay one tap away and are never pushed.

**The promise in copy:** we promise the practice, never a result. No pool line or page string says attention span, brain training, memory, IQ or proven (`src/copy/claims.ts`, checked in `npm test`). Run and reminder lines talk about today's puzzle. None works by guilt or by what the player would lose. Nothing in the UI says who or what wrote a puzzle, except "Made by @handle" on player-made ones.

**Reminders:** web push, signed in only. Settings, Reminders: Toggle "Daily reminder" and, when on, Segmented When (Morning 8, Midday 13, Evening 19, the player's own clock). Under today's result: TextLink "Remind me tomorrow" when this browser has not chosen yet. One push a day at most, only if today's daily is not played. Lines: `inviteGame` (a fresh room invite), else `remindFriend` (a streak friend has played), else `remindStreak` (run of 2 or more), else `remind`. Tapping opens today's daily or the room.

**Friend streaks:** second section of `/players` when signed in (`#friend-streaks`), once it is unlocked (section 6, Less at once). Two players, one count: it grows each day both have a verified daily, from the day it started; up to 5 each. Start: "Invite a friend" shares your link `/s/CODE` (one tap for the friend starts it, new players sign up first), or "Start a streak" on a profile (the other player says yes). Rows: avatar, name, whose turn today, days; actions Start / No (asked of you), Cancel (asked by you), Nudge (you played, they have not; one a day) and End.

**Room invites:** `/play`, signed in: rooms you were asked into in the last hour, above the daily card, each with Join. A push goes out only when you follow the inviter back.

**Points:** lifetime tally from verified plays. Every daily counts; another puzzle counts its best score, so replays cannot farm. A game ended with "I'm done" adds what it earned. Shown above the profile stats, beside the avatar as `<LevelBadge>` (size sm, from the same points; only once points show) and as the Points list under Top players on `/players`.

**New player profile:** with no plays, the stats and the 14 day strip are replaced by one block: h2 ("Your run starts with one puzzle." on your own page, "NAME is new here." on another's), a line, and one button (accent "Play today's daily" on your own).

**Rare find:** after a daily, one line under the result: the rarest word you found and the share of players who found it, every day at least 5 verified players are counted. `rareFind` ("Only 8% found...") when half or fewer found it, else `rarestFind`, which says the share plainly. No stats, fewer than 5 players or nothing found: no line. The share is never 0% and never over 100%.

**With NAME (sponsored puzzles):** one field on a catalogue puzzle in `data/games.json`: `"sponsor": { "name": "Chi Farms", "url": "https://chifarms.example" }`. One rule reads it, `sponsorOf` in `src/engine/sponsor.ts`, and every screen goes through `sponsorFor`. The name is 2 to 40 characters once tidied (line breaks and invisible characters become a space). The link is optional and must be `https` with no name or password in it; a bad link leaves the name with no link, and a bad name is no sponsor. `npm test` fails on a sponsor in the file that the rule would drop. The mark is one line from the `sponsorWith` pool, "With NAME", in Manrope and `--muted`: never lime, never Bungee, never a logo or an image. It shows in 5 places and nowhere else:
- Game row: its own line under the title (13/600), on `/play` and the landing list.
- Daily card: under the title, on a day whose puzzle carries the field.
- Result: the last line under the result title (14/600), then " · " and the sponsor's site name (the host, no "www.") as a link that opens in a new tab with `rel="sponsored noopener"`.
- Share card: under the title on the result card and on the first page of a puzzle card, 30px `--muted`, the site name beside it in `--subtle`. An image has no links, so the site name is printed.
- Link preview: one line above the question on the image (26px `--muted`), and "With NAME." as the last sentence of the description, the image text and the readable page. Run `npm run og:render` after adding or removing a sponsor.

Everything else about a sponsored puzzle is the same as any puzzle: score, points, stars, boards, its place in the list and on the path. The field lives in the catalogue only. The database, the Worker and player-made puzzles never carry it, so nothing a player types can become a mark.

**Sponsor report:** `npm run sponsor:report`, for the owner, from a terminal. No screen, no route. It prints 6 counts for every catalogue puzzle that carries a sponsor, and nothing about any person:
- Games started: new games opened, by everyone, guests included. A game carried on from before is not a new one.
- Played to the end: games that ended with at least 1 word found, and their share of games started.
- Found every word: games that ended with nothing missed, and their share of games played to the end.
- Shares: every time a share left the game: an image shared or saved, a link copied, a text result sent or copied. A closed share sheet is not one.
- Visits to sponsor: the sponsor's link on the result, opened, and its share of games started. Only for a puzzle that carries a sponsor.
- Signed in players: different accounts with a play the server checked, alone or in a room.

All but the last are counted by the game as it is played, per puzzle per UTC day, with no player on the count (`countEvent` in `src/lib/api.ts`, `POST /api/counts`). They are what a sponsor pays for: most people play as guests, and a guest's play is stored nowhere else. They are counts from the browser, limited per address and not checked by replay, so they never touch a score, a rank or a reward. A share with nothing to divide by prints no percentage, never 0%.

`--from` and `--to` (YYYY-MM-DD, UTC, both days included) narrow it. `--game ID,ID` reports on catalogue puzzles that carry no sponsor, to show a sponsor what a puzzle already draws. `--local` reads the local database. The ids come from the catalogue through `sponsorFor`, the counts from one database function (`sponsor_report`), the wording from `src/engine/sponsorReport.ts`. Games and shares are counted from 10 Oct 2026, and a report that reaches back before that day says so.

**Guest funnel:** `npm run funnel:report`, for the owner, from a terminal. One row for each of the last 14 UTC days (`--days N`, up to 365; `--local` for the local database): games started, games played to the end and their share, and new accounts. Under them the totals and one rate, new accounts for every 100 games started. It is the number a change to how guests are asked has to move. Games are the same counts as the sponsor report, so guests are in them. A player who starts 5 games is 5 starts, so the rate compares week with week and is not a share of people. The wording is `src/engine/funnelReport.ts`.

**Make a puzzle:** `/make`, signed in (the action in the Games header after 5 plays). Title, What is hidden, Paragraph (60 to 900), Hidden words (4 to 20, 3 to 12 letters). Each word shows a check or a cross and why: Hidden, Not in your paragraph, In plain sight, Typed twice. Accent "Publish puzzle" opens `/p/CODE`. Below: Your puzzles (words, plays, liked it). Under the result of a player-made puzzle: "Made by @handle" and Good one / Not for me (one each, never your own).
**Report:** on the same row, a TextLink "Report this puzzle" for signed in players, never on your own puzzle and never on one with no maker. One confirm step (Dialog: Cancel / Report), then one calm line in place of the link from `reportDone`, or `reportAgain` when the server says it was reported already (`reportPuzzle(code)`). A report that fails says `reportFailed` and keeps the link. 3 reports from different players hide a puzzle (BUILD_PLAN 2a).
**Owner page:** `/owner/puzzles`, linked from nowhere. Hidden puzzles, newest first: title (or "Untitled puzzle"), "@maker" (or "No maker"), reports, safety result, hidden date (left out when unreadable), Restore and Remove (Button sm, secondary). Remove hard-deletes the puzzle with its plays and thumbs, so it asks first in a Dialog ("Keep it" / "Remove"). Empty: "Nothing is hidden." line. A list that did not load says so with Try again and never claims to be empty. A signed out viewer or a non owner (the API answers 404) goes to the normal not found screen, the home page.

**Answers:** `/d/N/answers` for days that are over: the paragraph, every answer, "N% found it" from 5 players up, accent "Play today's daily". Linked from past days on the leaderboard and listed in the sitemap (last 60).

**Notifications:** signed in, a bell in the header (36 square, radius 8, before the theme toggle; on phones too). New ones show a count on it (`--fg` on `--bg`, "9+" past 9), checked on each page and once a minute. `/notifications`: newest first, avatar (or an Award icon for a badge), one sentence, how long ago; new rows are full strength with a 2px `--fg` bar on the leading edge. Opening the page marks all read. Kinds: "NAME followed you." (their profile), "NAME wants a streak with you." and "Your streak with NAME has started." (friend streaks), "NAME has played today and nudged you." (today's daily), "NAME invited you to play TITLE together." (the room for an hour, then the puzzle), "New badge: LABEL." (your badges).

**Badges:** earned once from verified plays: First game, Perfect daily, streaks of 7, 30, 50, 100, 365, points of 1,000, 5,000, 10,000, 25,000, 50,000, 100,000. Profile section Badges (`#badges`): earned ones as `--fg` pills; on your own page the next 3 as outlined pills.

**Circles:** `/circles` (yours, start one: name 2 to 40 chars) and `/c/CODE` (invite page for non members; members see Today and 7 days tables, Play today, Invite, Leave; owner sees Remove on members still to play). Up to 50 members, 20 circles each. Linked from the Leaders header.

**People to follow:** first section of `/players`. Up to 12 registered players, never you or anyone you follow. Row stat: "Followed by N you follow", else "N plays", else "New here". Signed in rows carry a Follow / Following button (h36, pressed = `--fg` fill); guests get a Sign in line. Search rows carry the same button.

**Partners:** detectives who work a case beside the player: Detective X (the cat, and the logo), Detective Tobs (the dino) and Detective Puff (the dog). Who they are is in the brand guide (`design/brand/index.html`); how they are drawn is `design/characters`. The robot is drawn and stays out of the game until its name is settled: no picture of it is shipped and neither the engine nor the database knows it.
- Rules are in `src/engine/partners.ts`, pure. Pictures are `public/partners/ID-MOOD.svg`, 7 per partner, written by `npm run partners:render` from the drawings: head and shoulders in hat and coat on cream, so one picture works in both themes.
- `<Partner moment>` shows the player's partner in the mood of the moment: hello (waving), empty (calm), loading (thinking), error (stumped), done (happy), found (found), asleep (sleepy). One mood per moment. It is an `<img>` with an empty `alt`, a rounded square at `--radius-xl` so it never reads as a player's round avatar. The player's own avatar stays the detective; the partner never replaces it.
- Where it shows: the You stage; the crew row at the top of Cases, calm at 48 beside the avatar; the waiting screen, full size only, thinking beside the avatar at 88; the result, at 56 beside the title, found when every word was found and happy otherwise; the empty path, calm at 40; the first screen; and the screen that asks a guest to sign in, waving at 120.
- The pick, in the first minute: on the first screen, under the character, a group "And your partner. Pick 1, change it any time." with the 3 as buttons: portrait waving at 72 over the name, the chosen one pressed with a 2px `--fg` border. Free. Left alone, it is Detective X. It is not a step of its own, so the flow keeps its 4 steps.
- Choosing a partner is on the You stage (section 6, You), not in Settings.
- Unlocking: the first partner is free. The 2nd opens at 3,000 lifetime points and the 3rd at 9,000 (`PARTNER_POINTS`; the database holds the same numbers and a test fails if they drift). Points are a threshold and are never spent: rank never drops. Buying points for a partner waits for Paystack; bought points will unlock partners and nothing else.
- A partner is on the account (`player_partners`), decided by the server: `choose_partner` gives the first free, switches among the held, and takes another only when checked points allow one more than is held. A guest holds 1 in the browser (`gazecraft-partner`) and can swap it freely; on sign in an account with none takes the guest's, and an account that has partners wins.

**Avatars:** drawn from parts in `src/avatar` (see the header of `draw.ts`). Saved as a code of positions, so part lists are append only. Starter avatar from the handle until designed. Sizes: 24 room, 28 header and boards, 32 follow lists, 40 players, 88 profile, 120 designer preview. Settings, Your character: the avatar at 88 and Edit character, which opens the editor (Dialog variant `editor`: 940 wide, full screen under 720). Editor: a stage in the chosen background colour with the avatar at 168 and round icon buttons (dice = Surprise me, undo); four icon tabs (Face, Hair, Wear, Scene: smile, scissors, shirt, palette); one pane of choices that is the only scroll; footer with a status line, Cancel or Done, Keep this look. Colours (skin, hair colour, background) are 44px dots. Other parts are 72px close-up tiles with names: face parts zoom on the face, hair on the head, outfits on the chest. Hair shows one family at a time (Cuts and fades, Afros and curls, Braids and locs, Long and tied, Headwear). Surprise me keeps skin, hair colour, facial hair, marks and mouth item, and only draws styles that suit the look already built (styles carry an optional `look`). One question is asked, once, of a new player: "Who are we dressing?" (section 6, The first minute). The answer is kept with the avatar as its `look` (`feminine`, `masculine` or `mixed`; none when it was skipped). It only puts the hair and outfit choices that suit it first and steers Surprise me. It locks nothing: every style stays open to everyone. It is shown to nobody and never used for ranking, matching or ads. With no answer, or `mixed`, the editor is as it always was and Surprise me reads the look from the design. Existing players are never asked: the Wear tab opens with the same 3 choices, saved on tap. Starter avatars use only for-anyone hair, no facial hair, a tee. The look is read from hair and facial hair only; outfits are costume. Face tab starts with a Mood row (Happy, Lovestruck, Star gazing, Laughing, Cheeky, Sleeping, Sad, Crying, Shocked, Angry, Blowing a kiss) that sets eyes and mouth together. Scene tab holds Background and Festive (Santa hat, antlers, witch hat, pumpkin, ghost, hearts, party hat, Naija, snow, crown, bunny ears, clown), drawn on top of everything and kept by Surprise me.

**Tab bar (phones, app pages):** a floating dock, 12 from the sides and the bottom plus the safe area, `--tabbar-h` 64 high, `--surface` with a 1px `--line-3` border, radius `--radius-dock` 22 and a hard lower edge of `--ledge` 4 in `--line-3`. Tabs: icon 20 inside a 48 by 28 pill over an 11/800 label, `--muted`; the active tab is `--fg` with the pill filled `--surface-2` (shape and weight, never colour alone). Hidden on landing, puzzles and the first minute. It slides below the screen on a scroll down and comes back on any scroll up (section 8, Dock quick return).
- 5 slots, ordered by what a player reaches for, nearest the thumb first: Cases, You, Play, Squad, Ranks.
- Play, in the middle: a 60 disc raised above the dock, `--fg` fill with a `--bg` Play icon and its own ledge, sinking by the ledge when pressed. One tap from anywhere to the next thing to play: today's daily while it is unplayed ("Play today's daily"), then the next clue on the path ("Play the next clue"), so the best spot on the screen is never dead for the rest of the day. Only when the daily is done and every case is closed is the disc `--accent` with a Check, leading to Cases.
- Cases, first: where the game lives, and where people look for home.
- You, beside Play: the stage (`/me`). The tab's icon is the player's own avatar at 24. A character made one's own is what brings players back to a game like this, so it sits next to the button pressed most.
- Squad, then Ranks, on the far side: other people. Fewest visits, so furthest from the thumb.

**Outfits, earned:** 5 detective pieces are earned and nothing else is: everything that helps someone look like themselves stays free, always. The rules are in `src/avatar/earned.ts`, the drawings in `src/avatar/parts/kit.ts` and the outfit list, all append only.
- A new avatar part, Detective kit (letter `d`), worn one at a time and drawn on top: Badge (close 1 case), Magnifying glass (close 5 cases), Detective hat (reach the rank of Detective), Full kit, which is all 3 together (close 10 cases). And one outfit, Detective coat (reach the rank of Inspector).
- Cases closed are counted in this browser, the way the path counts them. Rank comes from the account's points, so a guest can earn the case pieces and not the rank pieces.
- In the editor, under Wear: a piece not yet earned is shown with its drawing, a dashed border, a Lock icon and how to earn it ("Close 5 cases.") in place of its name. It is not for choosing: `aria-disabled`, and its accessible name ends "Locked. Close 5 cases.". A piece already worn is never locked.
- An earned piece is never handed out by chance: Surprise me leaves the kit alone and never picks the coat, and no starter avatar has either.
- The lock is in the editor only. The database takes any saved avatar code, as it always has: these are cosmetic and change no score.

**Culprits:** every case has one: an ordinary character (`avatarFor` on the case's seed) who hid something, under a disguise until the case is closed. Disguises are drawn on top of the avatar the way Festive touches are, in a layer of their own so the unmasking can lift them off: `DISGUISE_STYLES` in `src/avatar/parts/disguises.ts`, append only, 6 to start (eye mask, joke glasses, paper bag, neckerchief, hat and shades, carnival mask). A disguise is never part of a player's avatar: not saved in an avatar code, not in the designer. Who a culprit turns out to be is a line from the `culpritWho` pool ("the baker"). `<Culprit>` is decorative: the lines beside it carry the meaning.

## 6. Screens (prototype file in brackets)

**Landing `/`** [Gazecraft Landing]
Top to bottom:
- Hero, two columns (one under 900). Left: "Do you have" / "what it takes?" (`--subtle`) at clamp(34px,5.6vw,72px), smaller than `display` because it shares the row; a pitch line; primary "Play today's daily" to `/d/N` and secondary "Try it here" to `#how`; 4 avatars at 32 and "Free in your browser. Play as a guest, sign in when you want your name on the board." Right: a game in play. 3 avatars (up to 96) lean over the top edge of a card with the dock's border, radius and ledge; each carries a chip with a word they found. The card: title, "4 / 8", ProgressLine, the paragraph with the found words filled, then all 8 chips (found, or one • per letter). The paragraph is a landing-only puzzle ("Around the world", 8 cities), built by the engine, so nothing in the catalogue is spoiled.
- The promise, straight under the hero. h2 "Slow down. Look closer." and one line: "One paragraph a day, with words hidden in plain sight. About 5 minutes, then it is over." Under it 3 columns (one under 760), each an h3 and a line: "It ends", "It is worth reading", "It respects you". Text only: no cards, no icons, no numbers from research.
- `#how`, h2 "Two ways to find a word". Two demonstrations side by side (stacked under 640), each one short line with one hidden word on `--surface`. "With a mouse": a cursor (MousePointer2) presses on the first letter and drags to the last. "With a finger": a hand (Pointer) taps the first letter, then the last. Captions "Drag across the letters." and "Tap the first letter, then the last." Under them, the inline demo sentence with 5 words (Amos, Atom, Data, Rome, Gold) and side list. Hint link cycles Give me a hint → Show it → Play again. On 5 found: accent "That was the warm up. Now find 26." to `/play/nigeria`.
- h2 "More than one way to play". 4 cards, 7 and 5 of 12 columns then 5 and 7 (one column under 760), each a preview, an h3, a line and a TextLink: "A new one every day" (today's kicker and title, a 7 day strip) to `/d/N`; "Play it together" (a room code, 3 players with a found chip each) to `/play`; "Climb the board" (3 ranked rows, scores from the engine) to `/leaderboard`; "Look like yourself" (8 avatars) to `/players`. Preview players, the room code and the run are illustrative.
- Games list with 3 steps and "Or type any topic" to `/play`, about (the origin story, then the promise in one sentence), footer CTA "Start playing".

First visit on a phone (under 760, nothing finished in this browser yet: no demo, no game, no daily): the page opens on the demo sentence, not the pitch. h1 "Words are hiding in this sentence.", then the demo with its list. Everything above stays, below it, in the same order; the hero heading becomes an h2, "Try it here" is left out and `#how` keeps its two demonstrations. One guided find: a hand (Pointer) taps the first letter of the first hidden word, then the last, on a loop, and that first letter wears the hint ring. Above the sentence: "A word is hiding where the hand points. Tap its first letter, then its last." and a "Skip the guide" link. The first find of any word, or Skip, ends the guide for good (`gazecraft-guided`); after that the player is alone. No slides. Finishing the demo, a game or a daily makes the visitor a returning one. Returning visitors and wider screens keep the order above. Stored data that is missing or unreadable counts as a first visit.

The only accent button is the one the demo earns. Landing avatars are drawn from fixed parts, never looked up, so a guest loads no auth or data client.

**Games `/play`** [Gazecraft home view]
- PageHeader "Games". Action: TextLink "Make a puzzle" to `/make`, once unlocked.
- Order: daily card, week, room invites, the path, All games, any topic. The daily is first, always.
- Daily card: kicker `Daily #N · date` `--accent-ink`, title, sub. Unplayed "One try. Count hidden. Wrong picks cost 10.", or a `streakKeep` line on a run of 2 or more, or else one `todayDeep` / `todayLong` line when today holds a deep or a long word (what it holds, never how much) + primary "Play today" (the next clue on the path is the one accent on this screen). Played "Done for today. You found N. New puzzle at midnight." + secondary "See result".
- Week, under the daily card, once this player has 1 finished daily: a Ring at 40 with 7 parts, one per UTC day, oldest first, ending today; a played day is done. Beside it `weekDays` ("Played 5 of the last 7 days.", 15/700) over `runMonth` ("Current run: 4. Days this month: 9.", 14 `--muted`). Days this month counts dailies in the current UTC month, so a break does not zero everything. Days come from this browser plus stored plays when signed in. Rest days have a state and a drawing but nothing grants one yet: the server will.
- The path (`<Journey>`), the first thing under the daily and the week. It replaces the list as the way in, it does not sit on top of it. h2 "Your path", a Ring at 20 and `journeyCount` ("7 of 108 clues").
  - Names: a case is one puzzle, a clue is one sitting, and the unmasking is the last clue of a case, the whole puzzle. In the UI and the code, never chapter or stop.
  - Cases come from the engine (`buildPath`): one per catalogue puzzle, a category kept together, easy to hard inside it. The clues of a case are its passages in reading order, then the whole puzzle, with its board and scores as they are. A puzzle that is not cut is a case of 1 clue. A clue is kept under `ID~N`, the unmasking under the puzzle's own id (`clueId`).
  - Each case is a card with the dock's border, radius and ledge: h3 title and how many clues are left (`cluesLeft`, `clueLeft`: "3 clues left"), never how many minutes. Only the case being worked shows its clues. A closed case folds to its card: the title is a link to `/play/:id` ("Closed. Play again."), its Stars, and an Award icon with a `caseDone` line (the case badge). A case not reached is flat with a Lock icon, not a link, and says why from `journeyLocked` ("Finish Books of the Bible to open this.").
  - Under the open card, the clues: an ordered list of round discs on a winding line. Discs are `--journey-clue` 64 (`--journey-clue-big` 80 for the unmasking, which also carries a "Last clue" tag), `--surface`, 1px `--line-3`, with a `--ledge` lower edge, and sink by the ledge when pressed. They sway left and right by `--journey-sway` per step. The line is drawn, not moved: solid `--muted` where the player has been, dotted `--line-3` ahead. Under each disc its name (13/700, at most `--journey-label` wide): "Clue 2", and "Unmasking" on the last.
  - Done: a Check in `--accent-ink` (lime means found), Stars under it, a link so it can be replayed (`/play/:id/:n`, the unmasking `/play/:id`). Next: the player's avatar stands on the disc (a guest's starter until there is one), ringed and ledged in `--accent`, with a "Next clue" tag. It is the one accent on the screen and a link. Locked: `--subtle` on `--bg`, a Lock icon, a dashed border, not a link, `aria-disabled` with the reason from `journeyLocked` ("Finish clue 2 to open this.").
  - State never reads by colour alone: tick, avatar and lock are shapes, and each clue's accessible name says "Done", "Next clue" or "Locked".
  - Done means holding stars (`gazecraft-stars`), or, for a whole puzzle, finished in this browser (`gazecraft-finished`). A whole puzzle done closes its case, passages and all, so play from before the path or before the cut counts. A done clue with no stars on record shows no stars. A puzzle no longer in the catalogue takes its case with it and blocks nothing. Guests travel the path too.
  - A room plays the whole puzzle, never a passage. The daily is not cut and is not a clue: a daily play closes no case.
  - The case file, on the open case only, between its card and its clues: the culprit in disguise (`<Culprit>` at 48), one `caseOpen` line (14/600 `--muted`) and the secret so far (`<SecretSlots>`). A closed or locked case shows no file, and the word is never on the page before its case is closed.
  - Every clue done: a calm card above the cases, the avatar and a `journeyDone` line. No accent. No cases at all: one `journeyEmpty` line in the same card.
- Stars: 3 Star icons in a row, earned ones filled `--fg`, the rest outlined `--line-4`, so the count reads by shape. One accessible name from `starsOf` ("2 of 3 stars"). Never lime.
- LevelBadge (built, mounted once levels come from the server): a Ring with the level number inside it (Manrope 800, tabular), the rank beside it (14/700): Rookie, Detective, Inspector, Chief, 5 levels each and the last with no end (`RANKS`) and "120 / 600" (13 `--subtle`). The Ring shows points into the level. No points yet: level 1, an empty ring.
- "All games", h2, under the path: FilterTabs, GameRow list from `data/games.json` sorted by filter order. Every puzzle playable in any order. A finished row shows its best Stars after the meta.
- Pack shelves: a line above the first row of each category, the category name (13/700 `--fg`) and `shelfDone` ("4 of 12 finished", 13/600 `--subtle`). Finished means played to the end with at least 1 find, kept in this browser under `gazecraft-finished`.
- Empty filter (no game in a category): "No games here yet." and TextLink "See all games".
- "Or any topic" input + "Create puzzle", once Make is unlocked, or at `/play#any-topic`. A wait longer than 1 second shows the Waiting screen (full) over the page under the header: the player's avatar at 88, 3 dots, one line from the `waitingMake` pool and a Cancel link. Under 1 second it never appears. Once shown it stays at least 600ms. Cancel stops the request and returns to the input with the topic kept. A second tap or Enter sends nothing. After 5 minutes the request is stopped and the `genFail` line shows. Empty: "Give us something to hide words in first." Failure: `genFail` line. Limit reached (429): `genLimit` line with the time from `Retry-After`. Offline: `genOffline` line. Every failure keeps the topic in the input.
- Background making, server ready and not yet used by this screen (BUILD_PLAN section 5): `startGenerate` answers at once with a job, `runGenerateJob` is the long request that does the work, `getGenerateJob` is asked every 5 seconds. The job id is kept in the browser. When the state says `run`, nobody is working on it: call `runGenerateJob` again. Done carries the puzzle code; failed carries `generate_failed` or `not_allowed`.
- Waiting elsewhere, only when the wait passes 1 second: a slow page load and opening a puzzle by link `/p/CODE` (full, `waiting` pool), making share images and publishing in Make (inline: avatar at 40, dots beside it). Anything that normally answers in under 1 second keeps its button text.

**The 4 tabs: one job each** (BUILD_PLAN 3a)
What was on each page on 9 Oct 2026, and where it sits now. Nothing was dropped. Sections are separated by space and a 2px rule on a list, never by a box. A box is kept only for an object you can pick up: the daily card and a room invite.

| Tab | Job | Leads with | Then | Moved |
|---|---|---|---|---|
| Games `/play` | Play | Daily card | Week, room invites, games list with shelves, any topic | The two line `display` heading is now the PageHeader. Room invites went under the daily and the week. "Make your own puzzle" went from under the list to the header action. Any topic waits for the Make unlock (`/play#any-topic` always shows it) |
| Leaders `/leaderboard` | See where you stand | Today's board for your crowd | Day buttons, the line about totals, puzzle boards | "Your circles" went from a link above the title to the header action. "Find players" left the top: Players is a tab, and the empty Following board still links it |
| Players `/players` | Find people | People to follow, with search over it | Friend streaks, Top players | Most points, Longest streaks, Most perfect dailies and New this week were 4 sections side by side. They are 1 section, Top players, with a Segmented (Streaks, Perfect, New, Points) and one list. Friend streaks went from first to second |
| You `/u/:handle` | Your records | Avatar, name and level badge, then Points, Your records (own page only) and the stats | Last 14 dailies, badges, recent plays, followers and following | Settings went from the button row to the header action (your own page). The name is Manrope (`row`), not Bungee: a name is never set in the display face. Badges went under the 14 day strip |

- PageHeader titles: "Cases", "Ranks", "Squad", "You". The dock and the header use the same names, and the dock's middle button is "Today" with a Search icon. Signed in, the dock's You tab is the player's own avatar at 24, not an icon. In this spec the tabs are still called by their old names, Games, Leaders and Players (another player's page: "Player"). `/leaderboard/:id`, `/circles` and `/c/CODE` are not tabs and keep their own titles.
- Leaders, signed in: the board opens on your crowd. Circle (your first circle) if you are in one, else Following if you follow anyone, else Everyone. Segmented Circle / Following / Everyone; a choice is kept in the address as `?board=circle|following|everyone` and wins over the default. Circle is offered once you are in one or circles are unlocked. The circle board lists members with a verified score, then "N still to play." and a link to the circle. Guests see Everyone and no Segmented.
- Bordered boxes, counted 9 Oct 2026. Games: 2 kinds, both objects, both kept (daily card, room invite). Leaders, Players, You: none that only group. Controls (day buttons, Follow, the "You" chip, badge pills) are not sections.

**Less at once** (BUILD_PLAN 2c, `src/lib/unlocks.ts`)
An entry point appears when the player has done what it scores. The rules hide links and sections, never a route: every page opens from its address, and a section opens from its anchor.

| Appears | When | What it shows |
|---|---|---|
| boards | 1 finished game | "See the board" under the week on Games |
| points, badges | 1 verified play | Points and Badges on a profile, the Points list on Players |
| circles, friend streaks | 3 dailies | "Your circles" and the Circle board on Leaders, Friend streaks on Players |
| make | 5 plays | "Make a puzzle" in the Games header, any topic under the list |

- First visit: the daily card and the games list, nothing else.
- Counted from what the browser already holds (finished dailies, `gazecraft-finished`) and, signed in, the player's stored plays. Stored data that is missing or unreadable counts as a first visit.
- Once shown, always shown: unlocked names are kept under `gazecraft-unlocks`. A player who is already in a circle or a friend streak sees it whatever the count says. Opening `/players#friend-streaks`, `/play#any-topic` or `/u/NAME#badges` shows that section at once.

**Empty states on the 4 tabs.** A list never leaves a heading over nothing. Nothing yet: one calm line and, where it helps, one link. A list that did not load says so ("This list did not load. Try again in a moment.") and never claims to be empty. A stat with nothing behind it is left out, not shown as 0 of 0: Clean reads appears beside the 4 stats only at 1 or more. Your records (own page, in this browser) lists only the records that exist; with none it is one line that says where they come from. Unreadable storage is no records. A title, maker or date that is missing is replaced or left out, never printed as a blank or "undefined".

**Game `/play/:id`, `/d/:n`**
- Back "All games", `Category · Level`.
- Title "Find 30 books of the Bible" (daily "Find the hidden books of the Bible") + BigClock.
- Stats: Ring at 20, "12 / 30" (daily "12 found"), "2 hints". The ring fills by found over total and closes on the last find.
- Daily: no ring and no total while playing. With 3 or fewer left, and at least 1 found, `leftCount` ("3 left", 700 `--muted`) joins the stats and the ring appears showing the gap. The number comes from the session, never typed. After the finish the ring shows the result.
- Two columns wrap: puzzle (flex 3, min 520) and WordList (flex 1, min 260), gap clamp(32px,5vw,72px).
- Instruction: "Drag across the letters. Answers can run across spaces and punctuation." Touch: "Tap the first letter of a word, then the last."
- Under puzzle: "Give me a hint", "I'm done", live message (`aria-live="polite"`).
- Daily list shows found rows only + "More are hiding. How many? That is the game."

**Results** (above puzzle, smooth scroll to top)
Title, line ("Every answer found." or "The ones you missed are shaded below."), stats Score / Found / Time, actions Play again (not daily), More games, Share (accent). Guest strip: "You are playing as a guest. Sign in and this score goes with you, with your streak and your name on shared cards." and the link "Keep this score" to `/welcome?from=` this page. After today's daily the text is one earned fact in its place (`guestAsk` in `src/lib/guestAsk.ts`), and the link stays:
- Where the score would stand: one `guestPlace` line, "That score is place 14 of 60 today." The place comes from the server (`daily_place`), from the guest's own score against the checked plays, with the guest counted as one more player. Only on a board of 6 or more. A place that cannot be one is never printed.
- Where the run lives: at a run of 3 days or more, one `guestRun` line, said once in this browser (`gazecraft-run-told`) and before the place: the run is kept in this browser only, and sign in keeps it anywhere. Information, never a threat: no line says what the player would lose.
Nothing is locked for a guest and nothing is taken away. Play first stays.

**You `/me`** (the dock's You tab)
A stage, the way a runner game shows its characters: who you are is the front of the game, not a setting. Guests have one too.
- PageHeader "You". Action: "Settings" signed in, "Sign in" for a guest.
- The stage: a card with the dock's border, radius and ledge. On it, side by side at 128, the player's avatar over their name and their partner over its name. Signed in, the LevelBadge under them. Then one row of actions: the one accent button of the screen when there is something to choose, else one line saying how things stand ("Detective X is with you."), and a secondary "Edit character" that opens the editor.
- Under the stage, rows to swipe (each row scrolls sideways by itself; the page never does). Cards are 132 wide with the ledge: a picture at 88, a name, a state line. The card on the stage has a 2px `--fg` border. A locked card is dashed and flat with a Lock, and can still be tapped.
- Tap a card to try it: it goes onto the stage at once, nothing is saved. The accent button then says what choosing it does ("Select Detective Tobs", "Wear the badge", "Take the gear off") and choosing it saves and clears the try. A locked card says what opens it in place of the button ("Locked. 1,760 points to go.", "Locked. Close 5 cases.").
- Partners row: the partners. State: "With you", "Yours", "Tap to try", or the points it opens at.
- Detective gear row: "No gear" and the 5 earned pieces, each drawn on the player's own avatar. State: "On you", "Yours", or how it is earned.
- Last, one link: the player's profile, badges and records. A guest is told their choices are kept in this browser, with a link to sign in.
- Settings holds the account only (name, sign out, reminders, theme, delete) and one line pointing here.

**Cases, the crew row:** the first thing on Cases, above the daily: one pressable row with the dock's ledge. The player's avatar and partner at 48, "NAME and Detective X", and "Change your detective, partner and gear". It leads to `/me`. No accent.

**Guests:** a guest plays 2 games to the end, of any kind. Opening a 3rd shows one screen in place of the game: the partner waving, h1 "Sign in to keep playing", one line saying nothing is lost, an accent "Sign in" to the first minute and a link back to Cases. A game a guest already played stays open, and the result of their 2nd is never covered. The count is kept in this browser (`gazecraft-guest-played`). Signed in, nothing is counted. Sign in not set up: no limit.

**Sitting `/play/:id/:n`**
One passage of a catalogue puzzle, played as a game of its own: a clue of its case, reached from the path. The same screen as a puzzle, with these differences:
- The meta line says `Category · Clue 2 of 8` in place of the level, the whole puzzle counted as the last. The title counts the words in the passage: "Find 4 books of the Bible".
- The result leads with one accent button to the next sitting, "Next clue". On the last passage it is "The unmasking", the whole puzzle, which stays the hard one. It takes the screen's one accent, so Share is secondary here. The next sitting is one tap away and never starts by itself.
- Its own kept game, result and stars (`gazecraft-resume-ID~N`, and `ID~N` in `gazecraft-stars`). A clean read is said as in any game.
- Never ranked and never sent to the server: no board link, no `?vs=`, no room, no points. Its time is no personal record. A passage is never set against a whole puzzle.
- Games started and finished on a passage count toward its puzzle in the sponsor report, and the sponsor's mark shows as on the puzzle.
- A number that is not a passage, or a puzzle that is not cut, opens the whole puzzle. A puzzle that is not ours opens the games list. No dock, as on any puzzle.
- The result shows the piece this clue gave (`<CasePiece>`): the secret's slots with the new letters popping in, and one `pieceFound` line ("A piece of the secret: OP."). A clue with no letters to give shows the slots and no line.

**The unmasking** (the result of a whole catalogue puzzle played alone)
`<CaseClosed>`, in the result under the stars. Not in a room, not on the daily, not on a puzzle that is not ours.
- The culprit at 72, the mask lifting off once. Beside them the stamp: an `h3` "Case closed" in `--ink-heading`, in a ruled box of the same ink, radius `--radius-md`, set at a slant of 6 degrees.
- The secret, whole, in its slots. Then one `confession` line (15/700): who it was, from `culpritWho`, and what they hid, in their own words. The motive is a surprise, a joke or pride, never harm.
- The calling card: a small card with an Eye icon at 16 and one `callingCard` line (13/600 `--muted`). The same card on every case: one unseen figure is behind them all.
- No lime here: the screen's one accent is still Share. No cutscene, nothing to tap through, nothing that holds the player on the screen.
- Played again, a closed case shows the same unmasking.

**The first minute `/welcome`** (BUILD_PLAN 3b)
Play first, account later. For a new player only: an account with a profile never sees a step and is sent on to where it came from. One question per screen, each with an h1, a Skip, and a Ring at 40 beside "Step 2 of 4" that fills by the steps behind the player. No dock. Steps, in order, from the pure machine in `src/lib/onboarding.ts`:
1. Character. h1 "This is you." A finished character is shown, so keeping it is one tap and nothing has to be chosen. The avatar at 120 (a guest's starter until there is one), secondary "Change it" (the same editor as Settings), accent "Keep this look". Under it "Already have an account? Sign in", to `/signin`.
2. Sign in. h1 "Sign in to keep it." over the same email form as `/signin`. Skip keeps the player a guest: the name step is dropped and the ring counts 3.
3. The outfit question. h1 "We believe you should look good." The question, as the group's name: "Who are we dressing?" 3 buttons, one tap each: "A woman", "A man", "I'd rather not say". Under them: "So we pick hair and outfits that suit you. Change it any time." "I'd rather not say" is a full answer (`mixed`), not a skip.
4. Name and @handle, last, signed in only. h1 "What should we call you?" Both prefilled (the Google name, else the first word of the email address; a handle already taken gets a short tail before it is shown), accent "Start finding" accepts in one tap. Skip gives a neutral name ("Reader", `@reader_x7k2`) and says so on the screen first, so nothing from the email is published without a tap.
- The flow ends on today's daily, never a menu. A player who came through `/signin?next=` for something specific (a streak invite, a circle) ends there instead.
- Kept in this browser until there is an account: the answers so far (`gazecraft-onboarding`), the character (`gazecraft-guest-avatar`) and the look (`gazecraft-look`). They move to the account the moment its profile exists, with the guest dailies. An account that already has a character or a look keeps its own.
- Leaving half way and returning resumes at the first step with no answer. Skipping everything ends on today's daily and is not asked again. Signing in on a second device with a profile shows nothing. A signed in player with no profile yet (the name step failed or was left) is a guest everywhere and meets the name step at `/signin`. Missing or broken stored data reads as no answers. Sign in not set up: Character and the outfit question only.
- A guest's character shows wherever a guest has one: the waiting screen and this flow.

**Mobile <760**
Fixed bottom bar (`--bg`, top 1px `--line-2`, pad 12 16 + safe area): Ring, count, "3 left" on a daily near its end, time at the far end; live message, Hint and Done (h44). Main padding-bottom 96. WordList static below puzzle. BigClock hidden.

**Share sheet** [Gazecraft Share Card]
Preview (max 300) + controls: Result / Puzzle, frame 1:1 · 4:5 · 9:16, text Excerpt / Full puzzle, Show my finds toggle ("Off. Nothing is spoiled." / on stamps "Contains answers" / daily "Locked for daily puzzles until tomorrow"). Actions "Share image(s)", "Copy link". Defaults Result, 4:5, Excerpt, off.

**Sign in `/signin`, `/account`** [Gazecraft Sign In]
Google + email OTP → 6 digit code (auto submit, resend after 30s) → a new account goes to `/welcome` (above) for its character, the outfit question and its name (@handle autofilled from name until edited) → return to `next`, or today's daily when there is none. An account with a profile goes straight to `next`. Account: initial avatar, name, handle, email, dailies played, streak, Sign out, Delete account (confirm).

## 7. Share cards
- 1080 wide. 1:1 1080 pad 80 · 4:5 1350 pad 88 · 9:16 1920 pad 240 96 260.
- Text never under 38px. Overflow: step down 1px to 88% of base, then paginate.
- Excerpt: whole sentences, window with most target answers, within first-page char budget (`tokens.json` `shareCard.charBudget`).
- Full: greedy sentence pages. Bible 4:5 = 4 pages.
- Daily hides count and locks finds.
- Export PNG in browser (`html-to-image`), `navigator.share({files})`, else download. Worker renders 1200x630 OG with the same layout.

## 8. Motion
Durations and easings are tokens. Reduced motion sets them to 0 and disables FLIP and hover slide.

Rules for any new motion (from Emil Kowalski's design engineering skill, linked in `BUILD_PLAN.md`):
- `--ease-out` is `cubic-bezier(.23,1,.32,1)`: it moves most in the first moments, so the screen answers at once. Used for anything entering, leaving or pressed. `--ease-std` for colour. Never ease-in.
- Only `transform` and `opacity` move. Name the properties, never `transition: all`.
- Under 300ms for anything in the interface. Longer only for the landing how-to and rare moments (a level, a badge).
- How often it is seen decides how much it moves: many times a day (a find, stepping the reveal, a tab) little or nothing; rare moments can carry more.
- Nothing grows from scale 0. Start at 0.8 or more.
- Hover styles sit behind `(hover: hover) and (pointer: fine)`, so a tap on a phone does not leave one stuck.

| Element | Transition |
|---|---|
| Letter | bg, color 180ms ease |
| Hint hand | rises 6 and fades in once, `--dur-slow` `--ease-out`. It does not loop |
| Tab bar | active pill pops from 0.8 scale, `--dur-slow` `--ease-out`; a pressed tab's pill scales to 0.9; the Daily disc sinks by `--ledge`, `--dur-fast` |
| Word chip | bg, color 250ms ease |
| GameRow hover | padding-left 0→12, color 250ms ease |
| FilterTab, Button, Toggle | 200ms ease |
| Button press | scales to 0.97 while held, `--dur-fast` `--ease-out`. Not when disabled. Hover fills only with a mouse |
| Progress | width 400ms ease |
| Ring | the fill's stroke-dashoffset, `--dur-slower` `--ease-out`; stroke colour `--dur-base` `--ease-std` when it closes. Like Progress, it is drawn, not moved. Segmented rings do not animate. Reduced motion: it jumps to its value |
| Clock finish | color 300ms ease |
| WordList reorder | FLIP translateY. Found row 520ms z2, others 420ms, `--ease-out`. Scroll list to top first |
| Finish | smooth scroll to top 400ms after last find |
| Landing how-to | two loops of 420ms beats. The pointer moves between letters with `--dur-slower` `--ease-out` and shrinks to 0.84 while pressed, `--dur-fast`. Drag: wait, reach the first letter, press and mark one more letter each beat, let go and the word is found, hold 3 beats. Tap: wait, reach the first letter, tap (it marks), move to the last, tap (the whole word marks), found, hold 3 beats. Reduced motion: no loop, the word shown found with the pointer on its last letter |
| First find guide | first visit on a phone only, on the landing demo, the same beats and moves as the how-to: the hand reaches the first letter, taps, moves to the last, taps, waits, and starts again. `transform` only. It stops for good on the first find or Skip. Reduced motion: no loop, the hand rests on the first letter, which keeps its hint ring |
| Welcome steps | no motion between steps. The Ring uses its own transition as it fills |
| Waiting | the one loop outside the landing, so it is allowed past 300ms. Avatar bobs up `--space-1` and back, `--dur-bob` each way, `--ease-loop`. 3 dots in `--muted` hop `--space-1h` one after the other, a `--dur-bounce` cycle, each `--dur-bounce-step` behind the last, `--ease-loop`. Only `transform` moves. No blink: the avatar is drawn by `<Avatar>` and is not redrawn. The line changes every 20 seconds with no motion. Shown after 1 second, kept at least 600ms. Reduced motion: no bob, no hop, the line still changes |
| Journey hop | once, when the player returns to the path with a new next clue: the avatar hops from the clue it stood on to the new one in an arc, or drops in when the new one opens a case, `--dur-hop` `--ease-out`. `transform` only. A rare moment (once per finished clue), so it may pass 300ms. Pressing a clue sinks it by `--ledge`, `--dur-fast`. The line and the discs do not animate. Reduced motion: the avatar is simply on the new clue |
| Stars | on the clue or the case just finished, and on the result screen: earned stars pop in one at a time, each from 0.8 scale and 0 opacity, `--dur-star` `--ease-out`, each `--dur-star-step` behind the last. Stars already seen do not move. Reduced motion: all shown at once |
| Secret piece | on a clue's result: the slots this clue filled pop in, each from 0.8 scale and 0 opacity, `--dur-star` `--ease-out`. Slots held before do not move. Reduced motion: shown at once |
| Unmasking | once, on the result that closes a case: after `--dur-slower` the mask lifts up and off the culprit (`transform` and `opacity`, `--dur-unmask` `--ease-out`), then the "Case closed" stamp lands from 1.5 scale and 0 opacity, `--dur-stamp` `--ease-out`. A rare moment (once per case), so it may pass 300ms. Reduced motion: the mask is simply off and the stamp is down |
| Dock quick return | phones: the dock slides below the screen on a scroll down and back on any scroll up, `transform` only, `--dur-slow` `--ease-out`, the same rule as the header (8px of scroll before it moves). Always shown near the top, at the end of the page, on a new page, and while focus is inside it. Reduced motion: it is there or not, with no slide |
| Level up | the LevelBadge ring fills from where it was to closed, using the Ring's own transition, and the level number pops from 0.8 scale, `--dur-slow` `--ease-out`. Reduced motion: the ring is closed, nothing pops |

Nothing else animates.

## 9. Game system
- Registry: `type -> { build(def), check(puzzle, sel), Board }`. Shell (clock, progress, list, hints, results, share) is shared. Current type: `hidden-words`.
- Difficulty (computed): Hard if 20+ answers or 900+ chars. Easy if 9 or fewer and under 260 chars. Else Medium.
- Score: 100 per find, -25 per hint, -10 per wrong daily pick, + max(0, 600 - secs) when all found. Floor 0.
- Daily: `dayNo` from 2026-01-01 UTC, game = `dailyPool[dayNo % len]`. Server decides.
- Passages: `passages(puzzle)` in `src/engine/passages.ts` cuts a puzzle into short sittings.
  - A cut is made only at a sentence end that no answer runs across, and never before a sentence that opens on a small letter ("Need a pen? asked Mika." is one sentence to a reader).
  - A sitting is a sentence, or 2 or 3, that hides 3 to 5 answers: about a minute of play. Never fewer than 3, so a sitting ends with something won. There are as many passages as that allows, and among those the most even: 4 and 4, not 3 and 5. A passage runs past 3 sentences only where sentences in a row hide nothing, and holds 6 answers only where the text gives no other clean cut. A puzzle that cannot be cut into 2 that each hide 3 stays whole: one passage.
  - A passage is its text, where it starts in the whole puzzle's letters, and the answers inside it. With the puzzle's `dict` it builds into a puzzle of its own that hides exactly those answers. A word hidden twice can be in 2 passages.
  - On 10 Oct 2026 the 25 catalogue puzzles cut into 83 passages, every puzzle into at least 2. 81 are 3 sentences or fewer; the other 2 are in the Bible puzzle.
- A passage can be played (`/play/ID/N`, section 6, Sitting) and is a clue on the path (section 6, Games).
- The secret (`src/engine/secret.ts`, `data/secrets.json`): what was hidden in a case, as one word.
  - The word is picked by the engine from a pool of everyday things (BELL, LANTERN, JOLLOF), never typed against a puzzle. A case asks for the word its id points at and takes the next free one when that is gone, so no 2 cases share a word while the pool lasts. The order cases arrive in changes nothing.
  - Every clue gives one piece: 1 to 3 letters in their true place in the word, so the word fills in like a crossword and can be guessed before the end. Pieces are not handed out left to right. The unmasking gives the last piece. A word has a letter for every clue; where the pool has none that long, the longest is used, some clues give nothing and the unmasking still gives one.
  - Nothing is stored. The word comes from the puzzle's id and the count of clues in its case, and the pieces a player holds come from the clues they have done (`caseFile`, the same stars and finished puzzles the path reads). So a puzzle whose text changes keeps its secret. One whose count of passages changes may get another word, and the pieces shown are still pieces of the word shown: a change never breaks a case.
  - An empty pool gives the word SECRET. More cases than words: words repeat.
  - The culprit (`culpritOf`): a seed for an ordinary avatar, a disguise and who they are, all from the case id, the same on every device.
  - Rooms, a squad: a room game on a catalogue puzzle shares one secret. Under the room bar, `<SecretSlots>` and one `squadSecret` line (14/600 `--muted`). Every word anyone in the room finds counts: the passage pieces come in the order of the case, evenly as the finds climb, the last of them when the squad has found 80% of the words (`squadPieces`, the same mark as 2 stars). New letters pop in as a clue's do. A piece a player already held from a clue of their own stays held.
  - The finish gives the last piece. A squad that then holds every piece gets the unmasking, as a player alone does. One that fell short sees the slots and one `squadShort` line saying how many letters it read, and the mask stays on. Nothing about a squad's secret is stored or sent: each screen works it out from the finds it already shares.
- Cases on the server (`supabase/migrations/20261010000500_cases.sql`, `src/lib/progress.ts`):
  - Signed in, a finished sitting is sent like any play, with its clue number. The Worker replays it against that passage and keeps the best stars and the best score per clue. A clue is on no board. The whole puzzle is sent and ranked as before.
  - The path still reads this browser. On sign in and on every visit signed in, the browser and the account are levelled (`syncProgress`): clues done here go up, clues done on another device come down, stars only ever rise, and the path redraws if anything came. Either half can fail and nothing is lost.
  - A guest's clues and whole puzzles move to the account on sign in, unverified: the stars carry, no points and no badge. A checked play of the same clue later takes its place.
  - 2 devices with different progress end with both. A player with plays from before cases existed has those cases closed: a checked whole-puzzle play is a closed case, with 3 stars for a clean read, 2 for 80% found, else 1.
  - Points now count each clue's best checked score once, beside dailies and each whole puzzle's best. Ranks (Rookie, Detective, Inspector, Chief) are worked out from points on the server by the same numbers as `src/engine/level.ts`, and a test fails if the 2 drift apart. The profile's LevelBadge reads points from the server.
  - Badges: "First case closed", then 5, 10 and 25 cases closed, from checked whole-puzzle plays.
- Roadmap types (not in v1, see Gazecraft Future Games): Mirror, Liar, Relay, Buried sums, Unmask, Trace, Bury it. Each must fit the registry without shell changes.
- Families (not in v1). Gazecraft is more than one game, the way the reasoning papers at school were: Verbal, Quantitative and Non-verbal. Every family is the same skill, looking closely, on different material.
  - Verbal: words. `hidden-words` today, then Mirror, Liar, Relay, Unmask, Bury it.
  - Quantitative: numbers. Buried sums first, then number series and odd one out.
  - Non-verbal: shapes and patterns. Trace first.
  - A family is a label on a registry type, not a new screen. It shows where the category shows today and as a filter on the games list.
  - Answers and counts for every family come from the engine, never from AI output or hand typing.
  - Copy for every family follows the promise: the practice, never a result. No line says a game restores focus, attention or memory.

## 10. Accessibility
- 4.5:1 text contrast in both themes (tokens pass).
- Keyboard: arrows move a caret over letters, Shift+arrows extend, Enter checks. Live region announces.
- Icon buttons have `aria-label`. Touch targets 44 minimum.
