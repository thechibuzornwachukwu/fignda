# Build plan

What is left. Everything built so far is recorded in git history and `SPEC.md`. A piece of work is done when its checks pass.

Deploy: `npm run deploy:site`, `npm run deploy:api`. Database: `npx supabase db push`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`. `db push --include-seed` only records the file's hash, it does not run it.

## Live since 7 Oct 2026

Room games on the Together board, holiday dailies, streak lines, friend streaks with invite links and nudges, room invites, points, the new player profile, "only 8% found", player-made puzzles, answers pages, 4 Naija packs.

- [ ] Reminders are built but off until a key pair exists: `npm run push:keys`, put the public key and `VAPID_SUBJECT` in `worker/wrangler.toml`, `npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml`, `npm run deploy:api`. Then check one real push on a phone.

## Owner

- [ ] Reset the database password (Supabase, Database, Settings). It was shared in chat and is still the live one.
- [ ] Buy a domain. Unlocks reliable email, ads later, and a keyword in the address.
- [ ] Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded code email is ready and applies once this is set. Until then Supabase sends its own plain email with a link.
- [ ] Free AI key (Google AI Studio or Groq) for any-topic puzzles.
- [ ] Decide the name: keep Fignda, or rename before the domain is bought (checked free on 7 Oct 2026: peepam.com, sabisee.com, oyalook.com, lookwell.game).
- [ ] Review the look tags on hairstyles (`src/avatar/parts/hair.ts`): which are usually feminine, masculine, or for anyone. Outfits no longer count toward the look.
- [ ] Read the 4 Naija packs (`data/games.json`: afrobeats, nollywood, lagos, eagles) for names you would add or drop. The engine has checked that every word is hidden across word boundaries.
- [ ] Holiday calendar (`data/holidays.json`): Eid is not in it. Its date depends on the moon sighting and no current puzzle fits. Add the dates and a puzzle when ready.

## To build next

- [ ] Identify the best free model for any-topic puzzles (owner note). Needs the AI key. Test Google Gemini's free tier, Groq and OpenRouter's free models on the real bar: 10 topics each, every word hidden across word boundaries, checked by the engine. Pick by pass rate, then daily free limit.
- [ ] Any-topic puzzles: generate one hidden word at a time with a stronger free model, check each with the engine, then switch generation on (it is off in production: the free Workers AI models made puzzles that were too easy to spot).
- [ ] Holiday dailies, phase 2 (needs the AI key): a themed puzzle for each holiday, checked by the engine and read by a person before it is scheduled. Same file, new puzzle ids.
- [ ] Player-made puzzles, public list: today they open by link only. A browse list needs a report button and a way to hide a puzzle first.
- [ ] Search traffic, name part: "Fignda: the hidden words game" in titles. Waiting on the name decision.
- [ ] Streak freeze (see Business). The research case for it: Duolingo reports about 21% less churn for players near a break.
- [ ] Reminders by email for players whose browser cannot do push. Needs the SMTP above.

## Ideas parked

- Seasonal avatar touches could switch on by date (a Santa hat row that appears in December), and a few special ones could be earned or sold. Everything that helps someone look like themselves stays free.
- A home screen widget or app badge showing the run. Duolingo's biggest single lift after the streak itself.
- Friend streak milestones (7, 30, 100 days together) with a card to share.

## Business, once people are playing

- [ ] Paystack: remove ads forever, streak freeze, past dailies archive, paid "make your own puzzle".
- [ ] AdSense footer ad: one per page, still image, never near the puzzle. Needs the domain. Update the privacy page (it says "No ads" today).
- [ ] Sponsored puzzles for brands, schools and churches, with a one page pitch.

Rule for all of it: nothing sold or shown may affect scores.

## Checks still owed

- [ ] Mobile Lighthouse with Google PageSpeed (92 measured on this machine; Google's quota had run out).
- [ ] Signed in screens on the live site with a real second account: start a circle, save a character, follow someone, start a friend streak from a link, invite into a room. The Players lists stay empty until a second account exists.
- [ ] One real push on Android Chrome and on an iPhone with the site on the Home Screen.

## Switched off on purpose

- Google sign in: hidden until the provider is set up in Supabase, then build with `VITE_GOOGLE_AUTH=1`.
- Any-topic generation: `AI_PROVIDER` in `worker/wrangler.toml` (see above).
- Reminders: until the VAPID keys are set (see above). The settings switch says so.

## Known limits

- "5 wrong codes, then a 15 minute lock" cannot be enforced exactly: Supabase checks sign in codes itself, and its own per address limit applies instead.
- If two players in a room find the same word at the same moment, both see it as theirs in the room. The Together board credits one of them, the earlier find by the server's clock.
- A room player who closes the tab before the game ends sends no play, so their finds do not count for the team.
- Reminder times follow the player's time zone as saved when they turned reminders on. The daily itself still changes at midnight UTC.
- Room plays made before the Together board shipped are not on it.
