-- Player-made puzzles: ratings and the maker's own list. The puzzles themselves are custom games written by
-- the Worker (POST /api/puzzles), which runs the engine over the draft first.

-- One thumb per player per puzzle. Never on your own.
create table public.puzzle_ratings (
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  up boolean not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.puzzle_ratings enable row level security;
-- No policies and no grants: read and written through the functions below.

-- Rate a custom puzzle by its share code. Rating again changes your answer.
create function public.rate_puzzle(p_code text, p_up boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  g public.games%rowtype;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into g from public.games where kind = 'custom' and p_code ~ '^[A-Za-z2-7]{8}$' and share_code = upper(p_code);
  if not found or g.owner_id = me then
    return false;
  end if;
  insert into public.puzzle_ratings (game_id, user_id, up) values (g.id, me, p_up)
  on conflict (game_id, user_id) do update set up = excluded.up;
  return true;
end
$$;

-- Thumbs for one puzzle, who made it, and your own answer if you gave one.
create function public.puzzle_rating(p_code text)
returns table (ups bigint, downs bigint, mine boolean, maker text, own boolean)
language sql stable security definer
set search_path = ''
as $$
  select (select count(*) from public.puzzle_ratings r where r.game_id = g.id and r.up),
         (select count(*) from public.puzzle_ratings r where r.game_id = g.id and not r.up),
         (select r.up from public.puzzle_ratings r where r.game_id = g.id and r.user_id = (select auth.uid())),
         (select pr.handle from public.profiles pr where pr.id = g.owner_id),
         coalesce(g.owner_id = (select auth.uid()), false)
  from public.games g
  where g.kind = 'custom' and p_code ~ '^[A-Za-z2-7]{8}$' and g.share_code = upper(p_code)
$$;

-- The puzzles you made, newest first, with how they are doing.
create function public.my_puzzles()
returns table (code text, title text, words integer, created_at timestamptz, plays bigint, ups bigint, downs bigint)
language sql stable security definer
set search_path = ''
as $$
  select g.share_code, g.title, jsonb_array_length(g.dict), g.created_at,
         (select count(*) from public.plays p where p.game_id = g.id and p.verified and p.user_id <> g.owner_id),
         (select count(*) from public.puzzle_ratings r where r.game_id = g.id and r.up),
         (select count(*) from public.puzzle_ratings r where r.game_id = g.id and not r.up)
  from public.games g
  where g.kind = 'custom' and g.owner_id = (select auth.uid()) and g.topic_key is null
  order by g.created_at desc
  limit 50
$$;

revoke execute on function public.rate_puzzle(text, boolean) from public, anon, authenticated;
revoke execute on function public.puzzle_rating(text) from public, anon, authenticated;
revoke execute on function public.my_puzzles() from public, anon, authenticated;
grant execute on function public.rate_puzzle(text, boolean) to authenticated;
grant execute on function public.puzzle_rating(text) to anon, authenticated;
grant execute on function public.my_puzzles() to authenticated;
