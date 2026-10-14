-- The written cases left this game on 14 Oct 2026 for an app of their own (Lantern Row, `../detective`), with its
-- own database. Their table and functions go. Points count what they counted before steps existed. `play_days`
-- stays: the run counts the days a clue was finished.

create or replace function public.player_points()
returns table (user_id uuid, points bigint)
language sql stable
set search_path = ''
as $$
  select t.user_id, sum(t.score)::bigint
  from (
    select p.user_id, p.score from public.plays p where p.verified and p.day_no is not null
    union all
    select p.user_id, max(p.score) from public.plays p where p.verified and p.day_no is null group by p.user_id, p.game_id
    union all
    select c.user_id, c.score from public.clue_plays c where c.verified
  ) t
  group by t.user_id
$$;

drop function if exists public.record_step(uuid, text, integer, integer, integer);
drop function if exists public.my_chapter_progress();
drop function if exists public.chapter_board(text);
drop table if exists public.chapter_plays;
