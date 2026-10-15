-- Personal records on the server (BUILD_PLAN set 3f), worked out from the caller's own verified plays, so a
-- second device has them too: the fastest clean read in each pack, the longest word found, and the best week
-- (the most points earned in one Monday to Sunday week, UTC). The browser keeps the better of its own records
-- and these (`mergeRecords` in src/lib/records.ts).

create function public.my_records()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with me as (select auth.uid() as id),
  clean as (
    select g.category, min(p.secs) as secs
    from public.plays p join public.games g on g.id = p.game_id and g.kind = 'curated', me
    where p.user_id = me.id and p.verified and p.clean
    group by g.category
  ),
  word as (
    select k as key, char_length(k) as len
    from public.plays p, me, jsonb_array_elements_text(to_jsonb(p.found_keys)) as k
    where p.user_id = me.id and p.verified
    order by char_length(k) desc, k
    limit 1
  ),
  scored as (
    select p.created_at as at, p.score from public.plays p, me where p.user_id = me.id and p.verified
    union all
    select c.created_at, c.score from public.clue_plays c, me where c.user_id = me.id and c.verified
  ),
  weeks as (
    select sum(s.score)::bigint as points from scored s group by date_trunc('week', s.at at time zone 'UTC')
  )
  select jsonb_build_object(
    'clean', coalesce((select jsonb_object_agg(c.category, c.secs) from clean c), '{}'),
    'long', (select jsonb_build_object('word', w.key, 'len', w.len) from word w),
    'best_week', coalesce((select max(w.points) from weeks w), 0)
  )
  from me
  where me.id is not null
$$;

revoke execute on function public.my_records() from public, anon;
grant execute on function public.my_records() to authenticated;
