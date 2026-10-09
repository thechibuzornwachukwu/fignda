-- Clean read: every word found with no wrong picks and no hints. Worked out by the Worker when it replays the
-- play log, never sent by a client. It adds nothing to the score, so boards do not change.

alter table public.plays add column clean boolean not null default false
  check (not clean or (verified and found = total and hints = 0));

-- New column at the end so the view can be replaced. A clean read means every word was found, so on today's
-- daily it would give the hidden count away: it is masked the same way `total` is.
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
    case when pl.day_no is null or pl.day_no < public.fignda_day_no() then pl.clean end as clean
  from public.plays pl
  join public.profiles pr on pr.id = pl.user_id
  where pl.verified;

grant select on public.plays_public to anon, authenticated;

-- Clean reads per player. Every daily counts; a puzzle read cleanly more than once counts once, so replaying
-- one puzzle cannot farm the number. Today's daily joins the count when the day ends.
create function public.clean_reads_of(p_handle text)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select (
    count(*) filter (where p.day_no is not null)
    + count(distinct p.game_id) filter (where p.day_no is null)
  )::integer
  from public.plays p
  join public.profiles pr on pr.id = p.user_id
  where p_handle ~ '^[a-z0-9._]{2,20}$' and pr.handle = p_handle
    and p.verified and p.clean
    and (p.day_no is null or p.day_no < public.fignda_day_no())
$$;

revoke execute on function public.clean_reads_of(text) from public, anon, authenticated;
grant execute on function public.clean_reads_of(text) to anon, authenticated;
