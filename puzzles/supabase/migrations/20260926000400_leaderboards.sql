-- Leaderboards from verified plays only (plays_public). Read only; no user ids or emails.
-- Order: score high to low, then faster time, then earlier finish.

create index if not exists plays_board_daily on public.plays (day_no, score desc, secs, created_at) where verified and day_no is not null;
create index if not exists plays_board_game on public.plays (game_id, score desc, secs, created_at) where verified and day_no is null;

-- Top N for one daily. Today's totals stay masked by plays_public.
create function public.daily_board(p_day integer, p_limit integer default 20)
returns table (rank bigint, handle text, score integer, secs integer, found smallint, total smallint)
language sql stable
set search_path = ''
as $$
  select row_number() over (order by p.score desc, p.secs asc, p.created_at asc) as rank,
         p.handle, p.score, p.secs, p.found, p.total
  from public.plays_public p
  where p.day_no = p_day and p_day <= public.fignda_day_no()
  order by rank
  limit least(greatest(p_limit, 1), 100)
$$;

-- One player's place on one daily, wherever they are.
create function public.daily_rank(p_day integer, p_handle text)
returns table (rank bigint, handle text, score integer, secs integer, found smallint, total smallint, players bigint)
language sql stable
set search_path = ''
as $$
  select r.rank, r.handle, r.score, r.secs, r.found, r.total, r.players
  from (
    select row_number() over (order by p.score desc, p.secs asc, p.created_at asc) as rank,
           count(*) over () as players,
           p.handle, p.score, p.secs, p.found, p.total
    from public.plays_public p
    where p.day_no = p_day and p_day <= public.fignda_day_no()
  ) r
  where r.handle = p_handle
$$;

-- Best play per player on one curated or custom puzzle (not dailies).
create function public.game_board(p_game text, p_limit integer default 20)
returns table (rank bigint, handle text, score integer, secs integer, found smallint, total smallint)
language sql stable
set search_path = ''
as $$
  with best as (
    select distinct on (p.handle) p.handle, p.score, p.secs, p.found, p.total, p.created_at
    from public.plays_public p
    where p.game_id = p_game and p.day_no is null
    order by p.handle, p.score desc, p.secs asc, p.created_at asc
  )
  select row_number() over (order by b.score desc, b.secs asc, b.created_at asc) as rank,
         b.handle, b.score, b.secs, b.found, b.total
  from best b
  order by rank
  limit least(greatest(p_limit, 1), 100)
$$;

grant execute on function public.daily_board(integer, integer) to anon, authenticated;
grant execute on function public.daily_rank(integer, text) to anon, authenticated;
grant execute on function public.game_board(text, integer) to anon, authenticated;
