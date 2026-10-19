# Lantern Row spec

Values are tokens from `src/styles/tokens.css`. Prototype wins on visuals.

## 1. Brand

**Name:** Lantern Row, a working name. One street, its people, and what they hide. 2 words, capitals on both, in running text.

**Logo:** none yet. Until one is drawn the header shows the name as a plain text link in Manrope, never in Bungee.
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
| PageHeader | One per tab page (Cases, Ranks, Settings). Title is the `h1` at `resultTitle`, left; one action slot on the right (a TextLink, or nothing), baseline aligned, wraps under the title when it does not fit. Same top padding (`--screen-top-game`) on all 3, phone and desktop |
| Ring | An open circle that fills clockwise from 12 o'clock. SVG, 20, stroke 2.5, track `--line-3`, fill `--fg`. Closed (value 1) it turns `--accent-ink`: the only time it is lime, since lime means found. `value` 0 to 1 is a `progressbar`. `parts` makes a segmented ring (an `img` with a label), 12 degrees open between parts: done `--fg` 2.5, rest `--muted` 1.5 in 3 dashes, empty `--line-3` 1.5, so a rest day never reads by colour alone. A segmented ring closes when no part is empty and at least 1 is done |
| WordList | 2px `--fg` top rule. Header title + count. Rows 10 0, 1px `--line`, index 01 left. Chip: found `--accent`/`--on-accent`, missed `--miss`, unfound one • per letter `--line-4`. Chip 2 6, r4. Desktop sticky top 24, max-h min(62vh,640) scroll |
| Segmented | track p4 r10 `--surface` 1px `--line`. Option h36 r7 14/700. Active `--fg`/`--bg` |
| Toggle | 44x26 r13. Off `--line-2`, on `--accent`. Knob 20 |
| Input large | no box, 2px bottom `--line-3`, `row` type |
| Input form | h52 r8 1px `--line-2` bg `--surface` 16px, focus `--line-4` |
| Dialog | scrim `--scrim`, panel max 820 r14 1px `--line-2` bg `--bg`. Esc and outside click close. Focus trapped and restored |

**Skeletons** (`<Skeleton>`, `<SkeletonGroup>`, `<SkeletonList>`, `<SkeletonPills>` in `src/components/Skeleton.tsx`)
Anything that waits on the network shows the shape of what is coming, in the place it will land, so the screen never sits blank and nothing jumps. One rule for every screen, and for every new screen, section or component: if it loads, it ships with its skeleton, and the skeleton changes when the layout does.
- Shapes are `--surface-2` blocks, radius `--radius-sm` (`--radius-pill` for a picture or a pill), sized like the content: a circle the size of the picture, a line the height of the text, a row with the list's own rule and padding.
- The group is `aria-busy="true"` with one hidden word, "Loading."; the shapes are hidden from a screen reader.
- Shown at once, in place, with no delay: a skeleton is quiet enough not to flash.
- A skeleton is for content loading into a screen whose frame is already there.
- A load that fails says so in a line.

| Where | Skeleton |
|---|---|
| Ranks | 8 rows: a 28 circle, a line, a number |

## 5. Boards of letters and digits
The reading steps (hidden words, the blotter, buried sums) are played on a board. The paragraph renders one span per character. Letters carry `li` (index in lowercase letter stream `S`).

**Letter states:** idle transparent · selecting `--sel`/`--sel-fg` · found `--accent`/`--on-accent` · missed (after finish) `--miss` · tip-off: a 2px `--fg` ring around the letter over a `--hint-bg` wash, and a hand (Pointer at 0.62em of the puzzle type, about 12 on a phone and 17 on a desk, `--fg` on `--bg`) under it pointing up, small enough to sit between two lines. Selecting and found win the fill, and the ring and the hand still show on them, so a tip-off for a word that starts inside a found word is seen.

**Input**
- Mouse/pen: drag (pointerdown starts, window pointermove extends via `elementFromPoint`, pointerup evaluates), or click first letter then last.
- Touch: swipe sideways, press and hold then drag, or tap first letter (copy `tapNext`) then last.
- Tap or click the anchored letter again to cancel.
- Second tap or click: the whole range shows as selecting for `--dur-connect` (220ms), then is checked.

