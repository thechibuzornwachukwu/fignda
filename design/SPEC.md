# Fignda spec

Values are tokens from `tokens/tokens.css`. Prototype wins on visuals. This file wins on behaviour.

## 1. Brand

**Mark** (f and g share one stroke, g bowl is a monocle with lime lens):
```svg
<svg viewBox="0 0 64 64" fill="none"><g transform="translate(1 2)">
  <circle cx="27" cy="30" r="13" fill="var(--accent)" stroke="currentColor" stroke-width="7"/>
  <path d="M40 30V14a10 10 0 0 1 10-10h3M40 20h12M40 30v15a11 11 0 0 1-11 11h-5" stroke="currentColor" stroke-width="7"/>
</g></svg>
```
- Lockup: mark 30 + "fignda" 18/800, tracking -0.03em, gap 10.
- App icon: mark 72% on `#0d0d0e`, radius 25%. Export 16, 32, 180, 512.
- Icons used: ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Contrast, Lightbulb, Clock, Flag, Search, Check, X.

## 2. Type

| Token | Size | Weight | Tracking | LH |
|---|---|---|---|---|
| display | clamp(52px,10vw,136px) | 800 | -0.055em | 0.92 |
| gameTitle | clamp(40px,7vw,96px) | 800 | -0.05em | 0.95 |
| clock | clamp(48px,7vw,96px) tabular | 800 | -0.05em | 0.85 |
| resultTitle | clamp(32px,5vw,64px) | 800 | -0.045em | 1 |
| stat | clamp(36px,5vw,56px) tabular | 800 | -0.04em | 1 |
| h2 | clamp(32px,4vw,48px) | 800 | -0.04em | 1 |
| row | clamp(24px,3.2vw,40px) | 700 | -0.035em | 1.1 |
| puzzle | clamp(20px,2.3vw,27px) | 600 | -0.015em | 1.7 |
| body | 16 | 500 | 0 | 1.55 |
| small / label | 14 / 13 | 600 | 0 | |

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
| ProgressLine | 2px, track `--line`, fill `--bar` |
| BigClock | label "Time" / "Final time" 13/600. Digits `clock`, `--subtle` playing, `--fg` finished. Hidden <760 |
| WordList | 2px `--fg` top rule. Header title + count. Rows 10 0, 1px `--line`, index 01 left. Chip: found `--accent`/`--on-accent`, missed `--miss`, unfound one • per letter `--line-4`. Chip 2 6, r4. Desktop sticky top 24, max-h min(62vh,640) scroll |
| Segmented | track p4 r10 `--surface` 1px `--line`. Option h36 r7 14/700. Active `--fg`/`--bg` |
| Toggle | 44x26 r13. Off `--line-2`, on `--accent`. Knob 20 |
| Input large | no box, 2px bottom `--line-3`, `row` type |
| Input form | h52 r8 1px `--line-2` bg `--surface` 16px, focus `--line-4` |
| Dialog | scrim `--scrim`, panel max 820 r14 1px `--line-2` bg `--bg`. Esc and outside click close. Focus trapped and restored |

## 5. The puzzle interaction
Paragraph renders one span per character. Letters carry `li` (index in lowercase letter stream `S`). Non letters carry `prev` and `next`.

**Letter states:** idle transparent · selecting `--sel`/`--sel-fg` · found `--accent`/`--on-accent` · missed (after finish) `--miss` · hint: whole letter, `--hint-bg` wash inside a 1.5px `--accent-ink` ring (selecting and found win the fill). A non letter takes the state when both neighbours share it, so "a most" is one bar. r4, padding 2 0.

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

**Hint:** marks first letter of the earliest unfound answer, `hint` line, -25.
**Finish:** "I'm done" or last find. Missed answers shade. Result title picked once from `titlePerfect|titleGood|titleLow|titleZero`, then fixed.
**Sound:** Web Audio, synthesized, no files (`src/lib/sound.ts`). A soft triangle tick per new letter in a selection, pitch up a semitone per letter from 660 Hz (cap 2 octaves), ticks under 25ms apart merge. A find plays C6 then G6. Misses are silent. On by default, `fignda-sound`=`off` mutes. Audio wakes on the first gesture only. Mute: speaker button on the puzzle screen (aria-pressed) and a Sounds switch in Settings. Safari ambient session: the iPhone silent switch mutes it.

