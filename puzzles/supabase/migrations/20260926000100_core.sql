-- Fignda core schema. RLS on every table, default deny. See design/SECURITY.md.
--
-- Clients (anon, authenticated) get only the grants and policies below.
-- Writes to games, daily, daily_answers, plays and shares belong to the Worker (service role).
-- The two client write paths that exist are narrow security definer functions:
--   merge_guest_plays  (unverified, server recomputed)   delete_account (own user only)

-- ---------------------------------------------------------------------------
-- Lock down defaults. Supabase grants ALL on new public tables and EXECUTE on
-- new functions to anon/authenticated. Take that away; grant explicitly below.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Same as src/engine/daily.ts dayNo(): 2026-01-01 UTC is day 1.
create function public.fignda_day_no(at timestamptz default now())
returns integer
language sql stable
set search_path = ''
as $$
  select ((at at time zone 'utc')::date - date '2026-01-01') + 1
$$;

-- Same as src/engine/score.ts.
create function public.fignda_score(found integer, total integer, hints integer, misses integer, secs integer)
returns integer
language sql immutable
set search_path = ''
as $$
  select greatest(
    0,
    found * 100 - hints * 25 - misses * 10
      + case when found = total then greatest(0, 600 - secs) else 0 end
  )
$$;

-- Handle: 2 to 20 of [a-z0-9._], not reserved. Lowercase only, so uniqueness is case-insensitive.
create function public.handle_is_valid(h text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select h is not null
     and h ~ '^[a-z0-9._]{2,20}$'
     and h not in ('admin', 'fignda', 'support', 'root', 'help')
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

-- ---------------------------------------------------------------------------
-- profiles (name, handle). Email lives only in auth.users.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- games. Curated: everyone reads. Custom: owner reads; anyone with the share
-- code reads through get_game_by_code(). Worker only writes.
-- ---------------------------------------------------------------------------
create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  kind text not null check (kind in ('curated', 'custom')),
  type text not null default 'hidden-words' check (type in ('hidden-words')),
  owner_id uuid references auth.users (id) on delete cascade,
  share_code text unique check (share_code ~ '^[A-Z2-7]{8}$'),
  category text not null check (char_length(category) between 1 and 40),
  title text not null check (char_length(title) between 1 and 80),
  noun text not null check (char_length(noun) between 1 and 80),
  text text not null check (char_length(text) between 1 and 2000),
  dict jsonb not null check (jsonb_typeof(dict) = 'array'),
  created_at timestamptz not null default now(),
  check (
    (kind = 'curated' and owner_id is null and share_code is null)
    or (kind = 'custom' and share_code is not null)
  )
);

create index games_owner on public.games (owner_id) where owner_id is not null;

alter table public.games enable row level security;

create policy "games: curated readable" on public.games
  for select to anon, authenticated using (kind = 'curated');
create policy "games: owner reads custom" on public.games
  for select to authenticated using (kind = 'custom' and owner_id = (select auth.uid()));

grant select on public.games to anon, authenticated;

create function public.get_game_by_code(p_code text)
returns table (id text, type text, category text, title text, noun text, text text, dict jsonb, share_code text)
language sql stable security definer
set search_path = ''
as $$
  select g.id, g.type, g.category, g.title, g.noun, g.text, g.dict, g.share_code
  from public.games g
  where g.kind = 'custom'
    and p_code ~ '^[A-Za-z2-7]{8}$'
    and g.share_code = upper(p_code)
$$;

-- ---------------------------------------------------------------------------
-- daily. Which game runs on which day. Readable up to today.
-- daily_answers. Hidden until the day ends (service role only before that).
-- ---------------------------------------------------------------------------
create table public.daily (
  day_no integer primary key check (day_no >= 1),
  game_id text not null references public.games (id)
);

alter table public.daily enable row level security;

create policy "daily: up to today" on public.daily
  for select to anon, authenticated using (day_no <= public.fignda_day_no());

grant select on public.daily to anon, authenticated;

create table public.daily_answers (
  day_no integer primary key references public.daily (day_no) on delete cascade,
  answers text[] not null check (cardinality(answers) between 1 and 200),
  total integer generated always as (cardinality(answers)) stored
);

alter table public.daily_answers enable row level security;

create policy "daily_answers: after the day ends" on public.daily_answers
  for select to anon, authenticated using (day_no < public.fignda_day_no());

grant select on public.daily_answers to anon, authenticated;

