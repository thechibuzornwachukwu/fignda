-- Public profiles need found counts. Totals stay hidden for today's daily (the count is the game);
-- they appear once the day ends, like daily_answers. New columns go at the end so the view can be replaced.

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
    pl.hints
  from public.plays pl
  join public.profiles pr on pr.id = pl.user_id
  where pl.verified;

grant select on public.plays_public to anon, authenticated;

-- Profile pages list a player's plays newest first.
create index if not exists plays_user_created on public.plays (user_id, created_at desc);