**Together:** `?vs=handle` shows that player's best verified score (plays_public) above the board, then won / lost / level at the end; dailies show the score only until you finish. `?room=CODE` (6 chars, no 0 O 1 I L) joins a live room: Play together button on non-daily puzzles, room bar (who is in, Invite, Leave, Not ranked). Spans broadcast and re-checked with the engine; `teamFound` / `teamJoined` copy pools. Room plays are never submitted.

**Text result:** Copy result button on results (secondary). Lines: title (dailies: `Fignda Daily #n`), `found · time · score` (dailies never print the total), marks in play order 🟩 find ⬜ miss 💡 hint in rows of 10 (max 40), `Beat it: <link>` (adds `?vs=handle` when signed in). Coarse pointers use the share sheet, others copy.

**Circles:** `/circles` (yours, start one: name 2 to 40 chars) and `/c/CODE` (invite page for non members; members see Today and 7 days tables, Play today, Invite, Leave; owner sees Remove on members still to play). Up to 50 members, 20 circles each. Linked from the leaderboard.

**People to follow:** first section of `/players`. Up to 12 registered players, never you or anyone you follow. Row stat: "Followed by N you follow", else "N plays", else "New here". Signed in rows carry a Follow / Following button (h36, pressed = `--fg` fill); guests get a Sign in line. Search rows carry the same button.

**Avatars:** drawn from parts in `src/avatar` (see the header of `draw.ts`). Saved as a code of positions, so part lists are append only. Starter avatar from the handle until designed. Sizes: 24 room, 28 header and boards, 32 follow lists, 40 players, 88 profile, 120 designer preview. Settings, Your character: the avatar at 88 and Edit character, which opens the editor (Dialog variant `editor`: 940 wide, full screen under 720). Editor: a stage in the chosen background colour with the avatar at 168 and round icon buttons (dice = Surprise me, undo); four icon tabs (Face, Hair, Wear, Scene: smile, scissors, shirt, palette); one pane of choices that is the only scroll; footer with a status line, Cancel or Done, Keep this look. Colours (skin, hair colour, background) are 44px dots. Other parts are 72px close-up tiles with names: face parts zoom on the face, hair on the head, outfits on the chest. Hair shows one family at a time (Cuts and fades, Afros and curls, Braids and locs, Long and tied, Headwear). Surprise me keeps skin, hair colour, facial hair, marks and mouth item, and only draws styles that suit the look already built (styles carry an optional `look`; nothing about gender is asked or saved). Starter avatars use only for-anyone hair, no facial hair, a tee.

**Tab bar (phones, app pages):** Games, Leaders, Players, You (or Sign in); icons 20 over 12/700 labels; fixed bottom with safe area. Hidden on landing and puzzles.

## 6. Screens (prototype file in brackets)

**Landing `/`** [Fignda Landing]
Hero "Find it." / "Figure it out." (`--subtle`). Inline demo sentence with 5 words (Amos, Atom, Data, Rome, Gold) and side list. Hint link cycles Give me a hint → Show it → Play again. On 5 found: accent "Now find thirty" to `/play/bible`. Then games list with 3 steps, about, footer CTA "Start playing".

**Games `/play`** [Fignda home view]
- Heading "Pick a game." / "Start finding."
- Daily card: kicker `Daily #N · date` `--accent-ink`, title, sub. Unplayed "One try. Count hidden. Wrong picks cost 10." + accent "Play today". Played "Done for today. You found N. New puzzle at midnight." + secondary "See result".
- FilterTabs, GameRow list from `data/games.json` sorted by filter order.
- "Or any topic" input + "Create puzzle" ("Creating..."). Empty: "Give us something to hide words in first." Failure: `genFail` line.

