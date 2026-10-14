# Lantern Row spec

Values are tokens from `src/styles/tokens.css`. Prototype wins on visuals. This file wins on behaviour.

## 1. Brand

**Name:** Lantern Row, a working name. One street, its people, and what they hide. 2 words, capitals on both, in running text.

**Logo:** none yet. Until one is drawn the header shows the name as a plain text link in Manrope, never in Bungee. The favicon is an open eye (`public/favicon.svg`).
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
- Header, by context. None on a step: a step has the whole screen at every width, and its own "The board" link at the top left is the way back. Wide screens: the name left, nav in the dock's order (Cases, Open Eye, Ranks, Settings) 14/600 `--muted`, theme toggle 36 square radius 8, and the same Play as the dock (sm), from `playNext` in `src/lib/playNext.ts`. Its accessible name says which. A phone has the dock and no header bar on app screens. Sticky with quick return: hides on scroll down past its height, returns on any scroll up (8px tolerance), stays while focus is inside.
- Game mobile layout under 760.
- All text boxes reflow. `min-width: 0` on flex children with text. No fixed heights.

## 4. Components

| Component | Spec |
|---|---|
| Button primary | h48 (36 in header), px20, r8, bg `--fg`, text `--bg` 15/700, hover `--fg-strong` |
| Button accent | bg `--accent`, text `--on-accent`, hover `--accent-hover` |
| Button secondary | 1px `--line-3`, text `--fg`, hover bg `--surface-2` |
| TextLink | 14/600 `--muted`, underline offset 4 `--line-3`, hover `--fg` |
| PageHeader | One per tab (Cases, Ranks, Settings). Title is the `h1` at `resultTitle`, left; one action slot on the right (a TextLink, or nothing), baseline aligned, wraps under the title when it does not fit. Same top padding (`--screen-top-game`) on all 4, phone and desktop |
| Ring | An open circle that fills clockwise from 12 o'clock. SVG, 20, stroke 2.5, track `--line-3`, fill `--fg`. Closed (value 1) it turns `--accent-ink`: the only time it is lime, since lime means found. `value` 0 to 1 is a `progressbar`. `parts` makes a segmented ring (an `img` with a label), 12 degrees open between parts: done `--fg` 2.5, rest `--muted` 1.5 in 3 dashes, empty `--line-3` 1.5, so a rest day never reads by colour alone. A segmented ring closes when no part is empty and at least 1 is done |
| WordList | 2px `--fg` top rule. Header title + count. Rows 10 0, 1px `--line`, index 01 left. Chip: found `--accent`/`--on-accent`, missed `--miss`, unfound one • per letter `--line-4`. Chip 2 6, r4. Desktop sticky top 24, max-h min(62vh,640) scroll |
| Segmented | track p4 r10 `--surface` 1px `--line`. Option h36 r7 14/700. Active `--fg`/`--bg` |
| Toggle | 44x26 r13. Off `--line-2`, on `--accent`. Knob 20 |
| Input large | no box, 2px bottom `--line-3`, `row` type |
| Input form | h52 r8 1px `--line-2` bg `--surface` 16px, focus `--line-4` |
| Dialog | scrim `--scrim`, panel max 820 r14 1px `--line-2` bg `--bg`. Esc and outside click close. Focus trapped and restored |

**Skeletons** (`<Skeleton>`, `<SkeletonGroup>`, `<SkeletonList>`, `<SkeletonPills>` in `src/components/Skeleton.tsx`)
Anything that waits on the network shows the shape of what is coming, in the place it will land, so the screen never sits blank and nothing jumps. One rule for every screen, and for every new screen, section or component: if it loads, it ships with its skeleton, and the skeleton changes when the layout does.
- Shapes are `--surface-2` blocks, radius `--radius-sm` (`--radius-pill` for a picture or a pill), sized like the content: a circle the size of the picture, a line the height of the text, a row with the list's own rule and padding. Never a spinner, never a grey box the size of the page.
- The group is `aria-busy="true"` with one hidden word, "Loading."; the shapes are hidden from a screen reader.
- Shown at once, in place, with no delay: a skeleton is quiet enough not to flash.
- A skeleton is for content loading into a screen whose frame is already there. The Waiting screen (the pet and dots) stays for something being made or a whole page being fetched, after 1 second. Nothing at all for a check that answers in a moment (who is signed in), and for a section that may turn out not to exist (room invites, a friend streak that is not offered yet): space is never held for nothing.
- A load that fails says so in a line. A skeleton never stays up in place of an error.

| Where | Skeleton |
|---|---|
| Ranks | 8 rows: a 28 circle, a line, a number |

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
| wrong, 3+ letters | `wrong` line. |
| under 3 letters | nothing |

Streak resets on wrong pick and on hint. `onFound` picks: first find, last one left, every 3rd in a row, quick (<6s), long (8+ letters), else generic. Pools never repeat a line twice in a row.

