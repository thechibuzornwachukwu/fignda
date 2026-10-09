-- Reports on puzzles that are not ours (player-made and machine-made). 3 reports from different players hide a
-- puzzle at once. Hidden puzzles do not open by link for anyone but their maker, and the owner page lists them.
-- Everything here is written by the Worker (service role) only.

-- When the puzzle was hidden. Null: open.
alter table public.games add column hidden_at timestamptz;
-- When the owner last restored it. Reports from before this no longer count toward hiding it again.
alter table public.games add column restored_at timestamptz;
create index games_hidden on public.games (hidden_at desc) where hidden_at is not null;

-- One report per player per puzzle. Never on your own.
create table public.puzzle_reports (
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.puzzle_reports enable row level security;
-- No policies and no grants: clients never see this table.

-- One report, in one transaction with the count that may hide the puzzle.
--   missing   no such puzzle (or it is one of ours)
--   own       your own puzzle
--   again     you have reported it before
--   reported  counted
--   hidden    counted, and that made 3: the puzzle is now hidden
create function public.report_puzzle(p_code text, p_user uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  n integer;
begin
  select * into g from public.games
  where kind = 'custom' and p_code ~ '^[A-Za-z2-7]{8}$' and share_code = upper(p_code)
  for update;
  if not found then
    return 'missing';
  end if;
  if g.owner_id = p_user then
    return 'own';
  end if;
  insert into public.puzzle_reports (game_id, user_id) values (g.id, p_user) on conflict do nothing;
  if not found then
    return 'again';
  end if;
  select count(*) into n from public.puzzle_reports r
  where r.game_id = g.id and (g.restored_at is null or r.created_at > g.restored_at);
  if n >= 3 and g.hidden_at is null then
    update public.games set hidden_at = now() where id = g.id;
    return 'hidden';
  end if;
  return 'reported';
end
$$;

-- The owner page: hidden puzzles, newest first.
create function public.hidden_puzzles(p_limit integer default 50)
returns table (code text, title text, noun text, text text, dict jsonb, maker text, safety text, reports bigint,
               created_at timestamptz, hidden_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select g.share_code, g.title, g.noun, g.text, g.dict,
         (select pr.handle from public.profiles pr where pr.id = g.owner_id),
         g.safety,
         (select count(*) from public.puzzle_reports r where r.game_id = g.id),
         g.created_at, g.hidden_at
  from public.games g
  where g.kind = 'custom' and g.hidden_at is not null
  order by g.hidden_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- Restore: the puzzle opens again. Its reports are kept (so nobody reports twice and it never becomes a daily
-- candidate), but they stop counting toward hiding it. False when it was not hidden.
create function public.restore_puzzle(p_code text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.games set hidden_at = null, restored_at = now()
  where kind = 'custom' and p_code ~ '^[A-Za-z2-7]{8}$' and share_code = upper(p_code) and hidden_at is not null;
  return found;
end
$$;

-- Remove: the puzzle is deleted for good, with its plays, ratings and reports. Hidden puzzles only.
create function public.remove_puzzle(p_code text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.games
  where kind = 'custom' and p_code ~ '^[A-Za-z2-7]{8}$' and share_code = upper(p_code) and hidden_at is not null;
  return found;
end
$$;

-- A hidden puzzle no longer opens by link. Its maker can still open it.
create or replace function public.get_game_by_code(p_code text)
returns table (id text, type text, category text, title text, noun text, text text, dict jsonb, share_code text)
language sql stable security definer
set search_path = ''
as $$
  select g.id, g.type, g.category, g.title, g.noun, g.text, g.dict, g.share_code
  from public.games g
  where g.kind = 'custom'
    and p_code ~ '^[A-Za-z2-7]{8}$'
    and g.share_code = upper(p_code)
    and (g.hidden_at is null or g.owner_id = (select auth.uid()))
$$;

revoke execute on function public.report_puzzle(text, uuid) from public, anon, authenticated;
revoke execute on function public.hidden_puzzles(integer) from public, anon, authenticated;
revoke execute on function public.restore_puzzle(text) from public, anon, authenticated;
revoke execute on function public.remove_puzzle(text) from public, anon, authenticated;
revoke execute on function public.get_game_by_code(text) from public, anon, authenticated;
grant execute on function public.report_puzzle(text, uuid) to service_role;
grant execute on function public.hidden_puzzles(integer) to service_role;
grant execute on function public.restore_puzzle(text) to service_role;
grant execute on function public.remove_puzzle(text) to service_role;
grant execute on function public.get_game_by_code(text) to anon, authenticated;
