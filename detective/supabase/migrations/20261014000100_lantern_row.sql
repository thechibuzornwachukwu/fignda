-- Lantern Row schema: the detective game's own database, shared with nothing. RLS on every table, default deny.
-- See design/SECURITY.md. Clients read through the policies and functions granted below. The Worker writes a
-- checked step through record_step() with the service role. The one other client write is delete_account().

-- ---------------------------------------------------------------------------
-- Lock down defaults: nothing is readable or executable unless it is granted below.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: a name and a handle. The email lives only in auth.users.
-- ---------------------------------------------------------------------------

-- Handle: 2 to 20 of [a-z0-9._], not reserved. Lowercase only, so uniqueness is case-insensitive.
create function public.handle_is_valid(h text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select h is not null
     and h ~ '^[a-z0-9._]{2,20}$'
     and h not in ('admin', 'lanternrow', 'detective', 'support', 'root', 'help')
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null
    check (char_length(name) between 1 and 40)
    check (name = btrim(name))
    check (name !~ '[[:cntrl:]]'),
  handle text not null unique
    check (public.handle_is_valid(handle)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: anyone reads" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on public.profiles to anon, authenticated;
grant insert (id, name, handle) on public.profiles to authenticated;
grant update (name, handle) on public.profiles to authenticated;

-- Account deletion: the player's own, and everything that hangs off it, at once.
create function public.delete_account()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end
$$;

-- ---------------------------------------------------------------------------
-- Rate limits for the Worker. Fixed-window counters, one row per (key, window).
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

-- Counts one hit and says whether it is allowed. Atomic under concurrency.
create function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, retry_after integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, win, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into n;
  delete from public.rate_limits where key = p_key and window_start < win;
  allowed := n <= p_max;
  retry_after := greatest(1, ceil(extract(epoch from (win + make_interval(secs => p_window_seconds) - now())))::integer);
  return next;
end
$$;

-- ---------------------------------------------------------------------------
-- Steps of cases. The Worker replays a step with the shared engine and keeps the best result here.
-- A case is not a row: its steps are files the Worker is built with (design/stories).
-- ---------------------------------------------------------------------------
create table public.chapter_plays (
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter text not null check (chapter ~ '^[a-z0-9-]{2,40}$'),
  step smallint not null check (step between 1 and 12),
  stars smallint not null check (stars between 1 and 3),
  score integer not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter, step)
);

-- No policies and no grants: read through the functions below, written by the Worker through record_step().
alter table public.chapter_plays enable row level security;

-- Worker only, after it has replayed the step. Keeps the best stars and the best score, so a replay can only
-- raise them and cannot farm points.
create function public.record_step(p_user uuid, p_chapter text, p_step integer, p_stars integer, p_score integer)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_user is null or p_chapter is null or p_chapter !~ '^[a-z0-9-]{2,40}$'
     or p_step is null or p_step < 1 or p_step > 12
     or p_stars is null or p_stars < 1 or p_stars > 3
     or p_score is null or p_score < 0 then
    return false;
  end if;
  insert into public.chapter_plays as c (user_id, chapter, step, stars, score)
  values (p_user, p_chapter, p_step, p_stars, p_score)
  on conflict (user_id, chapter, step) do update
    set stars = greatest(c.stars, excluded.stars),
        score = greatest(c.score, excluded.score),
        updated_at = now();
  return true;
end
$$;

-- Your own steps, on any device, with the best stars of each.
create function public.my_chapter_progress()
returns table (chapter text, step smallint, stars smallint)
language sql stable security definer
set search_path = ''
as $$
  select c.chapter, c.step, c.stars
  from public.chapter_plays c
  where c.user_id = (select auth.uid())
$$;

-- The board of a case: each player's best checked score on each step, added up. Handles only. The top 100, most
-- points first, then most stars, then whoever got there first.
create function public.chapter_board(p_chapter text)
returns table (handle text, score bigint, stars bigint, steps bigint)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, sum(c.score)::bigint, sum(c.stars)::bigint, count(*)::bigint
  from public.chapter_plays c
  join public.profiles pr on pr.id = c.user_id
  where c.chapter = p_chapter
  group by pr.id, pr.handle
  order by sum(c.score) desc, sum(c.stars) desc, max(c.updated_at) asc
  limit 100
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. Nothing is executable unless it is listed here.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.handle_is_valid(text) to anon, authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.my_chapter_progress() to authenticated;
grant execute on function public.chapter_board(text) to anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.record_step(uuid, text, integer, integer, integer) to service_role;
