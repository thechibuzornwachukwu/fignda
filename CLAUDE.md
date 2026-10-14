# 2 games, 2 apps

This repo holds 2 separate games. Each is a whole app in its own folder, with its own `package.json`, code, Worker, database, design notes and rules. Nothing is shared between them at run time, and neither imports from the other.

- `puzzles/`: Gazecraft, the puzzle game. Rules: `puzzles/CLAUDE.md`.
- `detective/`: the detective game. Rules: `detective/CLAUDE.md`.

Work inside the app's folder: its commands (`npm run dev`, `npm test`, `npm run e2e`, `npm run lint && npm run typecheck`) run there. The git hooks in `.githooks` check both apps: secrets on every commit, and the full `npm run verify` of each app on every push.
