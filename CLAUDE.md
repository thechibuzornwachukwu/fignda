# Gazecraft rules

Design: `/design`. Read `SPEC.md` before UI work, `SECURITY.md` before data, auth or Worker work.

## Commands
`npm run dev` · `npm test` · `npm run e2e` · `npm run lint && npm run typecheck` before every commit.

## Tokens
- Colour, radius, spacing, duration, easing: `var(--*)` from `src/styles/tokens.css` only. No hex, px radius or ms in components.
- Missing value: add a token, then use it.
- Theme: `data-theme="dark|light"` on `<html>`, key `gazecraft-theme` in localStorage, default from `prefers-color-scheme`, set before paint.

## Brand
- Manrope (400 to 800) for everything read, typed or counted. Bungee (400 only) for headings: `display`, `gameTitle`, `resultTitle`, `h2`, `h3` from `type.module.css`. Never set `--font-display` by hand in a component.
- Bungee is capitals only and its digits are not tabular. Not for clocks, scores, stats, game rows, buttons, inputs, names or puzzle text.
- Bungee is heavy. Headings use `--ink-display` or `--ink-heading`, never `--fg-strong`.
- Icons: `lucide-react` through one `<Icon>` wrapper. Stroke 1.75. Sizes 16 inline, 18 controls, 20 cards.
- Logo: `<Logo>` (wordmark) and `<LogoMark>` (the cat) from SPEC section 1. The cat lives in `src/brand/cat.ts`, the letters in `logoPaths.ts`. Never redraw, never type the name in Bungee as a logo.
- Lime `--accent` = found or success, and the cat's eyes in the logo. Never body text, never large fills. One accent button per screen.

## Copy
- No em dashes. No exclamation marks. Short sentences. Digits for numbers.
- Feedback lines come only from `src/copy` pools (`data/copy.json`) via `pick` / `onFound`. Never inline them.

## Code
```
src/styles/tokens.css
src/engine/      pure TS: hiddenWords, check, score, daily, excerpt, paginate
src/copy/        pools + picker
src/games/       registry: type -> { build, check, Board }
src/avatar/      player characters: shapes, parts (append only lists), draw, store
src/components/  Logo Icon Button TextLink FilterTabs GameRow Puzzle Letter WordList
                 ProgressLine BigClock MobileBar ShareSheet ShareCard Segmented Toggle
                 ThemeToggle Header Footer Dialog Skeleton
src/routes/      Landing Games Game SignIn Account
src/lib/         supabase, api, storage
worker/          /api/generate /api/plays /api/og
supabase/        migrations, RLS
```
- Engine is pure and unit tested against `data/games.json` `expectedAnswers`.
- Answer counts come from the engine, never from AI output or hand typing.
- UI never re-implements matching.
- Anything that loads ships with its skeleton (`<Skeleton>`, SPEC section 4). New screen, section or component: add the matching skeleton and its row in the SPEC table. Layout changed: change its skeleton.

## Do not
- Ship `.dc.html` or `support.js`.
- Put secrets in the client.
- Use `dangerouslySetInnerHTML`.
- Add screens, features or motion not in SPEC without asking.
