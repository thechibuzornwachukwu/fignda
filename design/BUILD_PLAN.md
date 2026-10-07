# Build plan

What is left. Everything built so far (M1 to M10, the play test polish, circles, avatars, rooms) is live and
recorded in git history and `SPEC.md`. A piece of work is done when its checks pass.

Deploy: `npm run deploy:site`, `npm run deploy:api`. Database: `npx supabase db push`.

## Owner

- [ ] Reset the database password (Supabase, Database, Settings). It was shared in chat and is still the live one.
- [ ] Buy a domain. Unlocks reliable email, ads later, and a keyword in the address.
- [ ] Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded code email is ready and applies once this is set.
- [ ] Free AI key (Google AI Studio or Groq) for any-topic puzzles.
- [ ] Decide the name: keep Fignda, or rename before the domain is bought (checked free on 7 Oct 2026: peepam.com, sabisee.com, oyalook.com, lookwell.game).
- [ ] Review the look tags on hairstyles (`src/avatar/parts/hair.ts`): which are usually feminine, masculine, or for anyone. Outfits no longer count toward the look.

## To build next


- Rooms and room scores are not on the leaderboard.(WHYY?. Please fix this pronto)
- [ ] Holiday dailies: on a holiday, the daily is a puzzle inspired by it (4 July: America; 1 October: Nigeria; 25 December: Christmas; 14 February: Valentine's; 31 October: Halloween).
  - Structure: one calendar file, `data/holidays.json`, listing each holiday as a date rule (fixed like `12-25`, or a dated list for moving ones like Easter and Eid), a name, and the puzzle to use. `src/engine/daily.ts` checks the calendar first and falls back to the normal rotation. The seed generator (`npm run db:seed:gen`) reads the same file, so the server's daily and its answers always match the client.
  - Phase 1, no AI: point each holiday at the closest existing puzzle (Christmas and Easter: Bible; 1 October: Nigerian names; and so on), and label the daily card and results with the holiday ("Independence Day daily").
  - Phase 2, with the AI key: add a themed puzzle for each holiday ahead of time, checked by the engine and read by a person before it is scheduled. Same file, new puzzle ids.
  - Checks: a holiday date returns its puzzle on client and server; a normal date is unchanged; yesterday's and tomorrow's dailies are not shifted by a holiday; answers still never leak before the day; leaderboards and streaks treat it as an ordinary daily; link previews and the sitemap name the holiday.
- [ ] Any-topic puzzles: generate one hidden word at a time with a stronger free model, check each with the engine, then switch generation on (it is off in production: the free Workers AI models made puzzles that were too easy to spot).
- [ ] Streak reminders and friend streaks.
- [ ] "Only 8% found this word" after each daily.
- [ ] Player-made puzzles: hide words in your own paragraph, the engine checks it, others play and rate it.
- [ ] Search traffic: "Fignda: the hidden words game" in titles, an answers page for each past daily, Nigerian packs (Afrobeats, Nollywood, Lagos places, football).

## Ideas parked

- Seasonal avatar touches could switch on by date (a Santa hat row that appears in December), and a few special ones could be earned or sold. Everything that helps someone look like themselves stays free.

## Business, once people are playing

- [ ] Paystack: remove ads forever, streak freeze, past dailies archive, paid "make your own puzzle".
- [ ] AdSense footer ad: one per page, still image, never near the puzzle. Needs the domain. Update the privacy page (it says "No ads" today).
- [ ] Sponsored puzzles for brands, schools and churches, with a one page pitch.

Rule for all of it: nothing sold or shown may affect scores.

## Checks still owed

- [ ] One clean run of the full browser suite. Recent full runs stalled with the machine; every affected file passed when run on its own.
- [ ] Mobile Lighthouse with Google PageSpeed (92 measured on this machine; Google's quota had run out).
- [ ] Signed in screens on the live site with a real second account: start a circle, save a character, follow someone.

## Switched off on purpose

- Google sign in: hidden until the provider is set up in Supabase, then build with `VITE_GOOGLE_AUTH=1`.
- Any-topic generation: `AI_PROVIDER` in `worker/wrangler.toml` (see above).

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself, and its own per address limit applies instead.
- If two players in a room find the same word at the same moment, both are credited.
