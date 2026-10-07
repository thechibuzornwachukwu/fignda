-- Points: a lifetime tally from verified plays. Every daily counts. A puzzle played more than once counts its
-- best score only, so replaying one puzzle cannot farm points. A game ended early still adds what it earned.

create function public.player_points()
returns table (user_id uuid, points bigint)
language sql stable
set search_path = ''
as $$
  select t.user_id, sum(t.score)::bigint
  from (
    select p.user_id, p.score from public.plays p where p.verified and p.day_no is not null
    union all
    select p.user_id, max(p.score) from public.plays p where p.verified and p.day_no is null group by p.user_id, p.game_id
  ) t
  group by t.user_id
$$;
-- Internal: exposes user ids.
revoke execute on function public.player_points() from public, anon, authenticated;

create function public.players_points(p_limit integer default 10)
returns table (handle text, name text, value bigint)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name, pp.points
  from public.player_points() pp
  join public.profiles pr on pr.id = pp.user_id
  where pp.points > 0
  order by pp.points desc, pr.handle
  limit least(greatest(p_limit, 1), 50)
$$;

revoke execute on function public.players_points(integer) from public, anon, authenticated;
grant execute on function public.players_points(integer) to anon, authenticated;
