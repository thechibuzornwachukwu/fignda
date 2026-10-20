-- Your League, Friends: you and the people you follow, on this week's points, counted the way the league counts
-- them. A friend you invited shows here as soon as they play signed in. Everyone on it already shows points
-- on their league table; this only gathers the ones you chose.
create function public.friends_board()
returns table (place integer, handle text, name text, points bigint, me boolean)
language sql stable security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  who as (
    select f.followee_id as id from public.follows f, me where f.follower_id = me.id
    union
    select me.id from me where me.id is not null
  ),
  scored as (
    select pr.handle, pr.name, public.league_points(pr.id, public.league_week(now())) as points, pr.id = (select id from me) as me
    from who join public.profiles pr on pr.id = who.id
  )
  select (row_number() over (order by s.points desc, s.handle))::integer, s.handle, s.name, s.points, s.me
  from scored s
  order by 1
  limit 100
$$;

revoke execute on function public.friends_board() from public, anon, authenticated;
grant execute on function public.friends_board() to authenticated;
