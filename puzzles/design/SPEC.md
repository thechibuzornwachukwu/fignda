# Gazecraft spec

Values are tokens from `src/styles/tokens.css`. Prototype wins on visuals.

## 1. Brand

**Name:** Gazecraft. Two plain words fused, naming what you do.

**Logo** (`src/brand/cat.ts` holds the cat and `src/components/logoPaths.ts` the letters; `design/brand/index.html` is the brand guide). Drawn, never typed, so it needs no font and stays sharp at any size.
- Mark: the cat.
- Wordmark: the cat, a gap, then GAZECRAFT in Bungee Regular with the font's own spacing.
- The cat's colours are fixed brand art, the same in both themes.
- Sizes are the height; capitals are 88% of it.
- Clear space: about 12% of the height on every side.
- App icon: the cat's eyes up close, fur (`#454552`) to every edge, radius 25%.
- Icons used: ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Contrast, Lightbulb, Clock, Flag, Search, Check, X, Bell, Award, MousePointer2, Pointer.

## 2. Type

Two faces. Bungee (`--font-display`, 400 only, capitals only) for headings.

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

`itemTitle` is a name or a title in a list row. `figure` is the score at the end of a row.

## 3. Layout
- Max width 1200, gutter 24.
- Header, by context.
- Game mobile layout under 760.
- All text boxes reflow.

## 4. Components

| Component | Spec |
|---|---|
| Button primary | h48 (36 in header), px20, r8, bg `--fg`, text `--bg` 15/700, hover `--fg-strong` |
| Button accent | bg `--accent`, text `--on-accent`, hover `--accent-hover` |
| Button secondary | 1px `--line-3`, text `--fg`, hover bg `--surface-2` |
| TextLink | 14/600 `--muted`, underline offset 4 `--line-3`, hover `--fg` |
| FilterTabs | gap 20, 14/600, active `--fg` + 2px bottom border, else `--subtle` |
| GameRow | padding 24 0, 1px bottom `--line-2`. Category 84 wide 13/600 `--subtle` (hidden <760). Title `row`. Meta "N words · Level" 14 `--subtle`. Hover padding-left 12 |
| PageHeader | One per tab (Your Puzzles, Your League, Your People, You). Title is the `h1` at `resultTitle`, left; one action slot on the right (a TextLink, or nothing), baseline aligned, wraps under the title when it does not fit. Same top padding (`--screen-top-game`) on all 4, phone and desktop |
| ProgressLine | 2px, track `--line`, fill `--bar`. Landing preview only |
| Ring | An open circle that fills clockwise from 12 o'clock. SVG, 20 (40 for the week), stroke 2.5, track `--line-3`, fill `--fg`. Closed (value 1) it turns `--accent-ink`: the only time it is lime, since lime means found. `value` 0 to 1 is a `progressbar`. `parts` makes a segmented ring (an `img` with a label), 12 degrees open between parts: done `--fg` 2.5, rest `--muted` 1.5 in 3 dashes, empty `--line-3` 1.5, so a rest day never reads by colour alone. A segmented ring closes when no part is empty and at least 1 is done |
| BigClock | label "Time" / "Final time" 13/600. Digits `clock`, `--subtle` playing, `--fg` finished. Hidden <760 |
| WordList | 2px `--fg` top rule. Header title + count. Rows 10 0, 1px `--line`, index 01 left. Chip: found `--accent`/`--on-accent`, missed `--miss`, unfound one • per letter `--line-4`. Chip 2 6, r4. Desktop sticky top 24, max-h min(62vh,640) scroll |
| Segmented | track p4 r10 `--surface` 1px `--line`. Option h36 r7 14/700. Active `--fg`/`--bg` |
| Toggle | 44x26 r13. Off `--line-2`, on `--accent`. Knob 20 |
| Input large | no box, 2px bottom `--line-3`, `row` type |
| Input form | h52 r8 1px `--line-2` bg `--surface` 16px, focus `--line-4` |
| Dialog | scrim `--scrim`, panel max 820 r14 1px `--line-2` bg `--bg`. Esc and outside click close. Focus trapped and restored |

**Skeletons** (`<Skeleton>`, `<SkeletonGroup>`, `<SkeletonList>`, `<SkeletonPills>` in `src/components/Skeleton.tsx`)
Anything that waits on the network shows the shape of what is coming, in the place it will land, so the screen never sits blank and nothing jumps. One rule for every screen, and for every new screen, section or component: if it loads, it ships with its skeleton, and the skeleton changes when the layout does.
- Shapes are `--surface-2` blocks, radius `--radius-sm` (`--radius-pill` for a picture or a pill), sized like the content: a circle the size of the avatar, a line the height of the text, a row with the list's own rule and padding.
- The group is `aria-busy="true"` with one hidden word, "Loading."; the shapes are hidden from a screen reader.
- Shown at once, in place, with no delay: a skeleton is quiet enough not to flash.
- A skeleton is for content loading into a screen whose frame is already there.
- A load that fails says so in a line.

| Where | Skeleton |
|---|---|
| Your League, a puzzle's board, a circle's board | 8 rows (5 in a circle): a 28 circle, a line, a number |
| Your People: Lately, top players, people to follow, search results | 4 or 5 rows: a 40 circle, 2 lines, a number |
| Your People: friend streaks | 2 rows: a 40 circle, 2 lines, a number |
| Your People: Circles, and the list on `/circles` | 2 rows: a line |
| A circle `/c/CODE`, before it is known | a title block, then 5 board rows |
| Player `/u/HANDLE` | an 88 circle beside 3 lines, then 4 rows |
| You: Badges | 4 pills |
| Make: Your puzzles | 3 rows: a line, a number |
| Made by players `/made` | 6 rows: a line, a number |
| Play together: Invite someone you follow | 3 rows: a 32 circle, a line |
| Settings: Reminders | one control-sized block |

