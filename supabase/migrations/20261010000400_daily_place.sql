-- A guest's place on a daily board (BUILD_PLAN 2g2). A guest's score is never stored or ranked, so the result
-- can only say where it would stand: how many checked plays beat it, and how many there are.
-- It gives nothing away. Daily scores are already public on the board, and this returns 2 numbers.

create function public.daily_place(p_day integer, p_score integer, p_secs integer)
returns table (place bigint, players bigint)
language sql stable security definer
set search_path = ''
as $$
  -- The same order as the board: higher score, then the faster time. The guest is counted as one more player.
  select count(*) filter (where pl.score > p_score or (pl.score = p_score and pl.secs < p_secs)) + 1,
         count(*) + 1
  from public.plays pl
  where pl.verified
    and pl.day_no = p_day
    and p_day between 1 and public.fignda_day_no()
    and p_score between 0 and 1000000
    and p_secs between 0 and 604800
$$;

revoke execute on function public.daily_place(integer, integer, integer) from public;
grant execute on function public.daily_place(integer, integer, integer) to anon, authenticated;