-- ---------------------------------------------------------------------------
-- plays. Own rows only. Worker writes verified plays; guest merges are unverified.
-- ---------------------------------------------------------------------------
create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  day_no integer references public.daily (day_no),
  found smallint not null check (found >= 0),
  total smallint not null check (total between 1 and 200),
  hints smallint not null default 0 check (hints between 0 and 200),
  misses smallint not null default 0 check (misses between 0 and 1000),
  secs integer not null check (secs between 0 and 604800),
  score integer not null check (score >= 0),
  verified boolean not null default false,
  source text not null check (source in ('worker', 'guest_merge')),
  log jsonb,
  created_at timestamptz not null default now(),
  check (found <= total),
  check (not verified or source = 'worker')
);

create unique index plays_one_daily_per_user on public.plays (user_id, day_no) where day_no is not null;
create index plays_user on public.plays (user_id);

alter table public.plays enable row level security;

create policy "plays: read own" on public.plays
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.plays to authenticated;

-- Public leaderboard shape: handle, score, time. Verified only; unverified is never ranked.
-- Runs with the owner's rights on purpose so it can expose these columns and nothing else.
create view public.plays_public
with (security_barrier = true)
as
  select pl.id, pr.handle, pl.game_id, pl.day_no, pl.score, pl.secs, pl.created_at
  from public.plays pl
  join public.profiles pr on pr.id = pl.user_id
  where pl.verified;

grant select on public.plays_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- shares. Readable by code only, through get_share().
-- ---------------------------------------------------------------------------
create table public.shares (
  code text primary key check (code ~ '^[A-Z2-7]{8}$'),
  user_id uuid references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  day_no integer,
  kind text not null check (kind in ('result', 'puzzle')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8192),
  created_at timestamptz not null default now()
);

create index shares_user on public.shares (user_id) where user_id is not null;

alter table public.shares enable row level security;
-- No policies: clients cannot list shares.

create function public.get_share(p_code text)
returns table (code text, game_id text, day_no integer, kind text, payload jsonb, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select s.code, s.game_id, s.day_no, s.kind, s.payload, s.created_at
  from public.shares s
  where p_code ~ '^[A-Za-z2-7]{8}$'
    and s.code = upper(p_code)
$$;

-- ---------------------------------------------------------------------------
-- Account deletion. Cascades profile, plays, shares, custom games.
-- ---------------------------------------------------------------------------
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
-- Guest merge. Past and today's dailies played as a guest, stored unverified.
-- The server decides game and total; the client only reports counts and time.
-- ---------------------------------------------------------------------------
create function public.merge_guest_plays(items jsonb)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today integer := public.fignda_day_no();
  it jsonb;
  d integer;
  g text;
  tot integer;
  f integer;
  h integer;
  m integer;
  s integer;
  added integer;
  n integer := 0;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 60 then
    raise exception 'Bad input.' using errcode = '22023';
  end if;

  for it in select value from jsonb_array_elements(items) loop
    continue when jsonb_typeof(it) <> 'object';
    -- Whole numbers only, bounded length. Anything else skips the item.
    continue when coalesce(it->>'day_no', '') !~ '^[0-9]{1,6}$'
               or coalesce(it->>'found', '') !~ '^[0-9]{1,3}$'
               or coalesce(it->>'hints', '') !~ '^[0-9]{1,3}$'
               or coalesce(it->>'misses', '') !~ '^[0-9]{1,4}$'
               or coalesce(it->>'secs', '') !~ '^[0-9]{1,6}$';
    d := (it->>'day_no')::integer;
    continue when d < 1 or d > today;

    select dy.game_id, a.total into g, tot
    from public.daily dy
    join public.daily_answers a on a.day_no = dy.day_no
    where dy.day_no = d;
    continue when g is null;

    f := least((it->>'found')::integer, tot);
    h := least((it->>'hints')::integer, 200);
    m := least((it->>'misses')::integer, 1000);
    s := least((it->>'secs')::integer, 604800);

    insert into public.plays (user_id, game_id, day_no, found, total, hints, misses, secs, score, verified, source)
    values (uid, g, d, f, tot, h, m, s, public.fignda_score(f, tot, h, m, s), false, 'guest_merge')
    on conflict (user_id, day_no) where day_no is not null do nothing;

    get diagnostics added = row_count;
    n := n + added;
  end loop;

  return n;
end
$$;

-- ---------------------------------------------------------------------------
-- Function grants. Nothing is executable unless listed here.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.fignda_day_no(timestamptz) to anon, authenticated;
grant execute on function public.handle_is_valid(text) to anon, authenticated;
grant execute on function public.get_game_by_code(text) to anon, authenticated;
grant execute on function public.get_share(text) to anon, authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.merge_guest_plays(jsonb) to authenticated;
