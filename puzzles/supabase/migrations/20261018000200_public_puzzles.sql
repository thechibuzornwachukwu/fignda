-- A public list of player-made puzzles (BUILD_PLAN set 9): published ones that passed the safety check, were never
-- hidden and are not reported, most liked first. Anyone can read it; it names the maker by handle only.

create function public.public_puzzles(p_limit integer default 50)
returns table (code text, title text, icon text, maker text, words integer, plays bigint, ups bigint)
language sql stable security definer
set search_path = ''
as $$
  select g.share_code, g.title, g.icon, pr.handle, jsonb_array_length(g.dict),
         (select count(*) from public.plays p where p.game_id = g.id and p.verified and p.user_id <> g.owner_id),
         (select count(*) from public.puzzle_ratings r where r.game_id = g.id and r.up)
  from public.games g
  join public.profiles pr on pr.id = g.owner_id
  where g.kind = 'custom' and g.topic_key is null and g.hidden_at is null and g.safety = 'passed'
    and not exists (select 1 from public.puzzle_reports rp where rp.game_id = g.id)
  order by 7 desc, g.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke execute on function public.public_puzzles(integer) from public;
grant execute on function public.public_puzzles(integer) to anon, authenticated;