## 5. The puzzle interaction
Paragraph renders one span per character. Letters carry `li` (index in lowercase letter stream `S`).

**Letter states:** idle transparent · selecting `--sel`/`--sel-fg` · found `--accent`/`--on-accent` · missed (after finish) `--miss` · hint: a 2px `--fg` ring around the letter over a `--hint-bg` wash, and a hand (Pointer at 0.62em of the puzzle type, about 12 on a phone and 17 on a desk, `--fg` on `--bg`) under it pointing up, small enough to sit between two lines. Selecting and found win the fill, and the ring and the hand still show on them, so a hint for a word that starts inside a found word is seen.

**Input**
- Mouse/pen: drag (pointerdown starts, window pointermove extends via `elementFromPoint`, pointerup evaluates), or click first letter then last.
- Touch: swipe sideways, press and hold then drag, or tap first letter (copy `tapNext`) then last.
- Tap or click the anchored letter again to cancel.
- Second tap or click: the whole range shows as selecting for `--dur-connect` (220ms), then is checked.

**Evaluate** (`reference/engine.js` `check`):
| Result | Action |
|---|---|
| hit | mark found, `onFound(ctx)` line, word moves to top of list |
| already | `already` line |
| near miss (`isClose`) | `close` line, no penalty |
| under 3 letters | nothing |

Streak resets on wrong pick and on hint. `onFound` picks: first find, last one left, every 3rd in a row, quick (<6s), long (8+ letters), else generic.

**Tip-off** (`hint` in code): on screen the pet's help is always a "tip-off": the link "Ask for a tip-off", the phone bar's "Tip-off" button, "1 tip-off" in the count and on the share card. It marks the first letter of one unfound answer, -25.
**Finish:** "I'm done" or last find. Missed answers shade.
**Save and resume:** a game played alone that is left unfinished carries on where it stopped: the finds, the hints, the hand of a hint still showing, the wrong picks and the clock. One line from the `resumed` pool says so when there is a find or a hint to come back to.
- It stops when the player leaves the page, closes the tab, switches app or locks the phone, and starts again on return.
- A finished game is kept too.
- Nothing is dropped in normal play.
- Stored data that is missing or unreadable is no saved game.
- A room game is kept too, under its room (`gazecraft-resume-room-CODE-ID`), so a dropped connection or a reload loses nothing and a player's own finds stay their own.