**Evaluate** (`src/engine/evaluate.ts`):
| Result | Action |
|---|---|
| hit | mark found, `onFound(ctx)` line, word moves to top of list |
| already | `already` line |
| near miss (`isClose`) | `close` line, no penalty |
| wrong, 3+ letters | `wrong` line. |
| under 3 letters | nothing |

Streak resets on a wrong pick and on a tip-off. `onFound` picks: first find, last one left, every 3rd in a row, quick (<6s), long (8+ letters), else generic.

**Tip-off** (`hint` in code): on screen the pet's help is always a "tip-off": the link "Ask for a tip-off", the phone bar's "Tip-off" button and "1 tip-off" in the count. It marks the first letter of one unfound answer, and costs 25 points.
**Finish:** "I'm done" or last find. Missed answers shade.
**Save and resume:** a step left unfinished carries on where it stopped: the finds, the tip-offs, the hand of a tip-off still showing, the wrong picks and the clock. One line from the `resumed` pool says so when there is a find or a tip-off to come back to.
- The clock counts time on the step, not time away.
- A step is kept in this browser, one record each (`lantern-resume-CHAPTER~N`, `src/games/resume.ts`).
- A finished game is kept too.
- Nothing is dropped in normal play.
- Stored data that is missing or unreadable is no saved game.

**Clean read:** every word found by you, no tip-offs, no wrong picks (near misses do not count). One `cleanRead` line under the result title.
**Result lines:** under the result title and its line, each only when it is true: stars, then skill lines (2 at most). A helper with nothing true to say returns no line.
**Stars (result):** a step earns 1 to 3 from `starsFor`. The best is kept per step in this browser (`lantern-chapters`).
**Skill lines:** from `skillsOf` on your own finds, one each, 2 at most, rarest first: clean read (`cleanRead`), no tip-off perfect (`skillNoHint`: every word, no tip-off, said only when a wrong pick spoiled the clean read), deep find (`skillDeep`: a word across 3 joins or more, said as the 4 or more words it runs across), long word (`skillLong`: 9 letters or more). On every board step.
**Sound:** Web Audio, synthesized, no files (`src/lib/sound.ts`). A soft triangle tick per new letter in a selection, pitch up a semitone per letter from 660 Hz (cap 2 octaves), ticks under 25ms apart merge.

### Across the game

**The promise in copy:** we promise the practice, never a result. No pool line or page string says attention span, brain training, memory, IQ or proven (`src/copy/claims.ts`, checked in `npm test`).
**Pets:** the player's pets. A player keeps one and it comes along on every case.
- Rules are in `src/engine/partners.ts`, pure.
- `<Partner moment>` shows the player's pet in the mood of the moment: hello (waving), empty (calm), loading (thinking), error (stumped), done (happy), found (found), asleep (sleepy).
- `<PartnerNote moment layout>`: the player's pet with a line, so a screen with nothing on it is never just grey text.
- Where it shows: the waiting screen, empty and failed states, the guest wall, a step's tip-off and the ending.
- Pets are drawn in clean shapes and never dressed as people. The people of the street, the player's detective among them, are in `design/CHARACTERS.md`.
- The pick: Settings, the 4 as buttons, all free.
- What a pet does in play: it chooses which answer a tip-off marks.

**Tab bar (phones, app pages):** a floating dock, 12 from the sides and the bottom plus the safe area, `--tabbar-h` 64 high, `--surface` with a 1px `--line-3` border, radius `--radius-dock` 22 and a hard lower edge of `--ledge` 4 in `--line-3`. Tabs: icon 20 inside a 48 by 28 pill over an 11/800 label, `--muted`; the active tab is `--fg` with the pill filled `--surface-2` (shape and weight, never colour alone).
- 5 slots: Cases, Notebook, Play, Ranks, Settings.
- Play, in the middle: a 60 disc raised above the dock, `--fg` fill with a `--bg` Play icon and its own ledge, sinking by the ledge when pressed.
## 6. Screens

**Landing `/`:** the name (h1), one line ("8 cases on 1 street. Something is hidden in plain sight."), the accent Play button from `playNext` ("Open your case", "Carry on your case", or "See your cases" once every case is closed), a TextLink "All the cases", then the case board of the case that is open.
**Cases:** PageHeader "Cases", then the casebook. Nothing else.

