-- People to follow: every registered player, all time, minus yourself and the people you already follow.
-- Friends of the people you follow come first, then the most active, then the newest.
-- Shows only what a profile page already shows (name, handle, verified play count, follower count).
create function public.players_suggested(p_limit integer default 12)
returns table (handle text, name text, plays bigint, followers bigint, mutuals bigint)
language sql stable security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
       mine as (select f.followee_id from public.follows f, me where f.follower_id = me.id)
  select pr.handle, pr.name,
         (select count(*) from public.plays p where p.user_id = pr.id and p.verified),
         (select count(*) from public.follows f where f.followee_id = pr.id),
         (select count(*) from public.follows f where f.followee_id = pr.id and f.follower_id in (select followee_id from mine))
  from public.profiles pr, me
  where (me.id is null or pr.id <> me.id)
    and pr.id not in (select followee_id from mine)
  order by 5 desc, 3 desc, 4 desc, pr.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

revoke execute on function public.players_suggested(integer) from public, anon, authenticated;
grant execute on function public.players_suggested(integer) to anon, authenticated;
