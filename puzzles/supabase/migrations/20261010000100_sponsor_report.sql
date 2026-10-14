-- The sponsor report (BUILD_PLAN 1b): players, plays, finish rate and shares for a puzzle. Counts only.
-- A sponsor gets numbers, never people: nothing here returns a handle, a user id or a row per play.

-- Shares were never stored: sharing happens in the browser. This is a count per puzzle per UTC day and
-- nothing else. No player, no address, no time of day.
create table public.share_counts (
  game_id text not null references public.games (id) on delete cascade,
  day date not null,
  n integer not null default 0 check (n >= 0),
  primary key (game_id, day)
);

alter table public.share_counts enable row level security;
-- No policies and no grants: clients never see this table.

-- One share of one puzzle, today. False when there is no such puzzle. Worker only.
create function public.count_share(p_game text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.share_counts (game_id, day, n)
  select g.id, (now() at time zone 'utc')::date, 1
  from public.games g
  where g.id = p_game
  on conflict (game_id, day) do update set n = public.share_counts.n + 1;
  return found;
end
$$;

-- One row per puzzle asked for, zeros included. Days are UTC and both ends are included; null leaves that end open.
--   players     different signed in players with a verified play, alone or in a room
--   plays       verified plays alone, plus room plays
--   room_plays  how many of those were in a room
--   finished    plays alone that found every word. A room play is a team's, so it is never counted here
--   shares      from share_counts
-- Unverified plays (a guest's results merged at sign in) are left out: the server never replayed them.
create function public.sponsor_report(p_games text[], p_from date default null, p_to date default null)
returns table (game_id text, players bigint, plays bigint, room_plays bigint, finished bigint, shares bigint)
language sql stable security definer
set search_path = ''
as $$
  with asked as (
    select distinct g.id
    from public.games g
    where g.id = any (p_games)
  ),
  solo as (
    select pl.game_id, pl.user_id, pl.found = pl.total as done
    from public.plays pl
    where pl.verified
      and pl.game_id in (select id from asked)
      and (p_from is null or (pl.created_at at time zone 'utc')::date >= p_from)
      and (p_to is null or (pl.created_at at time zone 'utc')::date <= p_to)
  ),
  room as (
    select rp.game_id, rp.user_id
    from public.room_plays rp
    where rp.game_id in (select id from asked)
      and (p_from is null or (rp.ended_at at time zone 'utc')::date >= p_from)
      and (p_to is null or (rp.ended_at at time zone 'utc')::date <= p_to)
  ),
  everyone as (
    select s.game_id, s.user_id from solo s
    union
    select r.game_id, r.user_id from room r
  )
  select a.id,
         (select count(*) from everyone e where e.game_id = a.id),
         (select count(*) from solo s where s.game_id = a.id) + (select count(*) from room r where r.game_id = a.id),
         (select count(*) from room r where r.game_id = a.id),
         (select count(*) from solo s where s.game_id = a.id and s.done),
         (select coalesce(sum(c.n), 0)::bigint from public.share_counts c
          where c.game_id = a.id and (p_from is null or c.day >= p_from) and (p_to is null or c.day <= p_to))
  from asked a
  order by a.id
$$;

revoke execute on function public.count_share(text) from public, anon, authenticated;
revoke execute on function public.sponsor_report(text[], date, date) from public, anon, authenticated;
grant execute on function public.count_share(text) to service_role;
grant execute on function public.sponsor_report(text[], date, date) to service_role;