**One job a screen:** every screen has one job and one main action, and the fewest taps to it (`BUILD_PLAN.md`, Screens). What is not the job moves to the screen whose job it is.
- `<IconLink>`: a page action as a 44 square with a 1px `--line-3` border, radius `--radius-lg`.
- On the path, closed cases fold into one row, "3 cases closed" with an Award icon, which opens to show them.
- Ranks: the board of the case that is open, or the first one: who has worked it, by the points their steps scored.
- Your row on a board is pinned in view: it carries the "You" chip on `--surface-2` and sticks to the top or the foot of the screen while the board scrolls past, clear of the dock on a phone.

**Guests:** with sign in set up, a guest plays 2 steps to the end. Opening a 3rd shows one screen in place of the step: the pet waving, h1 "Sign in to keep going", one line saying nothing is lost, an accent "Sign in" and a link back to Cases.

**Brief `/case/:id`** (a written chapter, `design/stories`)
A case opens on its board. It is reached from the landing page and from Cases while the chapter is open (below).
- A case opens when the one before it in its casebook is closed (`caseOpen`), or once it has been started, so a case written later and put before it never shuts a case in progress.
- Top to bottom: the way back "Cases", the chapter's title (`gameTitle`), the case board, the accent button, then the brief as 1 line each (`body`, `--muted`).
- The case board (`<CaseBoard>`) is a pinboard, the same in both themes because it is a thing: cork `--board` with a `--board-edge` frame, paper `--paper`, photos `--photo`, ink `--paper-ink`, pins `--pin`.

**The chapter that is open** (`openCase`, the first written chapter not yet closed)
- Landing: the main button is "Open your case" before any step is done, "Carry on your case" half way, and "See your cases" once every case is closed.
- Cases is the casebook (`<Casebook>`).
- The ending, for a guest where sign in is set up: under "Back to cases", a `chapterKeep` line and "Sign in".
- The Play button (the dock, the wide header, the landing page) follows one rule, `playNext`: the written case that is open (its brief before any step is done, then the step that is open), then Cases.
- A step counts toward a guest's 2, and a 3rd step shows the guest wall in place of the step.

**Step `/case/:id/:n`** (one step of a written chapter)
A step is played on the board its method has today, from the puzzle `stepPuzzle` builds: written evidence for hidden words and the blotter, a row from the sums engine for records. Steps open in order.
- Top to bottom: the way back "The board" with the marks at the right (one a step, a records step square, the last largest; done `--fg`, this one a lime pill ringed in `--fg`), the place as the title (`gameTitle`), nothing above it.
- Finished, the paragraph gives way to the result, and the board stays under it, switched off, with what was missed shaded: the stars at 20, `<StepResult>`, a `stepNotCleared` line when the step clears somebody and the player has under 2 stars, the lead (`body`, 700, `--fg`), then the way on (`<Onward>`): one accent button to the next step at the right, where the thumb goes on, the width of the row on a phone ("Go to the bakery", and before the last "To the line-up" or "Weigh the accounts").
- `<StepResult>` is drawn as the case board is, never as a box of text: the fact on a pinned slip of `--paper`, leaning.
- The lead is given, the clearing is earned: finishing a step always opens the next, and clearing its suspect takes 2 stars or more (`CLEAR_STARS`, `chapterProgress`).
- A step that is not open yet: the pet, large and centred, "Not yet", a `stepLocked` line and "Back to the board".
- Kept in this browser: stars under `lantern-chapters` (by chapter and step), an unfinished step under `lantern-resume-CHAPTER~N`.

