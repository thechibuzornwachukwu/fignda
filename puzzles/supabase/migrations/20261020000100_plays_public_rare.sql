-- The public plays view had no rare_keys, so the app's request for it failed and every other player's plays
-- did not load. Added at the end so the view can be replaced; masked on today's daily like total and clean.
create or replace view public.plays_public
with (security_barrier = true)
as
  select
    pl.id,
    pr.handle,
    pl.game_id,
    pl.day_no,
    pl.score,
    pl.secs,
    pl.created_at,
    pl.found,
    case when pl.day_no is null or pl.day_no < public.fignda_day_no() then pl.total end as total,
    pl.hints,
    case when pl.day_no is null or pl.day_no < public.fignda_day_no() then pl.clean end as clean,
    case when pl.day_no is null or pl.day_no < public.fignda_day_no() then pl.rare_keys end as rare_keys
  from public.plays pl
  join public.profiles pr on pr.id = pl.user_id
  where pl.verified;

grant select on public.plays_public to anon, authenticated;
