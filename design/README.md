# Fignda handoff

Fignda is a web game. Pick a topic, read a paragraph, find words buried across letters, spaces and punctuation ("a most" hides AMOS).

## Read in this order
1. `CLAUDE.md` rules. Copy to repo root.
2. `SPEC.md` screens, components, interactions, motion.
3. `SECURITY.md` required controls.
4. `BUILD_PLAN.md` milestones with pass checks.

## Contents
```
tokens/tokens.css      All design variables, both themes. Import once.
tokens/tokens.json     Same values for TS.
data/games.json        21 curated games + expected answers (test fixtures).
data/copy.json         Every feedback line, by pool.
reference/engine.js    Matching, scoring, daily. Port behaviour exactly.
reference/copy.js      Line picker rules (onFound, isClose, resultTitle).
reference/cards.js     Share card excerpt + pagination.
prototype/*.dc.html    Running design. Open in a browser. Visual truth.
```

## Fidelity
High. Colours, type, spacing, motion and copy are final. The prototype is HTML reference, not code to ship. Rebuild in the stack below. `prototype/support.js` is a prototype runtime only.

## Stack
Vite, React, TypeScript, React Router, CSS Modules on `tokens.css`, `lucide-react`, `@fontsource/manrope`, `@fontsource/bungee`, Supabase (auth, Postgres, RLS), Cloudflare Worker (AI, score verification, OG images), Cloudflare Pages. All free tier.

## Start
Empty repo. `CLAUDE.md` at root, this folder at `/design`. Prompt Claude Code:
> Read /design/README.md and CLAUDE.md. Do BUILD_PLAN.md one milestone at a time. Stop after each for review.