**Clean read:** every word found by you, no hints, no wrong picks (near misses do not count; a room game with a teammate's find is not one). One `cleanRead` line under the result title.
**Result lines:** under the result title and its line, in this order, each only when it is true: stars, skill lines (2 at most), record lines (2 at most), rare find, the day's count, the run, `doneToday`. Line helpers are pure and live in `src/games/resultLines.ts`.
The best is kept per puzzle in this browser (`gazecraft-stars`). The result shows them with `<Stars>` at 20, under the result line.
**Skill lines:** from `skillsOf` on your own finds, one each, 2 at most, rarest first: clean read (`cleanRead`), no-hint perfect (`skillNoHint`: every word, no hint, said only when a wrong pick spoiled the clean read), deep find (`skillDeep`: a word across 3 joins or more, said as the 4 or more words it runs across), long word (`skillLong`: 9 letters or more). In every game, rooms included; a teammate's find never counts.
After it: `dayHid` ("Today hid 11. No line when the pool has fewer than 3 puzzles.
Your own finds only. The first value of each is stored quietly: a record is something you beat, so a line (`recordClean`, `recordDaily`, `recordLong`) and the record sound come only from a later, strictly better play.
**Sound:** Web Audio, synthesized, no files (`src/lib/sound.ts`). A soft triangle tick per new letter in a selection, pitch up a semitone per letter from 660 Hz (cap 2 octaves), ticks under 25ms apart merge.

Every player in the room has an avatar at 24, your own row included; a guest gets a starter drawn from their room id. Spans broadcast and re-checked with the engine; `teamFound` / `teamJoined` copy pools.

**Text result:** Copy result button on results (secondary). Coarse pointers use the share sheet, others copy.

**Together board:** `/leaderboard/:id?board=together` (Segmented Solo / Together on every puzzle board). A team is 2 or more signed in players in one room.

The day before and after keep the rotation.

Under it, one calm line from `doneToday` that the day is done. More games stay one tap away and are never pushed.

**The promise in copy:** we promise the practice, never a result. No pool line or page string says attention span, brain training, memory, IQ or proven (`src/copy/claims.ts`, checked in `npm test`).

**Reminders:** web push, signed in only. Under today's result: TextLink "Remind me tomorrow" when this browser has not chosen yet.

**Friend streaks:** second section of `/players` when signed in (`#friend-streaks`), once it is unlocked (section 6, Less at once). Start: "Invite a friend" shares your link `/s/CODE` (one tap for the friend starts it, new players sign up first), or "Start a streak" on a profile (the other player says yes).

A push goes out only when you follow the inviter back.

**Points:** lifetime tally from verified plays. A game ended with "I'm done" adds what it earned.

`rareFind` ("Only 8% found...") when half or fewer found it, else `rarestFind`, which says the share plainly. No stats, fewer than 5 players or nothing found: no line.

**With NAME (sponsored puzzles):** one field on a catalogue puzzle in `data/games.json`: `"sponsor": { "name": "Chi Farms", "url": "https://chifarms.example" }`. One rule reads it, `sponsorOf` in `src/engine/sponsor.ts`, and every screen goes through `sponsorFor`.
- Game row: its own line under the title (13/600), on `/play` and the landing list.
- Result: the last line under the result title (14/600), then " · " and the sponsor's site name (the host, no "www.") as a link that opens in a new tab with `rel="sponsored noopener"`.
- Share card: under the title on the result card and on the first page of a puzzle card, 30px `--muted`, the site name beside it in `--subtle`.
- Link preview: one line above the question on the image (26px `--muted`), and "With NAME." as the last sentence of the description, the image text and the readable page.

Everything else about a sponsored puzzle is the same as any puzzle: score, points, stars, boards, its place in the list and on the path. The field lives in the catalogue only.

**Sponsor report:** `npm run sponsor:report`, for the owner, from a terminal. No screen, no route.
- Games started: new games opened, by everyone, guests included.
- Played to the end: games that ended with at least 1 word found, and their share of games started.
- Found every word: games that ended with nothing missed, and their share of games played to the end.
- Shares: every time a share left the game: an image shared or saved, a link copied, a text result sent or copied.
- Visits to sponsor: the sponsor's link on the result, opened, and its share of games started.
- Signed in players: different accounts with a play the server checked, alone or in a room.

All but the last are counted by the game as it is played, per puzzle per UTC day, with no player on the count (`countEvent` in `src/lib/api.ts`, `POST /api/counts`). They are what a sponsor pays for: most people play as guests, and a guest's play is stored nowhere else.

`--from` and `--to` (YYYY-MM-DD, UTC, both days included) narrow it. `--game ID,ID` reports on catalogue puzzles that carry no sponsor, to show a sponsor what a puzzle already draws.

**Guest funnel:** `npm run funnel:report`, for the owner, from a terminal. One row for each of the last 14 UTC days (`--days N`, up to 365; `--local` for the local database): games started, games played to the end and their share, and new accounts.

**Usage report:** `npm run usage:report -- [--weeks 8] [--local]`, for the owner, from a terminal (`src/engine/usageReport.ts`). One row a week (Monday, UTC): the players who played, and how many of them used each feature: the path, whole puzzles, Play together, Make, Circles, Following, Friend streaks, Leagues, Sharing.

**Help:** `/help` and `/help/SLUG`, open to everyone, linked from Settings and the footer (`src/help/articles.ts`). One question an article, titled as a player asks it, the answer in its first 1 or 2 sentences, then numbered steps or facts, then related articles. Grouped by what a player is trying to do; a search box filters as you type. Every number in an article is imported from the code the game runs, so an article changes on the next deploy when its rule does; `src/help/articles.test.ts` fails if the wording and the numbers drift. Each article is its own crawlable page with FAQ data, and all are in the sitemap.

**Made by players:** `/made`, open to everyone, linked beside "Make a puzzle" at the foot of Packs. PageHeader "Made by players" with "Make one" as its action, then published puzzles that passed the safety check, were never hidden and are not reported, most liked first (`public_puzzles`): each a row with its icon and title over "@maker · 6 words · 1 play · 3 liked it", leading to `/p/CODE`.

**Make a puzzle:** `/make`, signed in, reached from "Make a puzzle" at the foot of Packs after 5 plays and "Or make your own" on the landing page . One box: "What should we hide words in?" (`readBox` in `src/engine/makeBox.ts`).
**Report:** on the same row, a TextLink "Report this puzzle" for signed in players, never on your own puzzle and never on one with no maker. One confirm step (Dialog: Cancel / Report), then one calm line in place of the link from `reportDone`, or `reportAgain` when the server says it was reported already (`reportPuzzle(code)`).
**Owner page:** `/owner/puzzles`, linked from nowhere. Hidden puzzles, newest first: title (or "Untitled puzzle"), "@maker" (or "No maker"), reports, safety result, hidden date (left out when unreadable), Restore and Remove (Button sm, secondary).

Linked from past days on the leaderboard and listed in the sitemap (last 60).

**Notifications:** no page and no bell. They are lines in the Your People feed, among the medals; an unread one has a 2px `--fg` bar on its leading edge. While any is unread, the Your People tab carries an 8 dot in `--cheer`, checked on each page and once a minute. Opening Your People reads them. `/notifications` redirects there.

**Cheers:** signed in, a heart (18, `--tap` square) on every medal in the feed that is not yours: pressed, the heart fills `--cheer` and the count stays in ink. One cheer a player a medal; it tells the owner ("Ada cheered your 30 day run."). Your own medal shows its count, read only. `cheer()` checks the medal exists and is not yours.

Profile section Badges (`#badges`): earned ones as `--fg` pills; on your own page the next 3 as outlined pills.

**Circles:** `/circles` (yours, start one: name 2 to 40 chars) and `/c/CODE` (invite page for non members; members see Today and 7 days tables, Play today, Invite, Leave; owner sees Remove on members still to play). Up to 50 members, 20 circles each.

**People to follow:** first section of `/players`. Up to 12 registered players, never you or anyone you follow.

**Skill pays:** the Worker tags a verified whole-puzzle play with the skills its replay showed (`skillCodes`, `plays.skills`): Clean read, No-hint perfect, Long word (9 letters or more), Deep find (across 3 gaps or more). Each is a badge, given once, and shown first among the medals.

**Goal:** on You, under the week, the section "Today": a ring of 1, 2 or 4 parts that fill as puzzles are finished today, and a switch under it at full width, Light, Regular (the default) or Serious (`src/lib/goal.ts`, kept in this browser). Apart from the run: missing it costs nothing, and going past it says nothing.

**Records on the account:** signed in, every visit brings the account's records (`my_records`, worked out from verified plays): the fastest clean read in each pack, the longest word found, and the best week (most points in one Monday to Sunday week, UTC). The browser keeps the better of each (`mergeRecords`); nothing goes down.

**Friends board:** Your League's middle option (`?board=friends`): you and the people you follow on this week's league points (`friends_board()`). A friend you invited shows as soon as they play signed in. Alone on it: a Find people button.

**Room colours:** in a room your finds stay lime; each teammate's are drawn in their own colour (`--mate-1` to `--mate-6`: orange, pink, sky, violet, blue, yellow), first come first, and their dot in the room list matches (`src/lib/mates.ts`).

**Leagues:** signed in, Your League opens on the league (Segmented This week / Friends / This pack, `?board=pack`). A table of up to 20, seated on first look each week (Monday 00:00 UTC), in 1 of 5 tiers named for the medal metals: Bronze, Silver, Gold, Jade, Onyx (`src/lib/league.ts`).

**Rare finds:** a word fewer than 1 in 10 of a puzzle's players found, once 20 or more have played it (`plays_rare`, from the counts in `word_finds` and `puzzle_players`). Fixed when the play is saved.

**Rest days:** 1 a week, earned by playing 5 of the last 7, free and never asked for (`src/engine/rest.ts`, the same rule as `rest_run` in the database). A single missed day after 5 of the 7 before it keeps the run alive and is not counted in it.

**Pet outfits:** on You, under Pets, the row "Outfits": No outfit, Bow tie (finish 3 packs), Beanie (finish 10 packs), Party hat (reach the rank of Keen), each drawn on the pet beside you at 88. An earned one is worn with a tap (a tick in the corner); one not earned yet sleeps, with a Lock, `aria-disabled`, and what it takes in its accessible name.

**Topic icons:** every pack card carries its topic's icon before its title (`iconForTopic` on its category and title), and a player-made puzzle the icon it was published with (`games.icon`), at 16 to 20 in `--muted`, never lime (`<TopicIcon>`). 12 of the icons are our own, for home subjects lucide does not draw (`src/components/icons/home.ts`: pot, stall, talking drum, keke, danfo, mortar, gele, calabash, plantain, generator, agbada, mosque), drawn on lucide's grid and listed first so a home word wins. No match is the default, Shapes.

**Pack colours:** each pack is drawn in its own hue (`--pack-*` tokens, one per category, `packHue` in `src/lib/packHue.ts`): a thing, so the same in both themes, always with `--paper-ink` on it. The pack being played and the packs done are cards filled with it, with a ledge of the same hue, deeper.

**Pets:** the player's pets. A player keeps one and it comes along on every pack.
- Rules are in `src/engine/partners.ts`, pure.
- `<Partner moment>` shows the player's pet in the mood of the moment: hello (waving), empty (calm), loading (thinking), error (stumped), done (happy), found (found), asleep (sleepy).
- `<PartnerNote moment layout>`: the player's pet with a line, so a screen with nothing on it is never just grey text.
- Where it shows: the You stage; the crew row at the top of Packs, calm at 48 beside the avatar; the waiting screen, full size only, thinking beside the avatar at 88; the result, at 56 beside the title, found when every word was found and happy otherwise; the empty path, calm at 40; the first screen; and the screen that asks a guest to sign in, waving at 120.
- The pick, in the first minute: on the first screen, under the character, a group "And your pet.
- Choosing a pet is on the You stage (section 6, You), not in Settings.
- Unlocking: the first pet is free.
- A pet is on the account (`player_partners`), decided by the server: `choose_partner` gives the first free, switches among the held, and takes another only when checked points allow one more than is held.
- The bond: packs closed with a pet beside the player, counted by the server from checked whole-puzzle plays (`partner_cases`).
- What a pet does in play: it chooses which answer a hint marks (section 6, Hint).
- In a room each player's pet is drawn at 24 beside their avatar on the scoreboard.

**Avatars:** drawn from parts in `src/avatar` . Saved as a code of positions, so part lists are append only.

**Tab bar (phones, app pages):** a floating dock, 12 from the sides and the bottom plus the safe area, `--tabbar-h` 56 high, `--surface` with a 1px `--line-3` border, radius `--radius-dock` 22 and a hard lower edge of `--ledge` 4 in `--line-3`. Icons only, as Duolingo has: each tab is an icon 20 in its own colour (`--tab-home`, `--tab-people`, `--tab-league`, `--tab-you`), filled a shade lighter, its name for screen readers only; the active tab's 56 by 40 pill is outlined and tinted in its colour.
- 4 slots: Home (house, `/play`), Your People (people, `/players`), Your League (trophy, `/leaderboard`), You (the player's own face).
- No Play tab: Home leads with the next puzzle, so a Play tab would be a second door to the same place.

**Outfits, earned:** 5 player pieces are earned and nothing else is: everything that helps someone look like themselves stays free, always. The rules are in `src/avatar/earned.ts`, the drawings in `src/avatar/parts/kit.ts` and the outfit list, all append only.
- An avatar part, Extras (letter `d`), worn one at a time and drawn on top: Star pin (finish 1 pack), Headphones (finish 5 packs), Crown (reach the rank of Keen), Gold set, the crown and the pin together (finish 10 packs).
- Packs closed are counted in this browser, the way the path counts them.
- In the editor, under Wear: a piece not yet earned is shown with its drawing, a dashed border, a Lock icon and how to earn it ("Finish 5 packs.") in place of its name.
- An earned piece is never handed out by chance: Surprise me leaves the kit alone and never picks the coat, and no starter avatar has either.
- The lock is in the editor only.

## 6. Screens

**Landing `/`** [Gazecraft Landing]
Top to bottom:
- Hero, two columns (one under 900).
- The promise, straight under the hero. h2 "Slow down.
- `#how`, h2 "Two ways to find a word".
- h2 "More than one way to play". 4 cards, 7 and 5 of 12 columns then 5 and 7 (one column under 760), each a preview, an h3, a line and a TextLink: "A new one every day" (today's kicker and title, a 7 day strip) to `/d/N`; "Play it together" (a room code, 3 players with a found chip each) to `/play`; "Climb the board" (3 ranked rows, scores from the engine) to `/leaderboard`; "Look like yourself" (8 avatars) to `/players`.
- Games list with 3 steps and "Or make your own" to `/make`, about (the origin story, then the promise in one sentence), footer CTA "Start playing".

Everything above stays, below it, in the same order; the hero heading becomes an h2, "Try it here" is left out and `#how` keeps its two demonstrations. One guided find: a hand (Pointer) taps the first letter of the first hidden word, then the last, on a loop, and that first letter wears the hint ring.

The only accent button is the one the demo earns. Landing avatars are drawn from fixed parts, never looked up, so a guest loads no auth or data client.

**Games `/play`** [Gazecraft home view]
- PageHeader "Games".
- Order: room invites, the path, and at the foot "Make a puzzle" once it is unlocked (Packs, below).
- Unplayed "One try.
- Beside it `weekDays` ("Played 5 of the last 7 days.", 15/700) over `runMonth` ("Current run: 4.
- It replaces the list as the way in, it does not sit on top of it. h2 "Your path", a Ring at 20 and `journeyCount` ("7 of 108 clues").
- Stars: 3 Star icons in a row, earned ones filled `--fg`, the rest outlined `--line-4`, so the count reads by shape.
- LevelBadge (built, mounted once levels come from the server): a Ring with the level number inside it (Manrope 800, tabular), the rank beside it (14/700): Starter, Keen, Sharp, Master, 5 levels each and the last with no end (`RANKS`) and "120 / 600" (13 `--subtle`).
- Pack shelves: a line above the first row of each category, the category name (13/700 `--fg`) and `shelfDone` ("4 of 12 finished", 13/600 `--subtle`).
- Empty filter (no game in a category): "No games here yet." and TextLink "See all games".
- Background making, server ready and not yet used by this screen : `startGenerate` answers at once with a job, `runGenerateJob` is the long request that does the work, `getGenerateJob` is asked every 5 seconds.
- Waiting elsewhere, only when the wait passes 1 second: a slow page load and opening a puzzle by link `/p/CODE` (full, `waiting` pool), making share images and publishing in Make (inline: avatar at 40, dots beside it).

**The 4 tabs: one job each**
Nothing was dropped. Sections are separated by space and a 2px rule on a list, never by a box.

| Tab | Job | Leads with | Then | Moved |
|---|---|---|---|---|
| Leaders `/leaderboard` | See where you stand | Today's board for your crowd, your row pinned | Day buttons, the line about totals | Circles went to Players (One job a screen, below). "Find players" left the top: Players is a tab, and the empty Following board still links it |

- PageHeader titles: "Your Puzzles", "Your People", "Your League", "You" (`/me`). Settings is "Your settings."
- Leaders, signed in: the board opens on your crowd.
- Leaders, Players, You: none that only group.

**Less at once**
An entry point appears when the player has done what it scores. The rules hide links and sections, never a route: every page opens from its address, and a section opens from its anchor.

| Appears | When | What it shows |
|---|---|---|
| boards | 1 finished game | "See the board" under the week on Games |
| points, badges | 1 verified play | Points and Badges on a profile, the Points list on Players |
| make | 5 plays | "Make a puzzle" at the foot of Packs |

- Stored data that is missing or unreadable counts as a first visit.
- Once shown, always shown: unlocked names are kept under `gazecraft-unlocks`.

**Empty states on the 4 tabs.** A list never leaves a heading over nothing. Nothing yet: one calm line and, where it helps, one link.

**Game `/play/:id`, `/d/:n`**
- Back "Packs", `Category · Level`.
- The ring fills by found over total and closes on the last find.
- With 3 or fewer left, and at least 1 found, `leftCount` ("3 left", 700 `--muted`) joins the stats and the ring appears showing the gap.
- Two columns wrap: puzzle (flex 3, min 520) and WordList (flex 1, min 260), gap clamp(32px,5vw,72px).
- Instruction: "Drag across the letters.
- Under puzzle: "Give me a hint", "I'm done", live message (`aria-live="polite"`).
- How many?

**Results** (above puzzle, smooth scroll to top)
One job: say what happened and lead on. In view: the title, one line ("Every answer found." or "The ones you missed are shaded below."), the Stars, a sponsor's "With NAME" line, and 2 buttons.
- Where the score would stand: one `guestPlace` line, "That score is place 14 of 60 today." The place comes from the server (`daily_place`), from the guest's own score against the checked plays, with the guest counted as one more player.
- Where the run lives: at a run of 3 days or more, one `guestRun` line, said once in this browser (`gazecraft-run-told`) and before the place: the run is kept in this browser only, and sign in keeps it anywhere.
- Who they are, first of all: until the first minute's character step has an answer, the strip says one `guestLook` line and its link reads "Choose your look".
Nothing is locked for a guest and nothing is taken away. Play first stays.

**You `/me`** (the dock's You tab)
A stage, the way a runner game shows its characters: who you are is the front of the game, not a setting. Guests have one too.
- PageHeader "You".
- The stage: a card with the dock's border, radius and ledge.
- Under the stage, rows to swipe (each row scrolls sideways by itself; the page never does).
- Tap a card to try it: it goes onto the stage at once, nothing is saved.
- Pets row: the pets.
- Gear row: "No gear" and the 5 earned pieces, each drawn on the player's own avatar.
- Under the rows, everything else about the player: the week, Badges (signed in: the earned ones, then the next 3 to aim for, said as not earned yet; `#badges`; a skeleton of pills while they load), and Your records (kept in this browser, so guests have them too; with none, one line that says where they come from).
- Last, one link, "See your public page", to `/u/HANDLE`.
- A badge notification opens `/me#badges`.
- Settings holds the account only (name, sign out, reminders, theme, download my data, delete) and one line pointing here.

**Packs:** one thing to do, then the path. In order: PageHeader "Packs" with the crew as its action, room invites, the path, and at the foot "Make a puzzle" once it is unlocked.

**One job a screen:** every screen has one job and one main action, and the fewest taps to it (`BUILD_PLAN.md`, Screens). What is not the job moves to the screen whose job it is.
- Phones have no bar across the top on app screens: the dock is the navigation.
- `<IconLink>`: a page action as a 44 square with a 1px `--line-3` border, radius `--radius-lg`.
- On the path, closed packs fold into one row, "3 packs done" with an Award icon, which opens to show them.
- You: the week (`<Week>`) is under the rows.
- Your People holds every person.
- Circles on Your People (`#circles`), signed in: h2 "Circles" with a secondary "Start a circle" to `/circles`, then each circle as a row (its name, "3 players") to `/c/CODE`, where that circle's board is.
- Your League is one board at a time, and no circles: today's board for Everyone or Following (Segmented, signed in; `?board=following|everyone`; it opens on Following when you follow anyone).
- Your row on a board is pinned in view: it carries the "You" chip on `--surface-2` and sticks to the top or the foot of the screen while the board scrolls past, clear of the dock on a phone.
- `/u/HANDLE` is the public page only, your own too: PageHeader "Player", earned badges, no records and no badges to aim for.

**Packs are the only way in.** There is no list of games and no filter: the path is the game, and a pack not yet reached cannot be opened from Packs. A sponsored pack carries "With NAME" on its card.

A puzzle played alone has no board of its own any more: its result carries no board link and Your League lists no puzzle boards. `/leaderboard/:id` still opens for old links, and every score is kept.

**Guests:** a guest plays 2 games to the end, of any kind. Opening a 3rd shows one screen in place of the game: the pet waving, h1 "Sign in to keep playing", one line saying nothing is lost, an accent "Sign in" to the first minute and a link back to Packs.

**Sitting `/play/:id/:n`**
One passage of a catalogue puzzle, played as a game of its own: a clue of its pack, reached from the path. The same screen as a puzzle, with these differences:
- At the top right, in place of the level, the pack as a row of marks, one a clue, in the order they are played (named "Bible, clue 2 of 8" for a screen reader, and never written out).
- The pet plays along: at 32 beside the feedback line (in the phone bar, and under the board on a wide screen), in the mood of the last thing that happened.
- A sums clue (`/play/:id/21` and up) and the Mirror clue (`/play/:id/31`) are sittings like any other, on the same board with the same drag, list, hint, stars and result (section 9, Buried sums and Mirror).
- The result leads with one accent button to the next sitting, "Next puzzle".
- Its own kept game, result and stars (`gazecraft-resume-ID~N`, and `ID~N` in `gazecraft-stars`).
- Never ranked and never sent to the server: no board link, no `?vs=`, no room, no points.
- Games started and finished on a passage count toward its puzzle in the sponsor report, and the sponsor's mark shows as on the puzzle.
- A number that is not a passage, or a puzzle that is not cut, opens the whole puzzle.

- What a player has to show is their medals, their player and their pet.

**Medals** (`<Medals>`, `src/lib/medals.ts`): badges, drawn as things worth having
- A badge code from the server is a tier of a medal.
- A medal is a disc on a ribbon, `--medal` wide: its glyph at 16 (Flame, FolderCheck, Star, Flag), the tier struck under it (`stat`, tabular), a rim 6px darker than its face, and a `--ledge` edge.
- Not earned: the disc is `--surface-2` with a dashed 2px rim, a Lock where the glyph goes, the first tier in `--subtle`, a grey ribbon, and its card is dashed and flat.
- A medal says what it is.
- On You: all 4, as cards `--medal-card` wide in a row that scrolls, with the bars.
- Tap a medal: a dialog with the medal at `--medal-lg`, its name (`h2`), the bar with "12 of 30" under it, and for an earned one a primary "Share" (Share2 at 18).
- The pet and gear cards on You follow the same rule (the owner, 13 Oct 2026: the concept explains itself, with no line under it to explain it).

- The days of clues are kept in this browser (`gazecraft-days`, UTC day numbers, the last 800).
- A friend streak counts the days both played.
- Your League is the board of the pack the player is on and nothing else (`<CaseRanks>`): the puzzle of the next clue on the path, or the first one, under its title, with a secondary "Play it".
- Reminders (`remind`, `remindStreak`) and the run line (`streakKeep`) speak of the pack: "Your pack is open.

**Clue done** (`<ClueDone>`, a popup)
The moment a clue is finished, alone, on the path: a `Dialog` over the board. Closing it leaves the full result underneath.
- Top to bottom, centred: the stars at 20 drawn 1.6 times up, popping in one at a time; the result title (`resultTitle` type, `--ink-display`); one line in `--muted` ("4 of 4 found"); then one accent button and a text link "See the result".
- The button is the way on: "Next puzzle".
- 3 stars get a burst of paper behind the stars (section 8, Burst).

**The first minute `/welcome`**
Play first, account later. For a new player only: an account with a profile never sees a step and is sent on to where it came from.
1. Character. h1 "This is you." A finished character is shown, so keeping it is one tap and nothing has to be chosen.
2. Sign in. h1 "Sign in to keep it." over the same email form as `/signin`.
3. The outfit question. h1 "We believe you should look good." The question, as the group's name: "Who are we dressing?" 3 buttons, one tap each: "A woman", "A man", "I'd rather not say".
4. Name and @handle, last, signed in only. h1 "What should we call you?" Both prefilled (the Google name, else the first word of the email address; a handle already taken gets a short tail before it is shown), accent "Start finding" accepts in one tap.
- Play first: nobody is sent here before a game.
- Never a menu.
- Kept in this browser until there is an account: the answers so far (`gazecraft-onboarding`), the character (`gazecraft-guest-avatar`) and the look (`gazecraft-look`).
- Leaving half way and returning resumes at the first step with no answer.
- A guest's character shows wherever a guest has one: the waiting screen and this flow.

**Mobile <760**
Main padding-bottom 96. WordList static below puzzle.

**Share sheet** [Gazecraft Share Card]
Preview (max 300) + controls: Result / Puzzle, frame 1:1 · 4:5 · 9:16, text Excerpt / Full puzzle, Show my finds toggle ("Off. Actions "Share image(s)", "Copy link".

**Sign in `/signin`, `/account`** [Gazecraft Sign In]
The lead ends "Accounts are for players aged 13 and over." The privacy page says the same, and lists every company that receives data under "Who receives data". An account with a profile goes straight to `next`.

## 7. Share cards
- 1080 wide. 1:1 1080 pad 80 · 4:5 1350 pad 88 · 9:16 1920 pad 240 96 260.
- Text never under 38px.
- Excerpt: whole sentences, window with most target answers, within first-page char budget (`tokens.json` `shareCard.charBudget`).
- Full: greedy sentence pages.
- Export PNG in browser (`html-to-image`), `navigator.share({files})`, else download.

## 8. Motion
Durations and easings are tokens. Reduced motion sets them to 0 and disables FLIP and hover slide.

Rules for any new motion (from Emil Kowalski's design engineering skill, linked in `BUILD_PLAN.md`):
- `--ease-out` is `cubic-bezier(.23,1,.32,1)`: it moves most in the first moments, so the screen answers at once.
- Only `transform` and `opacity` move.
- Under 300ms for anything in the interface.
- How often it is seen decides how much it moves: many times a day (a find, stepping the reveal, a tab) little or nothing; rare moments can carry more.
- Nothing grows from scale 0.
- Hover styles sit behind `(hover: hover) and (pointer: fine)`, so a tap on a phone does not leave one stuck.

| Element | Transition |
|---|---|
| Letter | bg, color 180ms ease |
| Hint hand | rises 6 and fades in once, `--dur-slow` `--ease-out`. It does not loop |
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
| Skeleton | opacity 1 to 0.5 and back, `--dur-skeleton` each way, `--ease-loop`. A second loop allowed past 300ms, because it only says "still coming". Still under reduced motion |
| Waiting | the other loop outside the landing, so it is allowed past 300ms. Avatar bobs up `--space-1` and back, `--dur-bob` each way, `--ease-loop`. 3 dots in `--muted` hop `--space-1h` one after the other, a `--dur-bounce` cycle, each `--dur-bounce-step` behind the last, `--ease-loop`. Only `transform` moves. No blink: the avatar is drawn by `<Avatar>` and is not redrawn. The line changes every 20 seconds with no motion. Shown after 1 second, kept at least 600ms. Reduced motion: no bob, no hop, the line still changes |
| Journey hop | once, when the player returns to the path with a new next clue: the avatar hops from the clue it stood on to the new one in an arc, or drops in when the new one opens a pack, `--dur-hop` `--ease-out`. `transform` only. A rare moment (once per finished clue), so it may pass 300ms. Pressing a clue sinks it by `--ledge`, `--dur-fast`. The line and the discs do not animate. Reduced motion: the avatar is simply on the new clue |
| Stars | on the clue or the pack just finished, and on the result screen: earned stars pop in one at a time, each from 0.8 scale and 0 opacity, `--dur-star` `--ease-out`, each `--dur-star-step` behind the last. Stars already seen do not move. Reduced motion: all shown at once |
| Clue done | the popup rises `--space-4` from 0.96 scale and 0 opacity, `--dur-slower` `--ease-out`, and its stars pop as stars do. Reduced motion: it is there |
| Burst | 18 small pieces of paper fly out from one point and fade, `transform` and `opacity` only, `--dur-burst` `--ease-out`, each starting `--dur-burst-step` after the last, reaching `--burst-reach`. Once, behind 3 stars in the popup. A rare moment, so it may pass 300ms. Reduced motion: no paper |
| Sums tile | a tile being selected lifts by `--space-1`, `--dur-fast`. A found run's tiles settle from 1.18 scale, `--dur-slow` `--ease-out`. The meter fills by `transform`, `--dur-base`. Reduced motion: none of it |
| Dock quick return | phones: the dock slides below the screen on a scroll down and back on any scroll up, `transform` only, `--dur-slow` `--ease-out`, the same rule as the header (8px of scroll before it moves). Always shown near the top, at the end of the page, on a new page, and while focus is inside it. Reduced motion: it is there or not, with no slide |
| Level up | the LevelBadge ring fills from where it was to closed, using the Ring's own transition, and the level number pops from 0.8 scale, `--dur-slow` `--ease-out`. Reduced motion: the ring is closed, nothing pops |

Nothing else animates.

## 9. Game system
- Registry: `type -> { family, build(def), check(puzzle, sel), Board }`.
- Family: every type is Verbal, Quantitative or Non-verbal (`FAMILIES`, `familyOf`).
- Difficulty (computed): Hard if 20+ answers or 900+ chars.
- Floor 0.
- Server decides.
- Passages: `passages(puzzle)` in `src/engine/passages.ts` cuts a puzzle into short sittings.
- A passage can be played (`/play/ID/N`, section 6, Sitting) and is a clue on the path (section 6, Games).
- The rhythm of a pack (`caseOrder` in `src/engine/journey.ts`): word, word, number, word.
- Buried sums (`src/engine/sums.ts`): a row of digits 1 to 9, and the runs of 2 or more in a row that add up to a target from 10 to 17.
- Mirror (`src/engine/mirror.ts`): hidden words that read right to left.
- Packs on the server (`supabase/migrations/20261010000500_cases.sql`, `src/lib/progress.ts`):
- Roadmap types (not in v1, see Gazecraft Future Games): Liar, Relay, Trace, Bury it.
- Families.

## 10. Accessibility
- 4.5:1 text contrast in both themes (tokens pass).
- Keyboard: arrows move a caret over letters, Shift+arrows extend, Enter checks.
- Icon buttons have `aria-label`.

## 11. Direction and reference

### Direction

- A puzzle game, and only that: words and numbers hidden in plain sight.
- Simple, not bland.
- One skill in every game: looking closely.
- Show it, do not caption it.
- For players anywhere.
- Tone: warm and playful.
- For all ages, not a children's product.
- A guest gets 2 games, then signs in.
- Who you are is the front of the game: your character and your pet are chosen on the You tab, never in Settings.
- We promise the practice, never a result.
- Nothing expires and nothing locks a player out: no timed content, no hearts, no energy, no guilt in reminders.
- AI is never named in the UI.
- A new feature replaces or folds into an old one. 2 new games done properly before any more.
- What a copy cannot have, so build toward it: the engine that makes and grades puzzles, the data on which words players miss, a puzzle library the players write, home ground (Naija packs, Pidgin, Paystack), a player's own circle, a player's earned character, and trust.

### Screens: one job each

The rule for every screen: one job, one main action, and the fewest taps to it. Anything that is not the job moves to the screen whose job it is, or goes.

Navigation, on a phone: no bar across the top. Each screen is its title and one action at most.

| Screen | Its one job | Main action | State |
|---|---|---|---|
| Play (dock) | Start the next thing | The next clue | Built |
| Cases `/play` | Show where you are on the path | The next puzzle | Built: the path, a pack a card |
| Puzzle, clue | Find the words | Done | Built |
| Result | Say what happened and lead on | Next clue, or Share | Built: a popup at the finish of a clue, then one line and 2 buttons, the rest behind "More" |
| You `/me` | Who you are: character and pet | Select, or Wear | Built. Holds the week, badges and records. `/u/HANDLE` is only what others see |
| Your People `/players` | What your people did, and finding more | Cheer, follow, or play together | Built: a feed of cards (medals large, with a heart to cheer; notifications with their action as an icon), Your people / Top players. People to follow is a strip inside it: anyone on the game, online players first with a green dot and the count online; each card follows, or opens a room on your next puzzle and invites them (following them first). Friend streaks above, circles below, search behind the search icon (`#find`) |
| Your League `/leaderboard` | Where you stand today | None: it is read | Built: one board at a time, your own row pinned in view |
| Settings | The account | Save | Built: account only. Reached from the gear on You |
| First minute `/welcome` | Make a new player someone | Keep this look | Built: a new player lands in a clue, and the character and pet are asked after the first result |
| Guest wall | Turn a guest into a player | Sign in | Built: after 2 games |
| Make `/make` | Write a puzzle | Publish | Built. To do: sets 6a to 6g. Reached from the foot of Cases, once unlocked |

### Revenue

This is a business. Running costs are near zero, so the first sale is profit.

| Model | What is sold | Who pays | Ready |
|---|---|---|---|
| Commissioned puzzle | Made to order: a wedding, a launch, a sermon series, a class topic | People, churches, schools, companies | Now |
| Private board | A circle with its own puzzles, by the month or the term | Schools, companies, churches | Now |
| Tournament | A week's contest on one puzzle, prize from the sponsor | Brands, companies, schools | Now |
| Sponsored puzzle | A puzzle on the sponsor's subject, marked "With NAME", their link on the result and the share card | Brands | Now |
| Season takeover | A holiday pack and the seasonal dress, "with NAME" | Brands | After set 5c |
| Supporter | One payment: no ads ever, a badge | Players | Needs Paystack |
| Plus, by the month | More puzzles in Make, private rooms, extra outfits | Players | Needs Paystack, set 6e |
| Pet outfits | Outfits for the player's pet. Cosmetic only | Players | Needs Paystack, set 7m |
| Special outfits | For the player's own character. Cosmetic only | Players | Needs Paystack |
| Pet unlock | The points to unlock another pet. Bought points unlock pets only and never count for rank, boards or leagues | Players | Needs Paystack |
| Licence | The game under a school's or a publisher's own name | Schools, publishers, media houses | After private boards are proven |
| Footer ad | One a page, still image, never near a puzzle | Advertisers | Needs the domain, and consent in the EU and UK |

Never for sale: hints, extra tries, time, or anything that touches a score; streak freezes; spins, chests, paid chances; player data; anything that was free on the day a player joined. A sponsored puzzle pays points at the normal rate, never a multiplier.

### How puzzles are written today

`AI_PROVIDER` in `worker/wrangler.toml` is asked in order: OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`, 1 to 2.5 minutes, 50 a day, clumsy at times), Google (`gemini-3.5-flash`, 30 seconds, 20 a day), Groq (never called for real). The brief is `PUZZLE_STANDARD.md`.

### Switched off on purpose

- Google sign in: until the provider is set up in Supabase, then build with `VITE_GOOGLE_AUTH=1`.
- Reminders: until the keys are set.

### Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself.
- Two players finding the same word at the same moment both see it as theirs.
- A room player who closes the tab before the end sends no play.
- Reminder times follow the saved time zone.
- Machine-written puzzles stop for the day when the free limits run out.
- The avatar on the waiting screen bobs and does not blink.
- Mirror words are found, not written: they are whatever everyday words a paragraph happens to hold backwards, so they have nothing to do with the puzzle's subject.
- A clue's popup shows in this browser at the finish only.
- A following board shows your own row only when it is among its rows: your place among the people you follow is not worked out by the server.
- A guest's clues move to the account on sign in with their stars but no points: only a clue played signed in is checked and scored.
- A guest's place on today's board is worked out from a score the browser sent, so it is a guide, never a rank.
- An unfinished puzzle is kept in the browser it was played in, not on the account: a second device starts clean.
- A deleted account leaves them and comes out of the signed in players.
