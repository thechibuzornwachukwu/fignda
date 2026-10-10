-- The sponsor report counts everyone. The first version counted signed in players only, and most people play as
-- guests, whose plays are never stored. A sponsor pays for reach, so the report now rests on counts the game
-- keeps for every player: games started, played to the end, every word found, and shares.
-- Still counts only: a puzzle, a UTC day, a kind and a number. No player, no address, no time of day.

create table public.puzzle_counts (
  game_id text not null references public.games (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('start', 'end', 'full', 'share')),
  n integer not null default 0 check (n >= 0),
  primary key (game_id, day, kind)
);

alter table public.puzzle_counts enable row level security;
-- No policies and no grants: clients never see this table.

-- Shares counted so far move over, then the old table and its function go.
insert into public.puzzle_counts (game_id, day, kind, n)
select game_id, day, 'share', n from public.share_counts;

drop function public.count_share(text);
drop table public.share_counts;

-- One more of `p_kind` for one puzzle, today. False when there is no such puzzle or no such kind. Worker only.
--   start  a new game was opened (never a game carried on from before)
--   end    a game was played to the end with at least 1 word found
--   full   it ended with every word found
--   share  a share left the game
create function public.count_event(p_game text, p_kind text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('start', 'end', 'full', 'share') then
    return false;
  end if;
  insert into public.puzzle_counts (game_id, day, kind, n)
  select g.id, (now() at time zone 'utc')::date, p_kind, 1
  from public.games g
  where g.id = p_game
  on conflict (game_id, day, kind) do update set n = public.puzzle_counts.n + 1;
  return found;
end
$$;

-- One row per puzzle asked for, zeros included. Days are UTC and both ends are included; null leaves that end open.
--   starts, ends, fulls, shares  from puzzle_counts: everyone, guests included
--   players                      different signed in players with a verified play, alone or in a room
drop function public.sponsor_report(text[], date, date);

create function public.sponsor_report(p_games text[], p_from date default null, p_to date default null)
returns table (game_id text, starts bigint, ends bigint, fulls bigint, shares bigint, players bigint)
language sql stable security definer
set search_path = ''
as $$
  with asked as (
    select distinct g.id
    from public.games g
    where g.id = any (p_games)
  ),
  counted as (
    select c.game_id, c.kind, sum(c.n)::bigint as n
    from public.puzzle_counts c
    where c.game_id in (select id from asked)
      and (p_from is null or c.day >= p_from)
      and (p_to is null or c.day <= p_to)
    group by c.game_id, c.kind
  ),
  signed_in as (
    select pl.game_id, pl.user_id
    from public.plays pl
    where pl.verified
      and pl.game_id in (select id from asked)
      and (p_from is null or (pl.created_at at time zone 'utc')::date >= p_from)
      and (p_to is null or (pl.created_at at time zone 'utc')::date <= p_to)
    union
    select rp.game_id, rp.user_id
    from public.room_plays rp
    where rp.game_id in (select id from asked)
      and (p_from is null or (rp.ended_at at time zone 'utc')::date >= p_from)
      and (p_to is null or (rp.ended_at at time zone 'utc')::date <= p_to)
  )
  select a.id,
         coalesce((select c.n from counted c where c.game_id = a.id and c.kind = 'start'), 0),
         coalesce((select c.n from counted c where c.game_id = a.id and c.kind = 'end'), 0),
         coalesce((select c.n from counted c where c.game_id = a.id and c.kind = 'full'), 0),
         coalesce((select c.n from counted c where c.game_id = a.id and c.kind = 'share'), 0),
         (select count(*) from signed_in s where s.game_id = a.id)
  from asked a
  order by a.id
$$;

revoke execute on function public.count_event(text, text) from public, anon, authenticated;
revoke execute on function public.sponsor_report(text[], date, date) from public, anon, authenticated;
grant execute on function public.count_event(text, text) to service_role;
grant execute on function public.sponsor_report(text[], date, date) to service_role;
