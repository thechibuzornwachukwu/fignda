-- Make, one feature (BUILD_PLAN set 6). A puzzle carries the icon its maker picked (a name from
-- data/topicIcons.json, checked by the Worker). A machine-written draft records who wrote it and how long it
-- took, for the owner's eyes only: no function hands these 2 out.

alter table public.games
  add column icon text check (icon ~ '^[A-Za-z0-9]{1,40}$'),
  add column made_by text check (made_by ~ '^[a-z0-9-]{1,40}$'),
  add column made_secs integer check (made_secs between 0 and 3600);

-- The same lookup, now with the icon. Its result changes, so it is made again with its grants as they were.
drop function public.get_game_by_code(text);
create function public.get_game_by_code(p_code text)
returns table (id text, type text, category text, title text, noun text, text text, dict jsonb, share_code text, icon text)
language sql stable security definer
set search_path = ''
as $$
  select g.id, g.type, g.category, g.title, g.noun, g.text, g.dict, g.share_code, g.icon
  from public.games g
  where g.kind = 'custom'
    and p_code ~ '^[A-Za-z2-7]{8}$'
    and g.share_code = upper(p_code)
    and (g.hidden_at is null or g.owner_id = (select auth.uid()))
$$;
revoke execute on function public.get_game_by_code(text) from public, anon, authenticated;
grant execute on function public.get_game_by_code(text) to anon, authenticated;

drop function public.my_puzzles();
create function public.my_puzzles()
returns table (code text, title text, words integer, created_at timestamptz, plays bigint, ups bigint, downs bigint, icon text)
language sql stable security definer
set search_path = ''
as $$
  select g.share_code, g.title, jsonb_array_length(g.dict), g.created_at,
         (select count(*) from public.plays p where p.game_id = g.id and p.verified and p.user_id <> g.owner_id),
         (select count(*) from public.puzzle_ratings r where r.game_id = g.id and r.up),
         (select count(*) from public.puzzle_ratings r where r.game_id = g.id and not r.up),
         g.icon
  from public.games g
  where g.kind = 'custom' and g.owner_id = (select auth.uid()) and g.topic_key is null
  order by g.created_at desc
  limit 50
$$;
revoke execute on function public.my_puzzles() from public, anon, authenticated;
grant execute on function public.my_puzzles() to authenticated;
