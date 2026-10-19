# Writing a case

The case comes first. The puzzles are made from it, never the other way. A case is written in this order, and a step that skips one is not done.

0. **The street**, `design/WORLD.md` and its map: read it first. A new place or person goes there in the same change, and every step names its place on the map (`where`).
1. **The story**, `design/stories/<id>.md`. Prose, no game in it.
2. **The evidence**, listed in the story file: every physical thing the case leaves behind.
3. **The steps**: each piece of evidence picks its method.
4. **The chapter file**, `design/stories/<id>.json`, checked by the engine.
5. **The read**: somebody who did not write it plays it as a player, and the story file is fixed before the JSON.

`design/stories/the-long-spoon.md` is the worked example.

## 1. The story file

| Section | What it holds |
|---|---|
| The truth | What happened, minute by minute, from the culprit's side: what they needed, what they touched, what they tried to destroy, what they forgot. Times and distances add up: 20 minutes' drive is 20 minutes |
| The people | For each person: what they want tonight, what they hide and why, what they know, what they say. Every innocent hides something of their own, and it is never the crime |
| Who knows what | A table: each fact, who in the story knows it, and the step where the player learns it. Nobody says what they could not know |
| The evidence | Each thing: what it shows, the smallest fact it proves, and what it leaves open |
| The ending | What is found, what the culprit says, what is still undecided. No lesson |

## 2. Evidence

- Evidence exists because somebody did something, never because a case needs a puzzle. Nobody leaves clues on purpose.
- Every piece is a real thing a real person would leave: a key book, a till roll, a typewriter ribbon, a gate log, a glove print on glass.
- A piece proves 1 small fact. What it means is the player's work.
- Evidence clears. It points at nobody until the end.
- A new reveal can change what old evidence means. It never changes what happened.

## 3. The thing decides the method

The method is the way a detective would handle that thing. The puzzle is made of the evidence itself: the words, numbers and drawing the player handles are the case's own, never random filler.

| Kind | Method | Built | The thing it fits |
|---|---|---|---|
| Find | Sweep the room | yes | A scene: tap what could matter, look past the rest |
| Find | By torchlight, Look under it, What does not belong | no | A dark room, a hiding place, a visitor's leftover |
| Read | Hidden words | yes | Text that holds more than it says: a ribbon, a letter, a notice |
| Read | The blotter (mirror) | yes | Ink kept back to front |
| Read | Buried sums | yes | A row of figures: a till roll, a gate log. Today the row is made by the engine, not by the case (set 1a fixes it) |
| Read | The torn page | yes | A page torn in 2 |
| Talk | Question them | no | A person with something to say and a reason not to say it |
| Talk | Sit with them | no | A person who talks only over a game or a meal |
| Weigh | Could it be done | yes | A claim against 2 facts on the board |
| Weigh | The missing step | yes | Events in order with 1 gap |
| Weigh | Walk it back, the trail | yes | The finds of the case, each back to its place |
| Weigh | Which account fits | yes | 3 tellings of 1 night. A closer |
| Weigh | The line-up | yes | Who is left. The closer of a "who did it" |

**Talking to people** (set 1b). A detective learns most from people. The player meets a witness, a neighbour or a friend of a suspect, and what they say is a step's fact.
- *Question them.* The player picks what to ask, a few questions at a time. A question the person has no reason to answer closes the talk early: fewer facts, fewer stars, never the lead. Showing them a pin that contradicts what they said makes them say more.
- *Sit with them.* Some people talk only over something they love: a game of chess, draughts or ayo, a shared meal. The game is real. Chess is an endgame from a position they set, and the moves must be legal. They talk as they play. Playing well earns the stars, and the fact is given at the end as any lead is.
- A person says only what the "who knows what" table lets them know.
- Never use em dashes, for story, conversation, or case brief

## 4. Balance

Checked by the engine, so a case that breaks them does not ship:
- `checkChapter`: everybody is met in the brief, every innocent is cleared once, means, motive and chance are each given once, every step leads to the next place, nothing names the culprit early, and the copy rules hold.
- `balanceOf`: every kind of work that has a method built is in the case, and no method is met more than twice.
- `checkCasebook`: no 2 neighbouring cases share a shape or a number of suspects, and after the first case each brings 1 new method at most.

Read by a person, because no engine can check them:
- The story would hold up without the game.
- Each innocent's secret is a good enough reason to lie.
- A step is 2 to 4 minutes. A case is 5 to 7 steps and closes in 1 to 2 sittings.
- Inside a case: a method is met plain, then harder, then with a twist. The closer tests the whole case.
- Nobody is harmed: no blood, no weapons, no body, no blow to the head. Something was taken, hidden or faked. The motive is mischief, pride or a surprise.
- It reads for a player anywhere: no joke or custom that needs 1 country to make sense.

## 5. Before it merges

- [ ] The story file is written, and the JSON says nothing the story does not.
- [ ] `npm test` passes: the case is fair, balanced, and fits the casebook.
- [ ] A person who did not write it has played it.
- [ ] `design/flow.html` and `design/flow.jpg` still match the game, or are updated (`npm run flow:render`).

## Sources

- The narrative method of novel-to-game (`zenstory-ai/novel-to-game`, MIT): keep apart what is true, what each person knows, and what the player knows.
- A friend's draft, "Theft of the Ember award" (`design/MYSTERY STORIES-WPS Office.docx`): the detective questions people, each answer opens or closes a line, and evidence is pieced together (the glove print on the glass).
