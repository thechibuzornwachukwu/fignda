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
- [ ] Review the look tags on hairstyles and outfits (`src/avatar/parts`): which are usually feminine, masculine, or for anyone.

## To build next
- [ ] Surprise me after a joke outfit. A woman in a gele who puts on an agbada (or a bearded man in buba and beads) saves and draws fine, but the look then reads as mixed, so Surprise me falls back to for-anyone hair. Fix: read the look from hair and facial hair only, and treat outfits as costume. Check: gele + agbada still surprises within feminine and for-anyone hair.
- [ ] Any-topic puzzles: generate one hidden word at a time with a stronger free model, check each with the engine, then switch generation on (it is off in production: the free Workers AI models made puzzles that were too easy to spot).
- [ ] Streak reminders and friend streaks.
- [ ] "Only 8% found this word" after each daily.
- [ ] Player-made puzzles: hide words in your own paragraph, the engine checks it, others play and rate it.
- [ ] Search traffic: "Fignda: the hidden words game" in titles, an answers page for each past daily, Nigerian packs (Afrobeats, Nollywood, Lagos places, football).

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
- Rooms and room scores are not on the leaderboard.