**Line-up** (the last step of a "who did it", `/case/:id/N`)
Name who is left. It opens when the step before it is done.
- Top to bottom: "The board" with the tries at the right as 2 pips (`--fg` while held, a hollow ring once spent, named "2 tries left"), the title "Who took the Long Spoon?" from the item (or the chapter's own `ask` where nothing was taken: "Who changed the 2 signs?"), the case board, the step's fact on a slip with the 3 tags, then one accent button and a feedback line.
- On the board every suspect who is not cleared is a button the size of their photo.
- A wrong name: "Not them" is taped across that photo, a `lineupWrong` line, a try is spent.
- Stars (`lineupStars`): 3 for the right name at once, 2 after 1 wrong name, 1 when the tries ran out.
- Closed, and on every visit after, it is the ending (below).

**Which account fits** (`<Accounts>`, the last step of a case that weighs what could have happened, `/case/:id/N`)
3 tellings of the same night. 1 stands, and each of the others falls to something already found. They are a stack of 3 files with 1 open at a time, so the screen is never 3 paragraphs.
- Top to bottom: "The board" with the tries at the right as 2 pips, the title "Which account fits?", the files, the finds, then one accent button "This one stands" and a feedback line.
- The files: a row of 3 tabs numbered 1 to 3 (`--photo`, `--paper-muted`), named "Account 1", and under them the open file on `--paper` with a `--ledge` edge, its telling in `body` 700.
- The finds: the `pin` of every step done, as small slips (`caption`, 700) in a row that wraps.
- A wrong pick: that file's telling is struck through in `--paper-muted`, the find that strikes it out (the `pin` of its `struckBy` step) is taped under it, read out as "Struck out by: 41 names, 41 cards", and its tab number is struck through.
- Weighed, the files stay on screen until the player goes on: the one that stands is open and its tab is a tick on `--accent`, the others are struck, and the button is "See how it ends".
- Stars (`accountStars`): 3 for the right account at once, 2 after 1 wrong pick, 1 after 2.

**Could it be done** (`<Claim>`, a step inside a case, `/case/:id/:n`)
A claim set against 2 facts already on the board. The player says which fact decides it and whether it could be done.
- Top to bottom: "The board" and the marks, the place as the title, what was said in quotation marks (`itemTitle`), the 2 facts side by side as slips of `--paper` that are buttons, a 2 way switch ("Could be done", "Could not") the width of the screen, named "Could it be done?" for a screen reader, then one accent button "Say so" with the tries as 2 pips at the right, and a feedback line.
- The button is off until a fact and a verdict are chosen.
- A wrong verdict: a `claimWrong` line, a try is spent, and the same verdict cannot be said twice.
- Done, it ends as any step does: the stars, `<StepResult>`, the lead, the way on and "Play it again".
- Stars (`claimStars`): 3 for the right verdict at once, 2 after 1 wrong, 1 after 2.
- No clock, no tip-off and no phone bar: there is nothing to search.

**Walk it back, the trail** (`<Trail>`, a step inside a case, `/case/:id/:n`)
The case told once more: each find goes back to the place it was found. It is made of the chapter itself (`trailOf`), so nothing is written for it.
- Top to bottom: "The board" and the marks, the place as the title, the find in hand as 1 slip of `--paper`, centred, then the places of the case as stops on a line, top to bottom in the order they were worked: a `--fg` dot and the place (`itemTitle`).
- Tap a stop and the find is pinned there if that is its place.
- Done, it ends as any step does: the stars, `<StepResult>`, the lead, the way on and "Play it again", with every find at its stop under them.
- Stars (`trailStars`): 3 with every find in its place, 2 with 1 misplaced, else 1.

**Sweep the room** (`<Sweep>`, a step inside a case, `/case/:id/:n`)
A drawn room, and the player taps what could matter. Most of it is only the room.
- Top to bottom: "The board" and the marks, the place as the title, then the room: its drawing (`src/scenes`, copied from `design/sketches/rooms`, a test keeps them the same) the width of the screen at 4 by 3 on `--paper` with a `--ledge` edge, and a button over every thing in it, named for it ("The torch on the piano").
- A small thing is still 40 wide to tap: its hit area grows round it, the drawing does not.
- Evidence tapped: ringed in `--accent` with a tick, because lime means found.
- A tip-off rings the quarter of the room that holds the next piece not found (`sweepHint`), dashed in `--paper-ink`, never the thing.
- It ends when every piece is found, or on "I'm done".
- Stars as for any board (`starsFor`): 3 with everything found, no tip-off and no tap on the room; 2 for 80% found; else 1.

**The torn page** (`<TornPage>`, a step inside a case, `/case/:id/:n`)
A page torn top to bottom (`tornOf`). The left halves are on the page in order, and the right halves are a pile under it, out of order.
- Top to bottom: "The board" and the marks, the place as the title, the page (`--paper` with a `--ledge` edge): each line a strip on `--photo` in `--font-mono`, its left half, then an empty dashed strip where its right half goes.
- Each tear has its own shape, the same on both halves: a jagged edge of 5 points, each 0 to 3 steps of `--space-1` deep, the right half's the left's turned inside out.
- Tap a half and it goes on the line that is open.
- Stars (`tornStars`): 3 with every line whole, 2 with 1 set wrong, else 1.

**The missing step** (`<Chain>`, a step inside a case, `/case/:id/:n`)
Events in order with 1 gap, and 3 things that could have happened in it. Only 1 fits.
- Top to bottom: "The board" and the marks, the place as the title, the events on a line top to bottom (a `--fg` dot and 1 line each, `small` 700) with the gap among them as an empty dashed slip beside a hollow dot, then the 3 things that could fill it as slips of `--paper`, each a button the width of the screen, and the tries as 2 pips.
- The one that fits goes into the gap, with a tick in a lime disc (named "This fits").
- Done, it ends as any step does: the stars, `<StepResult>`, the lead, the way on and "Play it again", with the events and the filled gap under them.
- Stars: 3 at once, 2 after 1 wrong pick, 1 after 2.

**Your Notebook** (`/notebook`, `src/routes/Notebook.tsx`)
Everything found, in 1 place. Every case with a step done, in the order of the casebook, each as its own case board (`<CaseBoard>`): the clues pinned, the people met, who is cleared.
- Top to bottom: PageHeader "Your Notebook", then the cases. Each: its title (`h3`, a link to its brief), its board, then the lead that is open on a leaning slip of `--paper`, or a "Case closed" stamp.
- Nothing in it yet: the pet, large and centred, "Nothing in it yet", a `notebookEmpty` line and "Open your case".
- The way in: the Notebook tab on the dock, and "Notebook" in the wide header.

**Cold case** (`/cold/:id`, `/cold/:id/:n`, `src/lib/cold.ts`)
A closed case worked again with no tip-offs, for a gold seal. The same screens as the case, from the same chapter.
- It opens only for a closed case: any other leads to that case's brief.
- A board step has no "Ask for a tip-off" and no Tip-off on the phone bar.
- Closed cold, the ending shows a gold seal (Award at 18 on a `--medal-gold` disc, named "Gold seal") before the stars, and the file on Cases carries it.

**Ending** (`<Ending>`, a closed case, whatever its shape and whichever step closed it)
- "The board" and the stars, "Case closed" (`gameTitle`), then the ending a card at a time, never as 1 page of text. 3 cards in a row that scrolls sideways and stops on each (scroll snap): the culprit's photo (avatar at 96, name, role) pinned beside what was found on a slip; the confession in quotation marks (`itemTitle`); what came after (`body`, `--muted`).
- Under the cards: one accent button, "Next" until the last card and "Back to cases" on it, and 3 dots at the right (a ring, filled `--fg` for the card in view, each a button named "Card 2 of 3").
- It says what was found, what the culprit says and what is still undecided, and draws no lesson.
- Not every screen pages.

**Mobile <760**
Fixed bottom bar on a board step (`--bg`, top 1px `--line-2`, pad 12 16 + safe area): Ring, count, time at the far end; live message, Tip-off and I'm done (h44). Main padding-bottom 96.

**Sign in `/signin`**
The lead ends "Accounts are for players aged 13 and over." The privacy page says the same, and lists every company that receives data under "Who receives data". Google + email OTP → 6 digit code (auto submit, resend after 30s) → a new account picks its name and handle on the same screen (@handle autofilled from name until edited) → return to `next`, or Cases when there is none.

## 7. Characters
The player's detective and the suspects: `design/CHARACTERS.md`. The pets: section 5, Pets.

## 8. Motion
Durations and easings are tokens. Reduced motion sets them to 0 and disables FLIP and hover slide.

Rules for any new motion (from Emil Kowalski's design engineering skill, linked in `BUILD_PLAN.md`):
- `--ease-out` is `cubic-bezier(.23,1,.32,1)`: it moves most in the first moments, so the screen answers at once.
- Only `transform` and `opacity` move.
- Under 300ms for anything in the interface.
- How often it is seen decides how much it moves: many times a day (a find, a tab) little or nothing; rare moments can carry more.
- Nothing grows from scale 0.
- Hover styles sit behind `(hover: hover) and (pointer: fine)`, so a tap on a phone does not leave one stuck.

| Element | Transition |
|---|---|
| Letter | bg, color 180ms ease |
| Tip-off hand | rises 6 and fades in once, `--dur-slow` `--ease-out`. It does not loop |
| Tab bar | active pill pops from 0.8 scale, `--dur-slow` `--ease-out`; a pressed tab's pill scales to 0.9; the Play disc sinks by `--ledge`, `--dur-fast` |
| Word chip | bg, color 250ms ease |
| Button, Toggle | 200ms ease |
| Button press | scales to 0.97 while held, `--dur-fast` `--ease-out`. Not when disabled. Hover fills only with a mouse |
| Progress | width 400ms ease |
| Ring | the fill's stroke-dashoffset, `--dur-slower` `--ease-out`; stroke colour `--dur-base` `--ease-std` when it closes. Like Progress, it is drawn, not moved. Segmented rings do not animate. Reduced motion: it jumps to its value |
| WordList reorder | FLIP translateY. Found row 520ms z2, others 420ms, `--ease-out`. Scroll list to top first |
| Finish | smooth scroll to top 400ms after last find |
| Skeleton | opacity 1 to 0.5 and back, `--dur-skeleton` each way, `--ease-loop`. A second loop allowed past 300ms, because it only says "still coming". Still under reduced motion |
| Waiting | the other loop outside the landing, so it is allowed past 300ms. The pet bobs up `--space-1` and back, `--dur-bob` each way, `--ease-loop`. 3 dots in `--muted` hop `--space-1h` one after the other, a `--dur-bounce` cycle, each `--dur-bounce-step` behind the last, `--ease-loop`. Only `transform` moves. No blink: the avatar is drawn by `<Avatar>` and is not redrawn. The line changes every 20 seconds with no motion. Shown after 1 second, kept at least 600ms. Reduced motion: no bob, no hop, the line still changes |
| Stars | on a step's result and on the ending: earned stars pop in one at a time, each from 0.8 scale and 0 opacity, `--dur-star` `--ease-out`, each `--dur-star-step` behind the last. Stars already seen do not move. Reduced motion: all shown at once |
| Sums tile | a tile being selected lifts by `--space-1`, `--dur-fast`. A found run's tiles settle from 1.18 scale, `--dur-slow` `--ease-out`. The meter fills by `transform`, `--dur-base`. Reduced motion: none of it |
| Dock quick return | phones: the dock slides below the screen on a scroll down and back on any scroll up, `transform` only, `--dur-slow` `--ease-out`, the same rule as the header (8px of scroll before it moves). Always shown near the top, at the end of the page, on a new page, and while focus is inside it. Reduced motion: it is there or not, with no slide |

Nothing else animates.

## 9. Game system
- Registry: `type -> { build(def), check(puzzle, sel), Board }`.
- Stars are the score a player sees and keeps. Points only order Ranks, and only board steps earn them: 100 per find, -25 per tip-off, + max(0, 600 - secs) when all found. A step answered by picking earns stars and no points, so playing it again knowing the answer moves no board.
- Buried sums (`src/engine/sums.ts`): a row of digits 1 to 9, and the runs of 2 or more in a row that add up to a target from 10 to 17.
- Mirror (`src/engine/mirror.ts`): hidden words that read right to left.
- Chapters (`src/engine/chapter.ts`, `design/stories/`): a case written down as a detective works it, a story file and a chapter file each, written as `design/CASE_WRITING.md` says. `checkChapter` keeps it fair, `balanceOf` keeps it balanced, `checkCasebook` keeps the casebook in rotation.

## 10. Accessibility
- 4.5:1 text contrast in both themes (tokens pass).
- Keyboard: arrows move a caret over letters, Shift+arrows extend, Enter checks.
- Icon buttons have `aria-label`.
