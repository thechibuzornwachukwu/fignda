# Fignda rules

Design: `/design`. Read `SPEC.md` before UI work, `SECURITY.md` before data, auth or Worker work.

## Commands
`npm run dev` · `npm test` · `npm run e2e` · `npm run lint && npm run typecheck` before every commit.

## Tokens
- Colour, radius, spacing, duration, easing: `var(--*)` from `src/styles/tokens.css` only. No hex, px radius or ms in components.
- Missing value: add a token, then use it.
- Theme: `data-theme="dark|light"` on `<html>`, key `fignda-theme` in localStorage, default from `prefers-color-scheme`, set before paint.

## Brand
- Manrope only (400 to 800).
- Icons: `lucide-react` through one `<Icon>` wrapper. Stroke 1.75. Sizes 16 inline, 18 controls, 20 cards.
- Logo: `<Logo>` from SPEC section 1. Never redraw.
- Lime `--accent` = found or success. Never body text, never large fills. One accent button per screen.

## Copy
- No em dashes. No exclamation marks. Short sentences. Digits for numbers.
- Feedback lines come only from `src/copy` pools (`data/copy.json`) via `pick` / `onFound`. Never inline them.

## Code
```
src/styles/tokens.css
src/engine/      pure TS: hiddenWords, check, score, daily, excerpt, paginate
src/copy/        pools + picker
src/games/       registry: type -> { build, check, Board }
src/components/  Logo Icon Button TextLink FilterTabs GameRow Puzzle Letter WordList
                 ProgressLine BigClock MobileBar ShareSheet ShareCard Segmented Toggle
                 ThemeToggle Header Footer Dialog
src/routes/      Landing Games Game SignIn Account
src/lib/         supabase, api, storage
worker/          /api/generate /api/plays /api/og
supabase/        migrations, RLS
```
- Engine is pure and unit tested against `data/games.json` `expectedAnswers`.
- Answer counts come from the engine, never from AI output or hand typing.
- UI never re-implements matching.

## Do not
- Ship `.dc.html` or `support.js`.
- Put secrets in the client.
- Use `dangerouslySetInnerHTML`.
- Add screens, features or motion not in SPEC without asking.
