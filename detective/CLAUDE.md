# Lantern Row rules (the detective game)

A standalone app: its own code, Worker, database and accounts. It shares nothing with `../puzzles` at run time and never imports from it. "Lantern Row" is a working name until the owner names the game.

Design: `/design`. Read `SPEC.md` before UI work, `SECURITY.md` before data, auth or Worker work, `WORLD.md` and `CASE_WRITING.md` before touching a case, `CHARACTERS.md` before drawing a person. What is left: `BUILD_PLAN.md`. What is built: `ACCOMPLISHED STUFF.md`, only when needed.

## Keep in step
- A case is a story first: `design/stories/<id>.md`, then its `.json`. Never a puzzle looking for a story.
- A change to a screen, a method or how a case is checked updates `design/flow.html`, then `npm run flow:render` writes `design/flow.jpg`.
- A set that ships comes off `BUILD_PLAN.md` and goes into `ACCOMPLISHED STUFF.md` as 1 line.

## Commands
`npm run dev` · `npm test` · `npm run e2e` · `npm run lint && npm run typecheck` before every commit.

## Tokens
- Colour, radius, spacing, duration, easing: `var(--*)` from `src/styles/tokens.css` only. No hex, px radius or ms in components.
- Missing value: add a token, then use it.
- Theme: `data-theme="dark|light"` on `<html>`, key `lantern-theme` in localStorage, default from `prefers-color-scheme`, set before paint.

## Brand
- Manrope (400 to 800) for everything read, typed or counted. Bungee (400 only) for headings: `display`, `gameTitle`, `resultTitle`, `h2`, `h3` from `type.module.css`. Never set `--font-display` by hand in a component.
- Bungee is capitals only and its digits are not tabular. Not for clocks, scores, stats, buttons, inputs, names or evidence text.
- Bungee is heavy. Headings use `--ink-display` or `--ink-heading`, never `--fg-strong`.
- Icons: `lucide-react` through one `<Icon>` wrapper. Stroke 1.75. Sizes 16 inline, 18 controls, 20 cards.
- Lime `--accent` = found or success. Never body text, never large fills. One accent button per screen.
- Crime scenes, evidence and the board are drawn in ink (`design/sketches`). The pets are drawn in clean shapes. People (the player's detective and the suspects) are drawn as `CHARACTERS.md` says. All share the warm ink, the cream paper and lime for found.
- The player is the detective: seen in their own coat on the path, the ending and Settings, never inside a scene.

## Copy
- The cat, the dino, the dog and the robot are the player's pets. On screen say "pet", never "partner". Code keeps `partner`.
- The pet's help is a "tip-off" on screen, never a "hint". Code keeps `hint`.
- No em dashes. No exclamation marks. Short sentences. Digits for numbers.
- Show it, do not caption it. A card, a pin or a control says what it is by how it is drawn. No line under it to explain it. A name that is who something is stays: a pet, a suspect.
- Feedback lines come only from `src/copy` pools (`data/copy.json`) via `pick`. Never inline them.

## Code
```
src/styles/tokens.css
src/engine/      pure TS: chapter (cases, their methods and kinds of work), hiddenWords, mirror, sums, stars
src/copy/        pools + picker
src/games/       chapters (the written cases), registry of the boards a step is played on
src/scenes/      the drawn rooms a case is searched in, copied from design/sketches/rooms
src/map/         the street as blocks: the plan and the 30 degree view, sun, moon, weather (npm run street:render)
src/components/  Icon Button TextLink Stars Skeleton PartnerNote CaseBoard StepResult MobileBar WordList Segmented
src/routes/      Landing Cases Brief Step (and each method's screen) Ending Notebook SignIn
src/lib/         supabase, api, storage, cold
design/stories/  a story (.md) and a chapter (.json) a case, checked by src/engine/chapter.ts
worker/          /api/plays (steps of cases, checked), the case board
supabase/        migrations, RLS
```
- The engine is pure and unit tested. `checkChapter` refuses a case that is not a fair fight, `balanceOf` one that is thin, `checkCasebook` a casebook out of rotation. A test runs them over every file.
- UI never re-implements matching or grading: a step is graded by the engine the Worker grades it with.
- An empty or failed list, board or section sits in `<PartnerNote>`: `layout="screen"` when the empty state is the screen, inline inside a busy one. One pet a screen.
- Anything that loads ships with its skeleton (`<Skeleton>`). New screen, section or component: add the matching skeleton.

## Do not
- Import from `../puzzles`, or add a puzzle pack, or reuse its art or characters.
- Put secrets in the client.
- Use `dangerouslySetInnerHTML`.
- Add screens, features or motion not in SPEC without asking.
