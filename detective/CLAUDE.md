# Lantern Row rules (the detective game)

A standalone app: its own code, Worker, database and accounts. It shares nothing with `../puzzles` at run time and never imports from it. "Lantern Row" is a working name until the owner names the game.

Design: `/design`. Read `SPEC.md` before UI work, `SECURITY.md` before data, auth or Worker work.

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
- Crime scenes, evidence and the board are drawn in ink (`design/sketches`). The pets and the suspects are drawn in clean shapes. The 2 share the warm ink, the cream paper and lime for found.
- The player has no avatar: the player is the detective, unseen. Faces belong to the suspects.

## Copy
- The cat, the dino, the dog and the robot are the player's pets. On screen say "pet", never "partner". Code keeps `partner`.
- The pet's help is a "tip-off" on screen, never a "hint". Code keeps `hint`.
- No em dashes. No exclamation marks. Short sentences. Digits for numbers.
- Show it, do not caption it. A card, a pin or a control says what it is by how it is drawn. No line under it to explain it. A name that is who something is stays: a pet, a suspect.
- Feedback lines come only from `src/copy` pools (`data/copy.json`) via `pick`. Never inline them.

## Code
```
src/styles/tokens.css
src/engine/      pure TS: chapter (cases and their methods), interlude, openEye, hiddenWords, mirror, sums, stars
src/copy/        pools + picker
src/games/       chapters (the written cases), registry of the boards a step is played on
src/scenes/      the drawn rooms a case is searched in, copied from design/sketches
src/components/  Icon Button TextLink Stars Skeleton PartnerNote CaseBoard StepResult MobileBar WordList Segmented
src/routes/      Landing Cases Brief Step (and each method's screen) Ending OpenEye Interlude SignIn
src/lib/         supabase, api, storage, cold
design/stories/  one file a case, checked by src/engine/chapter.ts
worker/          /api/plays (steps of cases, checked), the case board
supabase/        migrations, RLS
```
- The engine is pure and unit tested. `checkChapter` refuses a case that is not a fair fight, and a test runs it over every file.
- UI never re-implements matching or grading: a step is graded by the engine the Worker grades it with.
- An empty or failed list, board or section sits in `<PartnerNote>`: `layout="screen"` when the empty state is the screen, inline inside a busy one. One pet a screen.
- Anything that loads ships with its skeleton (`<Skeleton>`). New screen, section or component: add the matching skeleton.

## Do not
- Import from `../puzzles`, or add a puzzle pack, a player avatar or gear.
- Put secrets in the client.
- Use `dangerouslySetInnerHTML`.
- Add screens, features or motion not in SPEC without asking.
