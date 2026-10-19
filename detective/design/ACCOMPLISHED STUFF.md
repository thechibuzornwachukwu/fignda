# Accomplished stuff

What is built, in 1 line each, so `BUILD_PLAN.md` holds only what is left. Read this only when you need to know whether something exists. The detail of each is in `SPEC.md`; the history is in git.

## Cases
- Casebook 1, Lantern Row: 8 cases, written and open, in `design/stories`.
- The case engine (`src/engine/chapter.ts`): `checkChapter` (a fair fight), `balanceOf` (every built kind of work, no method more than twice), `checkCasebook` (shapes and suspects rotate, 1 new method a case). A test runs all 3 over every file.
- The street itself (`design/WORLD.md`): its places, the hall, people, the year and the thread. Its 2 maps, the plan and the 30 degree view, made from 1 module (`src/map/street.ts`, `npm run street:render`), by day and at night, in 6 weathers at their height and 2 mornings after, sorted by view (`design/sketches/map/plan`, `map/iso`), with the sun by the hour, tonight's moon, clouds, birds, worn roofs and 2 billboards, with every place at a spot (`src/engine/world.ts`), checked against the drawing; every case and step names its place.
- The story file and the case-writing rules (`design/CASE_WRITING.md`), with case 1's story as the worked example.

## Methods
- Read: hidden words, the blotter (mirror), buried sums, the torn page.
- Find: sweep the room, on the drawn hall and sale room (`src/scenes`).
- Weigh: could it be done, the missing step, walk it back (the trail), which account fits, the line-up.

## Screens
- Landing, Cases (the casebook), Brief, Step (a screen per method), Ending (3 cards), Ranks, Settings, Sign in, Privacy.
- Your Notebook: every case worked, as its board, with the lead that is open. Cold cases with a gold seal.
- The guest wall after 2 steps, the step that is not open yet, empty and failed states with the pet.
- The phone dock with the Play disc, the phone bar on board steps, skeletons for everything that loads.

## Around the game
- 4 pets in 7 moods (`design/characters`, `public/pets`), picked in Settings.
- Stars per step, kept in this browser; points for Ranks from board steps only.
- Copy pools and the picker, with the promise check (`src/copy/claims.ts`).
- Save and resume of an unfinished step. Synthesized sound.
- Themes, tokens, motion with reduced motion, keyboard play on boards.

## Backend
- The Worker: `POST /api/plays`, signed in only, rate limited, replays each step's log with the shared engine.
- Supabase: 1 migration, RLS on, `record_step`, `chapter_board`, `delete_account`.
- Headers, CSP and CORS as `SECURITY.md` says. Secret checks on every commit, `npm run verify` on every push.

## Design
- Sketches in `design/sketches`, by kind: `map`, `rooms`, `plans`, `evidence`. The flow of the game in `design/flow.html` and `design/flow.jpg`.
- The character direction in `design/CHARACTERS.md` (the art itself is set 1c).
