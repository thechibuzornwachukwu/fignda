# fignda

2 games, each a whole app in its own folder with its own code, Worker, database and design notes. Nothing is shared between them at run time.

| | What it is | State (October 2026) |
|---|---|---|
| [`puzzles/`](puzzles) | **Gazecraft**: words and numbers hidden in plain sight | Live at [fignda.pages.dev](https://fignda.pages.dev), accounts on |
| [`detective/`](detective) | **Lantern Row** (working name): a detective game set on one street | In build, guest only |

## Gazecraft

A puzzle game and only that: no story. Every puzzle is the same skill, looking closely.

**Game types.** Each pack is a run of short clues in a fixed rhythm (word, word, number, word), with special clues among them:

| Type | The player | Clue |
|---|---|---|
| Hidden words | drags across words hidden across spaces and punctuation | passages 1 to 19 |
| Buried sums | finds runs of digits that add up to a target | 21 to 29 |
| Mirror | finds words that read right to left | 31 |
| Relay | finds chains of words, each starting on the last letter of the one before | 32 |
| Number series | finds runs of digits that step by the same amount | 33 |
| Liar | taps the false statements among 5 | 34 |
| Groups | sorts 16 pictures into 4 sets of 4 | 35 |

Answers, counts and difficulty always come from the engine (`src/engine`), never from the content files. The Worker replays every play log with the same engine, so a score cannot be faked.

**Around the game.**
- **Profiles and progress:** accounts, streaks, medals, a character and a pet, and outfits to earn.
- **Your People:** a feed of medals and notifications with cheers, people to follow and who is online, and one-tap invites to play together.
- **Your League:** weekly leagues, a friends board and pack boards.
- **Social play:** circles, friend streaks and live rooms, where each teammate's finds are drawn in their own colour.
- **Making puzzles:** a maker for players' own puzzles.
- **Reading:** a help centre whose numbers come from the code.

**Stack.** React 19, Vite and TypeScript on Cloudflare Pages; an API Worker on Cloudflare; Supabase for Postgres (with RLS), auth and realtime; vitest and Playwright for tests.

**Licensed content.** The Relay words come from SCOWL (`data/SCOWL-LICENSE.txt`). The Groups pictures are Fluent Emoji 3D, MIT (`public/icons/fluent/LICENSE.txt`).

**Next.** These are in `puzzles/design/BUILD_PLAN.md`:
- the sign-up and return pipeline
- more packs
- outfits for sale (Paystack first)
- private boards
- email reminders

The Liar statements (`data/liar.json`) and Groups boards (`data/groups.json`) are checked by the owner before they change.

## Lantern Row

A detective game: a case is a story first, worked step by step on a 3D street with a pet beside the detective. One case, The Ember award, is being written to its end. Sign-in waits for its own Supabase project. What is left is in `detective/design/BUILD_PLAN.md`.

## Working in this repo

Work inside an app's folder:

```sh
cd puzzles            # or detective
npm install
npm run dev           # local site
npm test              # unit tests
npm run e2e           # browser tests (Gazecraft's need the local Supabase stack: npx supabase start)
npm run lint && npm run typecheck
```

- Each app's rules are in its own `CLAUDE.md`, and its design notes in `design/`: `SPEC.md` (how it works), `SECURITY.md` (data, auth and Worker) and `BUILD_PLAN.md` (what is left).
- The git hooks in `.githooks` check for secrets on every commit and run each app's full `npm run verify` on every push. Never skip them.
- Deploys (Gazecraft): `npm run deploy:api` for the Worker, then `npm run deploy:site` for the site. Push a database migration before deploying a Worker that needs it (`npx supabase db push --linked`).