**Game `/play/:id`, `/d/:n`**
- Back "All games", `Category · Level`.
- Title "Find 30 books of the Bible" (daily "Find the hidden books of the Bible") + BigClock.
- Stats: "12 / 30" (daily "12 found"), "2 hints". ProgressLine (hidden on daily until done).
- Two columns wrap: puzzle (flex 3, min 520) and WordList (flex 1, min 260), gap clamp(32px,5vw,72px).
- Instruction: "Drag across the letters. Answers can run across spaces and punctuation." Touch: "Tap the first letter of a word, then the last."
- Under puzzle: "Give me a hint", "I'm done", live message (`aria-live="polite"`).
- Daily list shows found rows only + "More are hiding. How many? That is the game."

**Results** (above puzzle, smooth scroll to top)
Title, line ("Every answer found." or "The ones you missed are shaded below."), stats Score / Found / Time, actions Play again (not daily), More games, Share (accent). Guest strip: "Playing as a guest. Sign in to keep this score, your streak and your name on shared cards."

**Mobile <760**
Fixed bottom bar (`--bg`, top 1px `--line-2`, pad 12 16 + safe area): count, progress, time; live message, Hint and Done (h44). Main padding-bottom 96. WordList static below puzzle. BigClock hidden.

**Share sheet** [Fignda Share Card]
Preview (max 300) + controls: Result / Puzzle, frame 1:1 · 4:5 · 9:16, text Excerpt / Full puzzle, Show my finds toggle ("Off. Nothing is spoiled." / on stamps "Contains answers" / daily "Locked for daily puzzles until tomorrow"). Actions "Share image(s)", "Copy link". Defaults Result, 4:5, Excerpt, off.

**Sign in `/signin`, `/account`** [Fignda Sign In]
Google + email OTP → 6 digit code (auto submit, resend after 30s) → profile (name, @handle autofilled from name until edited) → return to `next`. Account: initial avatar, name, handle, email, dailies played, streak, Sign out, Delete account (confirm).

## 7. Share cards
- 1080 wide. 1:1 1080 pad 80 · 4:5 1350 pad 88 · 9:16 1920 pad 240 96 260.
- Text never under 38px. Overflow: step down 1px to 88% of base, then paginate.
- Excerpt: whole sentences, window with most target answers, within first-page char budget (`tokens.json` `shareCard.charBudget`).
- Full: greedy sentence pages. Bible 4:5 = 4 pages.
- Daily hides count and locks finds.
- Export PNG in browser (`html-to-image`), `navigator.share({files})`, else download. Worker renders 1200x630 OG with the same layout.

## 8. Motion
Durations and easings are tokens. Reduced motion sets them to 0 and disables FLIP and hover slide.

| Element | Transition |
|---|---|
| Letter | bg, color 180ms ease |
| Word chip | bg, color 250ms ease |
| GameRow hover | padding-left 0→12, color 250ms ease |
| FilterTab, Button, Toggle | 200ms ease |
| Progress | width 400ms ease |
| Clock finish | color 300ms ease |
| WordList reorder | FLIP translateY. Found row 520ms z2, others 420ms, `--ease-out`. Scroll list to top first |
| Finish | smooth scroll to top 400ms after last find |

Nothing else animates.

## 9. Game system
- Registry: `type -> { build(def), check(puzzle, sel), Board }`. Shell (clock, progress, list, hints, results, share) is shared. Current type: `hidden-words`.
- Difficulty (computed): Hard if 20+ answers or 900+ chars. Easy if 9 or fewer and under 260 chars. Else Medium.
- Score: 100 per find, -25 per hint, -10 per wrong daily pick, + max(0, 600 - secs) when all found. Floor 0.
- Daily: `dayNo` from 2026-01-01 UTC, game = `dailyPool[dayNo % len]`. Server decides.
- Roadmap types (not in v1, see Fignda Future Games): Mirror, Liar, Relay, Buried sums, Unmask, Trace, Bury it. Each must fit the registry without shell changes.

## 10. Accessibility
- 4.5:1 text contrast in both themes (tokens pass).
- Keyboard: arrows move a caret over letters, Shift+arrows extend, Enter checks. Live region announces.
- Icon buttons have `aria-label`. Touch targets 44 minimum.