**Tip-off** (`hint` in code): on screen the pet's help is always a "tip-off": the link "Ask for a tip-off", the phone bar's "Tip-off" button and "1 tip-off" in the count. It marks the first letter of one unfound answer, -25. Which answer is the pet's choice (`HINT_OF`, `hintAnswer` in `src/engine/hint.ts`): Detective X the earliest in reading order (`hint` line), Detective Tobs the longest (`hintLongest`), Agent 404 the shortest (`hintShortest`), Detective Puff the one nearest the player's last find (`hintNear`; the earliest before any find). Every kind costs the same, marks the same thing and goes in the play log the same way, so no pet is worth more than another and the server counts hints as before. In Mirror the first letter is the last of the span, since the word reads right to left. A hinted letter that is off screen, or under the header or the phone bar, is scrolled to the middle of the screen (smooth, or at once under reduced motion). Asked again while the hand is still on that letter: a `hintStill` line, no charge, nothing in the play log.
**Finish:** "I'm done" or last find. Missed answers shade. Under the result actions, "What you missed" (h3): one missed word at a time, in reading order. Its name (13/600 `--subtle`) over the words it hides in at `puzzle` size in `--muted`, with the answer's letters on `--miss` in `--fg`, so AMOS shows "a mos" marked and "t" plain. With 2 or more: "1 of 4" and Previous / Next buttons (44 square, r8, 1px `--line-3`, ChevronLeft / ChevronRight at 18) that wrap around. No motion: it is stepped through often. Under it one `readPast` line when the player's own picks ran across any of them. Hidden when nothing was missed.
**Save and resume:** a game played alone that is left unfinished carries on where it stopped: the finds, the hints, the hand of a hint still showing, the wrong picks and the clock. One line from the `resumed` pool says so when there is a find or a hint to come back to.
- The clock counts time on the puzzle, not time away, in every game played alone. It stops when the player leaves the page, closes the tab, switches app or locks the phone, and starts again on return. The play log uses the same clock, so the server's time is time on the puzzle too. A page that goes without telling us (a crash) keeps its clock running: an accident never shortens a ranked time.
- A step is kept in this browser, one record each (`lantern-resume-CHAPTER~N`, `src/games/resume.ts`).
- A finished game is kept too. Opening it again shows its result, with the board still there, until "Play again" starts clean. Leaving the result to look at the board no longer loses it. The play is sent to the server once: the kept game remembers that it went, so a result opened again is never sent twice. A guest who signs in from the result has that play sent when they come back to it.
- Nothing is dropped in normal play. The store holds 100 games, more than every step of every case; past that, or when storage is full, a finished game goes first, then the game left longest ago, and the one being played is never the one to go.
- A kept game whose words no longer match the puzzle loses those finds and keeps the rest. Stored data that is missing or unreadable is no saved game. Signing out clears it with the rest of this browser's data.

**Clean read:** every word found by you, no hints, no wrong picks (near misses do not count). One `cleanRead` line under the result title. One rule, `cleanReadOf` in `src/engine/skill.ts`; the session only adds that the game is over. Wrong picks are counted in every game for this and scored only on the daily. Result title picked once from `titlePerfect|titleGood|titleLow|titleZero`, then fixed.
**Result lines:** under the result title and its line, each only when it is true: stars, then skill lines (2 at most). A helper with nothing true to say returns no line.
**Stars (result):** a step earns 1 to 3 from `starsFor`. The best is kept per step in this browser (`lantern-chapters`). The result shows them with `<Stars>` at 20, under the result line. When this play raised them, the first finish included, they pop in and one `starsUp` line sits beside them. No stars row at 0 or for any other game.
**Skill lines:** from `skillsOf` on your own finds, one each, 2 at most, rarest first: clean read (`cleanRead`), no-hint perfect (`skillNoHint`: every word, no hint, said only when a wrong pick spoiled the clean read), deep find (`skillDeep`: a word across 3 joins or more, said as the 4 or more words it runs across), long word (`skillLong`: 9 letters or more). In every game, rooms included; a teammate's find never counts.
**Sound:** Web Audio, synthesized, no files (`src/lib/sound.ts`). A soft triangle tick per new letter in a selection, pitch up a semitone per letter from 660 Hz (cap 2 octaves), ticks under 25ms apart merge. A find plays C6 then G6. A new personal record plays E6, G6, C7, 0.45s after the game ends so it follows the last find. Misses are silent. On by default, `gazecraft-sound`=`off` mutes. Audio wakes on the first gesture only. Mute: the Sounds switch in Settings. The puzzle screen carries no sound button. Safari ambient session: the iPhone silent switch mutes it.

