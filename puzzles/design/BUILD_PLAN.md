# Build plan

What is left for Gazecraft, in sets that ship one at a time. What is built is in `SPEC.md` and git history.

Deploy: `npx supabase db push`, then `npm run deploy:api`, then `npm run deploy:site`.
Seed (after `npm run db:seed:gen`): `npx supabase db query --linked -f supabase/seed.sql`.

## To build, in sets

Each item names who champions it. **Opus**: engines, the server, data, money, anything that can cost points or trust. **Sonnet**: screens, drawing, research. **Haiku**: tests, copy, screenshots. **Free model** (OpenRouter's free tier): bulk drafts of words only, never code, always checked by the engine or a person. **You**: accounts, money, signatures and decisions.

One set at a time. Each set is small, works on its own and leaves the live game whole. After each set: lint, typecheck, unit tests and the browser tests pass.

### 10. New game types

- [ ] **Opus** (engine, server checks), **Haiku** (tests, copy, screenshots), **Free model** (Liar's statements, checked by you). **Set 10a. A third family.** SPEC section 9, Families: Liar or Relay (words), number series (numbers). One type at a time, engine first, through the registry.

- [ ] **Free model** drafts paragraphs, the engine keeps only those whose words truly hide, **Haiku** adds them to `data/games.json`. **Set 10b. More packs,** 5 at a time, on topics players ask Make for most.

### 7. Pets

- [ ] **You** (Paystack), then **Opus** (payments), **Sonnet** (drawing the outfits). **Set 7p. Outfits for sale,** once Paystack is in: more outfits for each pet, bought once, cosmetic only.

### 8. Data and privacy (GDPR, Nigeria's NDPA)

Play with no account, and sponsors get numbers, never people.

- [ ] **You** (the agreement), then **Opus** (members only see their own). Private boards: a data agreement with the school or company, and an organiser who sees only its own members.
- [ ] **You** (a lawyer's read), then **Sonnet** (the age check screen). EU players under 16 checked before any marketing there.

### 9. Smaller

- [ ] **You** (SMTP), then **Sonnet**. Reminders by email, once SMTP is set.
- [ ] **Free model** drafts the emails, **you** edit and set up Loops. Later, with it: email sequences on Loops, to teach a new player the game a little at a time (the first puzzle, a circle, a pet). Advised to the owner. It needs the domain and a yes from the player at sign up, it is a new company that receives email addresses, so the privacy page names it, and every email has a way out. No guilt and no word about what would be lost, as in reminders.

## Owner

- [ ] **You.** Add the contact line to the pitch (https://claude.ai/code/artifact/6f192f99-4099-4177-b67e-ef36ca74b316), then share it from its Share menu.
- [ ] **You.** Set up Google sign in in Supabase. A 6 digit email code is the hardest step for a new player, and one tap removes it. Likely worth more than any change to guest mode.
- [ ] **You.** Decide: the name (suggested: keep Gazecraft. Free as .com and .game on 9 Oct 2026, registry check only: gazecraft, keensleuth, sleuthtrail, cluestop, plainsleuth, loupequest).
- [ ] **You.** Decide: what is sold to a church, a school or a wedding now. The price list sells a puzzle on the buyer's subject.
- [ ] **You.** Prices for the models above. None is set. Pets open at 3,000, 9,000 and 20,000 points for now (`PARTNER_POINTS` and `partner_slots`): confirm or change.
- [ ] **You.** The robot is named 404. A trademark search on that name has not been run.
- [ ] **You.** A list of 20 people to ask first: brands, schools, churches, event planners.
- [ ] **Sonnet** drafts, **you** decide. What a sponsor may and may not write.
- [ ] **You.** Buy the domain. Unlocks reliable email, Paystack on our own address, and ads.
- [ ] **You.** Paystack: account, the business details it asks for, a test payment.
- [ ] **You.** A lawyer's read before private boards for schools, before ads, and before any under-13 account.
- [ ] **You.** OpenRouter: buy $10 of credit once. The daily limit goes from 50 requests to 1,000.
- [ ] **You.** Custom SMTP (Brevo, free) so sign in emails carry a 6 digit code. The branded email is ready.
- [ ] **You.** Reminder keys: `npm run push:keys`, the public key and `VAPID_SUBJECT` in `worker/wrangler.toml`, `npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml`, `npm run deploy:api`.
- [ ] **You.** Groq key, optional: `npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml` and `worker/.dev.vars`.
- [ ] **You.** Read: the look tags on hairstyles (`src/avatar/parts/hair.ts`), the 4 Naija packs in `data/games.json`, the 7 terms in `worker/src/blocklistLocal.ts`, and 10 machine-written puzzles from the live site.
- [ ] **Haiku** looks them up, **you** check. The dates of the moving seasons for the year ahead, for `data/holidays.json`: Lunar New Year, Easter, Ramadan and Eid, Diwali.
- [ ] **You.** Decide: which seasons a player sees by default. Suggested: the ones the whole world shares the weather or the date for (New Year, spring, summer, harvest, December snow), and the rest by where the player is or what they choose.
- Still under the old name until the domain exists: fignda.pages.dev, the Cloudflare projects `fignda` and `fignda-api`, the local Supabase project id, the database functions `fignda_day_no` and `fignda_score`.

## Checks still owed

- [ ] **Opus.** The safety model (Llama Guard) with one real call. Its answer shape is assumed.
- [ ] **You.** On real phones: the dock on an iPhone Home Screen app, a room game on 2 phones, a machine-written puzzle through the site, the waiting screen with the phone locked.
- [ ] **You,** or **Sonnet** in your browser once you are signed in. Signed in screens on the live site with a real second account.
- [ ] **You.** One real push on Android and iPhone. Needs the reminder keys.
- [ ] **Sonnet** (research). The numbers in `INSIGHTS.html` against primary sources before any goes on a public page.