**The promise in copy:** we promise the practice, never a result. No pool line or page string says attention span, brain training, memory, IQ or proven (`src/copy/claims.ts`, checked in `npm test`). None works by guilt or by what the player would lose.
**Pets:** the player's pets. A player keeps one and it comes along on every case. On screen they are always "pet" and "pets", never partner; in code and storage the word is still `partner` (`<Partner>`, `lantern-pet`), and it is not renamed.
- Rules are in `src/engine/partners.ts`, pure. Pictures are `public/pets/ID-MOOD.svg`, 7 per pet and bond tier, written by `npm run pets:render` from the drawings: head and shoulders in hat and coat on cream, so one picture works in both themes.
- `<Partner moment>` shows the player's pet in the mood of the moment: hello (waving), empty (calm), loading (thinking), error (stumped), done (happy), found (found), asleep (sleepy). One mood per moment. It is an `<img>` with an empty `alt`, a rounded square at `--radius-xl` so it never reads as a player's round avatar. The player's own avatar stays the detective; the pet never replaces it.
- `<PartnerNote moment layout>`: the player's pet with a line, so a screen with nothing on it is never just grey text. The words always carry the meaning; the pet never replaces them. 2 layouts, by how much of the screen is empty:
  - `screen`: the empty state is what the screen is showing. The pet at 144 (never wider than 44% of the screen), centred in the empty space (the block is at least `min(52vh, 440px)` tall), then, centred under it and at most 36 characters wide: a title of a few words saying why it is empty (18/800 `--fg`, Manrope), the line (`--muted`, 3 lines at most), and one action. Used on: Ranks and a puzzle's board ("The board is open", "Quiet so far", "A quiet day", "No teams yet"), Notifications ("All quiet", then "Find players"), a player's page that is new, missing or did not load.
  - `inline`: a section inside a screen that has other things on it. The pet at 48 beside the line, left aligned. Used on: a board or a page that did not load inside a busy screen.
  - One pet a screen. Never in something smaller than a card (a row, a pill, a toast), and never as decoration with no line.
  - 3 moments: empty (calm), error (stumped: a board, list or page that did not load) and closed (found: at the ending).
  - On an error and a closed case the pet says one short thing of its own first, in a speech bubble (`--surface`, 1px `--line-3`, radius `--radius-xl`, 15/700, a tail toward the pet: sideways inline, upward on a screen), then the plain line.
  - What each pet says is in its voice from `design/brand`: Detective X dry and brief, Tobs trying hard, Puff glad, Agent 404 the number first. Pools `sayErrorCat|Dino|Dog|Robot` and `sayClosedCat|Dino|Dog|Robot`. Never "I told you so", never "that was easy", nothing about the size of an arm.
  - From how empty states are built elsewhere (SAP Fiori's illustrated message, Canva's and Babich's guidance): a picture only where there is room for it, always with a message, a headline that gives the reason, 1 to 3 lines under it, one action, and not 2 pictures on a screen at once.
- Where it shows: the waiting screen, empty and failed states, the guest wall, a step's tip-off and the ending.
- The pick: Settings, the 4 as buttons, all free. Left alone, it is Detective X. Kept in this browser (`lantern-pet`), on no account.
- What a pet does in play: it chooses which answer a tip-off marks. Nothing else, and nothing that changes a score.

**Tab bar (phones, app pages):** a floating dock, 12 from the sides and the bottom plus the safe area, `--tabbar-h` 64 high, `--surface` with a 1px `--line-3` border, radius `--radius-dock` 22 and a hard lower edge of `--ledge` 4 in `--line-3`. Tabs: icon 20 inside a 48 by 28 pill over an 11/800 label, `--muted`; the active tab is `--fg` with the pill filled `--surface-2` (shape and weight, never colour alone). Hidden on the landing page and on a step. It slides below the screen on a scroll down and comes back on any scroll up (section 8, Dock quick return).
- 5 slots: Cases, Open Eye, Play, Ranks, Settings.
- Play, in the middle: a 60 disc raised above the dock, `--fg` fill with a `--bg` Play icon and its own ledge, sinking by the ledge when pressed. One tap from anywhere to the case that is open: its brief, then the step that is open. Only when every case is closed is the disc `--accent` with a Check, leading to Cases.
## 6. Screens

**Landing `/`:** the name (h1), one line ("8 cases on 1 street. Something is hidden in plain sight."), the accent Play button from `playNext` ("Open your case", "Carry on your case", or "See your cases" once every case is closed), a TextLink "All the cases", then the case board of the case that is open.
**Cases:** PageHeader "Cases", then the casebook. Nothing else.

**One job a screen:** every screen has one job and one main action, and the fewest taps to it (`BUILD_PLAN.md`, Screens). What is not the job moves to the screen whose job it is.
- `<IconLink>`: a page action as a 44 square with a 1px `--line-3` border, radius `--radius-lg`. An icon stands alone only where everyone reads it: a gear for Settings, the bell, a pencil on a picture. Anything else carries its word beside the icon.
- On the path, closed cases fold into one row, "3 cases closed" with an Award icon, which opens to show them. So the case being worked is never under a pile of finished ones. With every case closed the row starts open.
- Ranks: the board of the case that is open, or the first one: who has worked it, by the points their steps scored. Signed in only; with sign in not set up, Ranks leads to Cases.
- Your row on a board is pinned in view: it carries the "You" chip on `--surface-2` and sticks to the top or the foot of the screen while the board scrolls past, clear of the dock on a phone. Outside the top of the board it is added as the last row, set apart by a dashed rule, over "You are #41 of 60."

**Guests:** with sign in set up, a guest plays 2 steps to the end. Opening a 3rd shows one screen in place of the step: the pet waving, h1 "Sign in to keep going", one line saying nothing is lost, an accent "Sign in" and a link back to Cases. A step a guest already played stays open. The count is kept in this browser (`lantern-guest-played`). With sign in not set up, a guest plays everything.

**Brief `/case/:id`** (a written chapter, `design/stories`)
A case opens on its board. It is reached from the landing page and from Cases while the chapter is open (below). Its one accent button leads to the step that is open: "Go to the store room" before any step is done, then "Carry on", then "See the line-up" (or "See the ending" where the case closes on anything else). The board shows what this player has found and who they have cleared.
- A case opens when the one before it in its casebook is closed (`caseOpen`), or once it has been started, so a case written later and put before it never shuts a case in progress. Never by a date. Until then its brief is the pet, large and centred, "Not yet", a `caseLocked` line and "Open the case before it", and any of its steps leads back to that.
- Top to bottom: the way back "Cases", the chapter's title (`gameTitle`), the case board, the accent button, then the brief as 1 line each (`body`, `--muted`). A case that is not written: the pet, large and centred, "No such case", a `briefMissing` line and "Back to cases". Chapters are bundled with the game, so nothing loads and there is no skeleton.
- The case board (`<CaseBoard>`) is a pinboard, the same in both themes because it is a thing: cork `--board` with a `--board-edge` frame, paper `--paper`, photos `--photo`, ink `--paper-ink`, pins `--pin`. What is on it comes from the chapter's `board`, in its order, so no 2 cases open alike. A pin leans by `--board-tilt`, one way then the other.
  - `item`, `map`, `photo`, `alibi`: a picture (an icon at 20 until photos are in) over its words. `note`: a title (`label`) over its lines in mono. `left`: a dark card with the open eye, named "Left behind: ..." for a screen reader. `faces`: the suspects in 1 row.
  - A suspect is a photo `--face-max` wide at most: an avatar at 56 drawn from the casebook and the role (`faceSeed`), so a person on the street has the same face in every case they are in, with hair that suits the suspect's `look` (`characterFor`), the name (14/800), the role without "the" (`caption`, `--paper-muted`). 1 to 3 suspects share 1 row. On a phone 4 sit 2 by 2 and 5 sit 3 and 2, so a role is read whole. From 560 wide all sit in 1 row. A name or a role is 1 line and is cut with an ellipsis, never wrapped and never widening the board, and the whole of it is the title. Cleared: the photo greys and "Cleared" is taped across it.
  - The scrawl, both lines as 1, italic in `--board-ink`. Then what was found: the `pin` of each step solved, as slips of paper, in order. The board is named "The case board. ITEM. 4 suspects. 2 finds."

**The chapter that is open** (`openCase`, the first written chapter not yet closed)
- Landing: the main button is "Open your case" before any step is done, "Carry on your case" half way, and "See your cases" once every case is closed.
- Cases is the casebook (`<Casebook>`), then practice. Under the banner "Lantern Row" (`h2`) every written case is a file, in order, on 1 path:
  - Closed: a row with a tick in a `--fg` disc, the title (a link to its ending) and, at the right, the way into its cold case: an empty ringed seal (Award at 18), gold (`--medal-gold`) once the case has been worked cold.
  - Open (the first not closed): a card on `--surface` with a `--ledge` edge: the title (`h3`), its steps as marks (done `--fg`, the open one a lime pill ringed in `--fg`, named "Step 3 of 6", or "6 steps" before any is done), and a secondary button "Open the brief" or "Carry on". No line under it.
  - Shut (written, and a case before it is still open): a dashed row with a Lock and the title.
  - After the last written case, 1 dashed row with a Lock, named for the lowest number not yet written: "Case 5". A later case can be written and opened first, so art never blocks the path. No date is shown for a case that is not written.
  - Every case written: after the last file, the next casebook as 1 dashed row with a Lock, "Casebook 2". No date and no "Tell me when it opens" until the reminder keys are set and the casebook is written.
  - An interlude is a small pill under the file it follows: the open eye and its title once that case is closed (`--muted` once read), the eye alone before.
- The ending, for a guest where sign in is set up: under "Back to cases", a `chapterKeep` line and "Sign in".
- The Play button (the dock, the wide header, the landing page) follows one rule, `playNext`: the written case that is open (its brief before any step is done, then the step that is open), then Cases.
- A step counts toward a guest's 2, and a 3rd step shows the guest wall in place of the step.

**Step `/case/:id/:n`** (one step of a written chapter)
A step is played on the board its method has today, from the puzzle `stepPuzzle` builds: written evidence for hidden words and the blotter, a row from the sums engine for records. Steps open in order. A finished step can be played again, and the best stars are kept.
- Top to bottom: the way back "The board" with the marks at the right (one a step, a records step square, the last largest; done `--fg`, this one a lime pill ringed in `--fg`), the place as the title (`gameTitle`), nothing above it. Then the thing in hand and what to find, as 1 paragraph (`body`, `--muted`): "The key book. ... Find 4 words. They read right to left." Then the board, then "Ask for a tip-off", "I'm done" and the count ("2 of 4") at the right, and the feedback line under them.
- Finished, the paragraph gives way to the result, and the board stays under it, switched off, with what was missed shaded: the stars at 20, `<StepResult>`, a `stepNotCleared` line when the step clears somebody and the player has under 2 stars, the lead (`body`, 700, `--fg`), then the way on (`<Onward>`): one accent button to the next step at the right, where the thumb goes on, the width of the row on a phone ("Go to the bakery", and before the last "To the line-up" or "Weigh the accounts"). At the left, while the step has a star still to earn, a round replay button (RotateCcw at 18, 48 wide, `--surface` with a 1px `--line-3` ring) with no word on it, named "Play it again" for a screen reader. At 3 stars it is not there. Every finished step ends on this row, whatever its method. A screen that decides (the line-up, the accounts, a claim) puts its 1 button at the right too.
- `<StepResult>` is drawn as the case board is, never as a box of text: the fact on a pinned slip of `--paper`, leaning. Beside it, when the step clears somebody, their photo (avatar at 56, name, role), greyed with "Cleared" taped across once 2 stars are earned. Under them, once any of the 3 is known, 3 tags: Chance, Means, Motive. Not yet: a 1px `--line-3` outline in `--subtle`. Found earlier: ringed 2px in `--fg`. Found on this step: `--accent` with `--on-accent`, because lime means found. Read out as "Chance: found. Means: found on this step. Motive: not yet."
- The lead is given, the clearing is earned: finishing a step always opens the next, and clearing its suspect takes 2 stars or more (`CLEAR_STARS`, `chapterProgress`).
- A step that is not open yet: the pet, large and centred, "Not yet", a `stepLocked` line and "Back to the board". A step whose evidence is not written yet: the title, the case board as filled, and a `lineupSoon` line. A step or a chapter that does not exist leads back to the brief or to Cases.
- Kept in this browser: stars under `lantern-chapters` (by chapter and step), an unfinished step under `lantern-resume-CHAPTER~N`. Signed in, a finished step is sent once to be checked (`/api/plays`, `type: "case"`) and kept on the account with its best stars and score, the line-up with the names tried, a step answered by picking with its picks (`picked`, checked by `pickWrongs`), and steps done on another device come down on sign in. A guest's steps stay in the browser.

**Line-up** (the last step of a "who did it", `/case/:id/N`)
Name who is left. It opens when the step before it is done.
- Top to bottom: "The board" with the tries at the right as 2 pips (`--fg` while held, a hollow ring once spent, named "2 tries left"), the title "Who took the Long Spoon?" from the item (or the chapter's own `ask` where nothing was taken: "Who changed the 2 signs?"), the case board, the step's fact on a slip with the 3 tags, then one accent button and a feedback line.
- On the board every suspect who is not cleared is a button the size of their photo. Chosen, it is ringed in `--accent` over `--paper-ink` and the button reads "Name Theo". Until one is chosen the button reads "Pick who is left" and is off. Whoever the evidence cleared cannot be named, so a player who earned every clearing has 1 photo left, and one who earned none has them all.
- A wrong name: "Not them" is taped across that photo, a `lineupWrong` line, a try is spent. After 2 wrong names the mask comes off anyway with an `unmaskOut` line: nobody is locked out.
- Stars (`lineupStars`): 3 for the right name at once, 2 after 1 wrong name, 1 when the tries ran out. Kept with the chapter's other stars.
- Closed, and on every visit after, it is the ending (below).

**Which account fits** (`<Accounts>`, the last step of a case that weighs what could have happened, `/case/:id/N`)
3 tellings of the same night. 1 stands, and each of the others falls to something already found. They are a stack of 3 files with 1 open at a time, so the screen is never 3 paragraphs.
- Top to bottom: "The board" with the tries at the right as 2 pips, the title "Which account fits?", the files, the finds, then one accent button "This one stands" and a feedback line. No case board and no fact slip here: the board is 1 tap away, and the ending says the rest.
- The files: a row of 3 tabs numbered 1 to 3 (`--photo`, `--paper-muted`), named "Account 1", and under them the open file on `--paper` with a `--ledge` edge, its telling in `body` 700. The open file's tab is `--paper` and stands taller. Tapping a tab opens that file. The open file is the one the button names.
- The finds: the `pin` of every step done, as small slips (`caption`, 700) in a row that wraps.
- A wrong pick: that file's telling is struck through in `--paper-muted`, the find that strikes it out (the `pin` of its `struckBy` step) is taped under it, read out as "Struck out by: 41 names, 41 cards", and its tab number is struck through. No line repeats it. A try is spent, and the button is off while a fallen file is open. After 2 wrong picks the one left stands anyway, with an `accountsOut` line: nobody is locked out.
- Weighed, the files stay on screen until the player goes on: the one that stands is open and its tab is a tick on `--accent`, the others are struck, and the button is "See how it ends". On any later visit the step opens on the ending.
- Stars (`accountStars`): 3 for the right account at once, 2 after 1 wrong pick, 1 after 2. It scores nothing, as the line-up scores nothing.

**Could it be done** (`<Claim>`, a step inside a case, `/case/:id/:n`)
A claim set against 2 facts already on the board. The player says which fact decides it and whether it could be done.
- Top to bottom: "The board" and the marks, the place as the title, what was said in quotation marks (`itemTitle`), the 2 facts side by side as slips of `--paper` that are buttons, a 2 way switch ("Could be done", "Could not") the width of the screen, named "Could it be done?" for a screen reader, then one accent button "Say so" with the tries as 2 pips at the right, and a feedback line. Nothing explains it: the step's `thing` is not shown, and a claim and its facts are a line each.
- The button is off until a fact and a verdict are chosen. A chosen fact is ringed as a chosen account is.
- A wrong verdict: a `claimWrong` line, a try is spent, and the same verdict cannot be said twice. After 2 the answer is shown anyway with a `claimOut` line. A wrong answer costs a star and never the lead.
- Done, it ends as any step does: the stars, `<StepResult>`, the lead, the way on and "Play it again". Under them the 2 facts stay, without what was said: the fact that decides has the lime tick (named "This decides it"), and the verdict is stamped ("It could be done", `label`, ringed 2px in `--fg`).
- Stars (`claimStars`): 3 for the right verdict at once, 2 after 1 wrong, 1 after 2. It scores nothing.
- No clock, no tip-off and no phone bar: there is nothing to search.

**Walk it back, the trail** (`<Trail>`, a step inside a case, `/case/:id/:n`)
The case told once more: each find goes back to the place it was found. It is made of the chapter itself (`trailOf`), so nothing is written for it.
- Top to bottom: "The board" and the marks, the place as the title, the find in hand as 1 slip of `--paper`, centred, then the places of the case as stops on a line, top to bottom in the order they were worked: a `--fg` dot and the place (`itemTitle`). A stop is a button the width of the screen. Nothing else: no instruction and no count.
- Tap a stop and the find is pinned there if that is its place. If it is not, it goes to the stop where it belongs, ringed in `--miss`, and that costs a star. A find gets 1 pick, then the next is handed over. The finds come out of order, the same on every device.
- Done, it ends as any step does: the stars, `<StepResult>`, the lead, the way on and "Play it again", with every find at its stop under them.
- Stars (`trailStars`): 3 with every find in its place, 2 with 1 misplaced, else 1. It scores nothing. On screen it is never "memory" or "recall".

**Sweep the room** (`<Sweep>`, a step inside a case, `/case/:id/:n`)
A drawn room, and the player taps what could matter. Most of it is only the room.
- Top to bottom: "The board" and the marks, the place as the title, then the room: its drawing (`src/scenes`, copied from `design/sketches`, a test keeps them the same) the width of the screen at 4 by 3 on `--paper` with a `--ledge` edge, and a button over every thing in it, named for it ("The torch on the piano"). Nothing shows on the drawing until a thing is tapped. Under it "Ask for a tip-off", "I'm done" and the count; on a phone those are the bar under the thumb.
- A small thing is still 40 wide to tap: its hit area grows round it, the drawing does not.
- Evidence tapped: ringed in `--accent` with a tick, because lime means found. A thing that is only the room: shaded, with a cross, and it cannot be tapped again. Either way the lead is never lost.
- A tip-off rings the quarter of the room that holds the next piece not found (`sweepHint`), dashed in `--paper-ink`, never the thing. It costs what any tip-off costs, and asked again while the ring is on it costs nothing. Finding something takes the ring away.
- It ends when every piece is found, or on "I'm done". Then what was missed is ringed in ink on the drawing, under the stars, `<StepResult>`, the lead, the way on and "Play it again".
- Stars as for any board (`starsFor`): 3 with everything found, no tip-off and no tap on the room; 2 for 80% found; else 1. It scores nothing. The drawing loads on a skeleton the shape of the room.

**The torn page** (`<TornPage>`, a step inside a case, `/case/:id/:n`)
A page torn top to bottom (`tornOf`). The left halves are on the page in order, and the right halves are a pile under it, out of order.
- Top to bottom: "The board" and the marks, the place as the title, the page (`--paper` with a `--ledge` edge): each line a strip on `--photo` in `--font-mono`, its left half, then an empty dashed strip where its right half goes. The line that is open has its strip ringed in `--paper-ink`. Under the page, the pile: each right half a strip that is a button. No instruction.
- Each tear has its own shape, the same on both halves: a jagged edge of 5 points, each 0 to 3 steps of `--space-1` deep, the right half's the left's turned inside out. Set together they overlap by the depth of the tear and close up, so a line can be matched by the shape of its tear as well as by its sense.
- Tap a half and it goes on the line that is open. A line gets 1 pick: the wrong half goes back to the pile, the right one is set in its place, and the line is marked under (`--miss`). It costs a star and never the lead.
- Stars (`tornStars`): 3 with every line whole, 2 with 1 set wrong, else 1. It scores nothing.

**The missing step** (`<Chain>`, a step inside a case, `/case/:id/:n`)
Events in order with 1 gap, and 3 things that could have happened in it. Only 1 fits.
- Top to bottom: "The board" and the marks, the place as the title, the events on a line top to bottom (a `--fg` dot and 1 line each, `small` 700) with the gap among them as an empty dashed slip beside a hollow dot, then the 3 things that could fill it as slips of `--paper`, each a button the width of the screen, and the tries as 2 pips. No instruction and no button to confirm: a tap picks.
- The one that fits goes into the gap, with a tick in a lime disc (named "This fits"). A wrong pick is struck through and cannot be picked again, and a try is spent. After 2 wrong picks the gap is filled anyway with a `claimOut` line. A wrong pick costs a star and never the lead.
- Done, it ends as any step does: the stars, `<StepResult>`, the lead, the way on and "Play it again", with the events and the filled gap under them.
- Stars: 3 at once, 2 after 1 wrong pick, 1 after 2. It scores nothing.

**The Open Eye file** (`/open-eye`, `src/engine/openEye.ts`)
Every message to the Open Eye a player has read, in the order of the story: the steps marked `eye` in each chapter (a line passed in plain sight, intercepted) and the interludes after the case they follow.
- Top to bottom: the title "The Open Eye", then the file. A message read is the dark card it was found on (`--board`, `--board-ink`): the eye in a `--paper` disc, the message as it was written in `--font-mono`, and where it was found (`caption`). Pinned under it, on a leaning slip of `--paper`, what it says read the Open Eye's way. A message not read yet is its card, shut: dashed, with the eye, named "A message not read yet", in its place, so the file shows what is still out there.
- Nothing read yet: the pet, large and centred, "Nothing filed yet", an `eyeEmpty` line and "Open your case".
- The way in: on Cases, at the right of the casebook's banner, once 1 message is read: a pill on `--board` with the eye and "The Open Eye". Bundled, so nothing loads and there is no skeleton.

**Cold case** (`/cold/:id`, `/cold/:id/:n`, `src/lib/cold.ts`)
A closed case worked again with no tip-offs, for a gold seal. The same screens as the case, from the same chapter.
- It opens only for a closed case: any other leads to that case's brief. It starts from an empty board, with stars of its own kept in this browser beside the case's (`cold~ID` in `lantern-chapters`), so the case's own stars never change.
- A board step has no "Ask for a tip-off" and no Tip-off on the phone bar. Nothing is sent to the server, nothing counts against a guest's 2 games, and a step still counts as a day played.
- Closed cold, the ending shows a gold seal (Award at 18 on a `--medal-gold` disc, named "Gold seal") before the stars, and the file on Cases carries it.

**Interlude** (`/interlude/:id`, `design/stories/interludes`)
1 message to the Open Eye, intercepted between 2 cases. 1 sitting on 1 hidden-words board.
- It is played as a step is (`<Play>`): "Cases" as the way back, no marks, the title, the thing in hand and what to find, the board, the tip-off and "I'm done". Finished: the stars, what it says on a pinned slip, and one accent button "Back to cases".
- It opens when the case it follows is closed, and never blocks the next case. Its stars are kept in this browser under its own id. Nothing is sent.

**Ending** (`<Ending>`, a closed case, whatever its shape and whichever step closed it)
- "The board" and the stars, "Case closed" (`gameTitle`), then the ending a card at a time, never as 1 page of text. 3 cards in a row that scrolls sideways and stops on each (scroll snap): the culprit's photo (avatar at 96, name, role) pinned beside what was found on a slip; the confession in quotation marks (`itemTitle`); what came after (`body`, `--muted`).
- Under the cards: one accent button, "Next" until the last card and "Back to cases" on it, and 3 dots at the right (a ring, filled `--fg` for the card in view, each a button named "Card 2 of 3"). A swipe, the button and a dot all move the cards. The move is smooth unless reduced motion is asked for.
- It says what was found, what the culprit says and what is still undecided, and draws no lesson. A case that is not a "who did it" ends the same way: who it was is still 1 of the people in the brief, and what was found says what happened.
- Not every screen pages. The ending is cards because it is 3 things read in order. The accounts are files because they are 3 things compared. A claim is 2 slips side by side, and a step is its board.

**Mobile <760**
Fixed bottom bar (`--bg`, top 1px `--line-2`, pad 12 16 + safe area): Ring, count, time at the far end; live message, Hint and Done (h44). Main padding-bottom 96. WordList static below puzzle. BigClock hidden.

**Sign in `/signin`**
The lead ends "Accounts are for players aged 13 and over." The privacy page says the same, and lists every company that receives data under "Who receives data". Google + email OTP → 6 digit code (auto submit, resend after 30s) → a new account picks its name and handle on the same screen (@handle autofilled from name until edited) → return to `next`, or Cases when there is none. An account with a profile goes straight to `next`. Settings, signed in: name, handle, email, Sign out, Delete account (confirm).

## 8. Motion
Durations and easings are tokens. Reduced motion sets them to 0 and disables FLIP and hover slide.

Rules for any new motion (from Emil Kowalski's design engineering skill, linked in `BUILD_PLAN.md`):
- `--ease-out` is `cubic-bezier(.23,1,.32,1)`: it moves most in the first moments, so the screen answers at once. Used for anything entering, leaving or pressed. `--ease-std` for colour. Never ease-in.
- Only `transform` and `opacity` move. Name the properties, never `transition: all`.
- Under 300ms for anything in the interface. Longer only for the landing how-to and rare moments (a closed case).
- How often it is seen decides how much it moves: many times a day (a find, stepping the reveal, a tab) little or nothing; rare moments can carry more.
- Nothing grows from scale 0. Start at 0.8 or more.
- Hover styles sit behind `(hover: hover) and (pointer: fine)`, so a tap on a phone does not leave one stuck.

| Element | Transition |
|---|---|
| Letter | bg, color 180ms ease |
| Hint hand | rises 6 and fades in once, `--dur-slow` `--ease-out`. It does not loop |
| Tab bar | active pill pops from 0.8 scale, `--dur-slow` `--ease-out`; a pressed tab's pill scales to 0.9; the Play disc sinks by `--ledge`, `--dur-fast` |
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
| Skeleton | opacity 1 to 0.5 and back, `--dur-skeleton` each way, `--ease-loop`. A second loop allowed past 300ms, because it only says "still coming". Still under reduced motion |
| Waiting | the other loop outside the landing, so it is allowed past 300ms. The pet bobs up `--space-1` and back, `--dur-bob` each way, `--ease-loop`. 3 dots in `--muted` hop `--space-1h` one after the other, a `--dur-bounce` cycle, each `--dur-bounce-step` behind the last, `--ease-loop`. Only `transform` moves. No blink: the avatar is drawn by `<Avatar>` and is not redrawn. The line changes every 20 seconds with no motion. Shown after 1 second, kept at least 600ms. Reduced motion: no bob, no hop, the line still changes |
| Stars | on the clue or the case just finished, and on the result screen: earned stars pop in one at a time, each from 0.8 scale and 0 opacity, `--dur-star` `--ease-out`, each `--dur-star-step` behind the last. Stars already seen do not move. Reduced motion: all shown at once |
| Secret piece | on a clue's result: the slots this clue filled pop in, each from 0.8 scale and 0 opacity, `--dur-star` `--ease-out`. Slots held before do not move. Reduced motion: shown at once |
| Unmasking | once, on the result that closes a case: after `--dur-slower` the mask lifts up and off the culprit (`transform` and `opacity`, `--dur-unmask` `--ease-out`), then the "Case closed" stamp lands from 1.5 scale and 0 opacity, `--dur-stamp` `--ease-out`. A rare moment (once per case), so it may pass 300ms. Reduced motion: the mask is simply off and the stamp is down |
| Clue done | the popup rises `--space-4` from 0.96 scale and 0 opacity, `--dur-slower` `--ease-out`, and its stars pop as stars do. Reduced motion: it is there |
| Burst | 18 small pieces of paper fly out from one point and fade, `transform` and `opacity` only, `--dur-burst` `--ease-out`, each starting `--dur-burst-step` after the last, reaching `--burst-reach`. Once, behind 3 stars in the popup, and behind the culprit at the unmasking, where it waits for the mask (`--burst-delay`) and the culprit swells to 1.08 and settles, `--dur-reveal`. Rare moments, so they may pass 300ms. Reduced motion: no paper, no swell |
| Sums tile | a tile being selected lifts by `--space-1`, `--dur-fast`. A found run's tiles settle from 1.18 scale, `--dur-slow` `--ease-out`. The meter fills by `transform`, `--dur-base`. Reduced motion: none of it |
| Dock quick return | phones: the dock slides below the screen on a scroll down and back on any scroll up, `transform` only, `--dur-slow` `--ease-out`, the same rule as the header (8px of scroll before it moves). Always shown near the top, at the end of the page, on a new page, and while focus is inside it. Reduced motion: it is there or not, with no slide |

Nothing else animates.

## 9. Game system
- Registry: `type -> { build(def), check(puzzle, sel), Board }`. Types: `hidden-words`, `mirror`, `buried-sums`. Every step with a board is played on one of them.
- Difficulty (computed): Hard if 20+ answers or 900+ chars. Easy if 9 or fewer and under 260 chars. Else Medium.
- Score: 100 per find, -25 per hint, + max(0, 600 - secs) when all found. Floor 0.
- Buried sums (`src/engine/sums.ts`): a row of digits 1 to 9, and the runs of 2 or more in a row that add up to a target from 10 to 17. No zero, so a run has one length.
  - The engine makes the row from the clue's own name (`the-long-spoon~2`), so it is the same on every device and on the server, and nothing is written or stored. A case's first sums clue is 18 digits hiding 3 runs, its second 24 hiding 4, later ones 30 hiding 5. The row holds exactly that many runs and no 2 share a digit.
  - The board is tiles (`<Puzzle variant="tiles">`): each digit a tile 44 by 52, `--surface`, 1px `--line-3`, radius `--radius-lg`, a `--ledge` edge, 26/800 tabular. The spaces between are not drawn. A tile being selected lifts by 4 and turns `--sel`. A found run is `--accent` with an `--on-accent` edge. A missed one after the finish is `--miss` with a dashed border.
  - Above the tiles, one card: "Target" over the number at 36/800, a rule, then the selection as a sum ("7 + 1 + 7 = 15", 18/800) over a meter that fills toward the target. The meter is `--fg` while under, `--accent-ink` on the target and hatched `--subtle` when over, so too much reads without a colour for wrong. Numbers only, no line of copy. On touch the bubble above the finger shows the total ("= 15").
  - A selection is right when it is the run itself, dragged either way. One digit short or long at one end is a near miss with no penalty. The list shows a found run as its sum ("3 + 8 + 4") and an unfound one as a blank per digit.
- Mirror (`src/engine/mirror.ts`): hidden words that read right to left. Nothing new is written: the engine reads a paragraph backwards and lists the everyday words that turn up.
  - It reads by `data/mirrorWords.json`: everyday words of 4 to 7 letters, each a real word, none the same both ways. A word inside a longer find is left to the longer ("trap" in "traps"). The list is short on purpose, so no clue asks for a word a player would not know.
  - A selection is right when its letters, read right to left, spell a listed word, dragged either way.
- Chapters (`src/engine/chapter.ts`, `design/stories/`): a case written down as a detective works it, one file a chapter. Written, not played yet: no screen reads one until the brief and the suspect board are built, and a case with no chapter keeps today's flow.
  - A file holds its shape (who did it, prove it, what is it really, where is it, nothing was taken), the case it is told on, the item, the place, the brief, the opening board, 1 to 5 suspects, the culprit, 5 to 7 steps and the ending. A "who did it" has 2 or more. A suspect is a role the game can draw (a `culpritWho` line) with a `look` (feminine or masculine: we wrote them, so we say how they are drawn, and a "Mr" is never drawn as a woman) and a name of 10 letters at most, so it sits on 1 line under a face with 5 across on a phone, why they are on the board and where they say they were. A step is a place, a method, the thing in hand, the fact it leaves, the suspect it clears or which of means, motive and chance it gives, the few words it pins to the board when solved (26 letters at most), and the lead to the next place. The opening board is 1 to 5 pins of the chapter's own choosing (`item`, `note`, `left`, `faces`, `map`, `photo`, `alibi`) and up to 2 lines of scrawl, so no 2 cases open alike: a "where is it" can open on a map with no faces, a "prove it" on 1 face and an alibi.
  - `checkChapter` lists what is wrong with one, and a test runs it over every file. The culprit is 1 of the suspects. Every other suspect is cleared once, by evidence. Means, motive and chance are each given once. Every step but the last ends on a lead to the next step's place. Nothing before the last step names the culprit, by role or by name, except in a "prove it": there the brief says who, and the question is how. A "who did it" ends on the line-up and has it nowhere else. Every case closes on its last step and only there, on the line-up or on the accounts (`CLOSERS`). Every line keeps the copy rules and is 240 characters at most.
  - How one is written. Start from the culprit's evening and work back: what they needed, what they touched, what they tried to destroy and what they forgot. Every clue is a thing somebody kept for their own reasons, and each one is used. A suspect may lie, for a reason of their own that a record then shows. The motive is human and is not judged: the ending says what was found, what the culprit says and what is still undecided, and draws no lesson. Anything the ending relies on is in the brief or a step first.
  - A hidden-words or a blotter step can carry its evidence: the `text` the player searches and the `words` hidden in it. `checkChapter` runs the engine that will grade it and refuses a text in which a word is not found. A blotter's text is stored back to front, as the blotter holds it. A sums step carries none: its row is made by the sums engine.
  - A chapter says which casebook it is in and its place there (`casebook`, `number`). One marked `draft` is written and checked like any other and is not open to players: no screen, search page or Worker knows it. None is a draft today.
  - "Which account fits" (`accounts`): a step with 3 accounts of the same night. Exactly 1 stands. Each of the others names the step, already done, whose fact strikes it out, and `checkChapter` refuses one struck by a step still to come. Stars: 3 for the right account at once, 2 after 1 wrong pick, 1 after 2 (`accountStars`).
  - "Could it be done" (`claim`): a step with what somebody says, 2 facts and whether it could be done. Each fact names the step, already done, that it comes from, and exactly 1 of them decides. A verdict is the fact that decides and yes or no, kept as 1 number (`claimPick`).
  - A step answered by picking (`pickStep`: the accounts, a claim) has no board. The client and the Worker both count its wrong picks with `pickWrongs`, which refuses a list nobody could have made: a pick twice, a pick after the right one, or more picks than there are tries.
  - "Walk it back, the trail" (`trail`): a step with nothing of its own but its fact and its lead. Its stops are the places of the steps before it that pinned a find, and it needs 3 or more, each at a place of its own. The picks sent are the place chosen for each find, in the order handed out (`trailWrongs`).
  - "Sweep the room" (`sweep`): a step with a room: the scene it is drawn in, and every thing a player can tap, each with a name and a box on the 1200 by 900 drawing. 5 to 7 are `evidence`, and 6 at least are only the room. The picks sent are the things tapped, in order, with the tip-offs in the log (`sweepResult`).
  - "The missing step" (`chain`): a step with 3 events in order, where the gap falls among them (`gap`, never first or last) and 3 things that could fill it, exactly 1 of which `fits`. It is a step answered by picking.
  - "The torn page" (`torn`): a step with a `page` of 3 to 6 lines of 10 to 40 letters. The engine tears each near its middle, at a place the chapter's id chooses, and deals the right halves out of order. The picks sent are the right half set on each line, in order (`tornWrongs`).
  - Interludes (`src/engine/interlude.ts`): a file holds the casebook, the case it follows, a title, the thing, the text, its hidden words and what it says. `checkInterlude` runs the engine over it, and a test runs that over every file. Written: The bookmark, after case 4, and The envelope, after case 7.
  - Written so far, in the order of the casebook: The long spoon; The open box (`the-open-box`): nothing was taken, 2 suspects, the first to weigh accounts; The early bus (`the-early-bus`): a "prove it" with 1 suspect, the first "could it be done", closed on the accounts; The year that is missing (`the-year-that-is-missing`): a "where is it" with 3 suspects, the first trail, a claim that could not be done, closed on the accounts; The light in the hall (`the-light-in-the-hall`): a "what is it really" with 4 suspects, the first sweep of a drawn room, closed on the accounts; The 2 signs (`the-2-signs`, number 6, written before case 5): a "who did it" with 2 suspects, the first missing step, with a claim and a trail; The other spoon (`the-other-spoon`): a "prove it" with 1 suspect, the first torn page, opened by a sweep of the sale room, closed on the accounts; Who carries the cards (`who-carries-the-cards`): a "who did it" with 5 suspects, no new method, every kind of step so far, and the 2011 page read at its end. Lantern Row is whole.
  - The first of all: The long spoon (`the-long-spoon`), a "who did it" told on Market day.

## 10. Accessibility
- 4.5:1 text contrast in both themes (tokens pass).
- Keyboard: arrows move a caret over letters, Shift+arrows extend, Enter checks. Live region announces.
- Icon buttons have `aria-label`. Touch targets 44 minimum.
