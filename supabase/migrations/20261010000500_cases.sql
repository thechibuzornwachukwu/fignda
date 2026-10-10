-- Cases on the server (BUILD_PLAN 3e). A clue is one passage of a catalogue puzzle, played as a game of its own.
-- The Worker replays its log and stores the best result here. The whole puzzle, the last clue of a case, stays
-- in `plays` with its boards and scores as they are.
--
-- Progress a guest made before signing in is moved here too, unverified: it carries the stars so the path is
-- the same on every device, and it earns no points and no badge.

create table public.clue_plays (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  -- The passage, counted from 1. 0 is the whole puzzle, and only ever as moved guest progress.
  clue smallint not null check (clue between 0 and 40),
  stars smallint not null check (stars between 1 and 3),
  score integer not null default 0 check (score >= 0),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, clue),
  -- A verified whole puzzle is a row in `plays`, never one here.
  check (not verified or clue > 0),
  -- What was never checked scores nothing.
  check (verified or score = 0)
);

-- No policies and no grants: read through my_progress(), written by the functions below.
alter table public.clue_plays enable row level security;

-- ---------------------------------------------------------------------------
-- Writing
-- ---------------------------------------------------------------------------

-- Worker only, after it has replayed the log. Keeps the best stars and the best score, so a replay can only
-- raise them and cannot farm points. False for a puzzle that is not in the catalogue.
create function public.record_clue(p_user uuid, p_game text, p_clue integer, p_stars integer, p_score integer)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_clue is null or p_clue < 1 or p_clue > 40 or p_stars is null or p_stars < 1 or p_stars > 3 or p_score is null or p_score < 0 then
    return false;
  end if;
  if not exists (select 1 from public.games g where g.id = p_game and g.kind = 'curated') then
    return false;
  end if;
  insert into public.clue_plays as c (user_id, game_id, clue, stars, score, verified)
  values (p_user, p_game, p_clue, p_stars, p_score, true)
  on conflict (user_id, game_id, clue) do update
    set stars = greatest(c.stars, excluded.stars),
        -- A score from an unchecked row is 0, so this is the best checked score.
        score = greatest(c.score, excluded.score),
        verified = true,
        updated_at = now();
  return true;
end
$$;

-- A guest's progress, moved to the account on sign in: `[{ "id": "bible~2", "stars": 3 }, { "id": "bible", "stars": 1 }]`.
-- Unverified, so it scores nothing. It never lowers and never raises what a checked play earned.
-- Anything that is not a clue of a catalogue puzzle is skipped. Safe to send again.
create function public.merge_guest_progress(items jsonb)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  it jsonb;
  m text[];
  g text;
  n integer;
  st integer;
  added integer;
  total integer := 0;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 400 then
    raise exception 'Bad input.' using errcode = '22023';
  end if;

  for it in select value from jsonb_array_elements(items) loop
    continue when jsonb_typeof(it) <> 'object';
    continue when coalesce(it->>'stars', '') !~ '^[1-3]$';
    m := regexp_match(coalesce(it->>'id', ''), '^([a-z0-9-]{2,40})(~([0-9]{1,2}))?$');
    continue when m is null;
    g := m[1];
    n := coalesce(m[3], '0')::integer;
    continue when n > 40;
    continue when not exists (select 1 from public.games gm where gm.id = g and gm.kind = 'curated');
    st := (it->>'stars')::integer;

    insert into public.clue_plays as c (user_id, game_id, clue, stars, score, verified)
    values (uid, g, n, st, 0, false)
    on conflict (user_id, game_id, clue) do update
      set stars = greatest(c.stars, excluded.stars), updated_at = now()
      where not c.verified and c.stars < excluded.stars;

    get diagnostics added = row_count;
    total := total + added;
  end loop;

  return total;
end
$$;

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------

-- Your own clues done, as the path names them: `bible~2` for a passage, `bible` for the whole puzzle, with the
-- best stars of each. A whole puzzle from `plays` earns stars by the same rule the game uses: 3 for a clean
-- read, 2 for 80% or more found, else 1. Plays from before cases existed count: they are whole puzzles.
create function public.my_progress()
returns table (clue_id text, stars smallint)
language sql stable security definer
set search_path = ''
as $$
  select t.clue_id, max(t.stars)::smallint
  from (
    select c.game_id || case when c.clue > 0 then '~' || c.clue else '' end as clue_id, c.stars::integer as stars
    from public.clue_plays c
    where c.user_id = (select auth.uid())
    union all
    select p.game_id, case when p.clean then 3 when p.found * 5 >= p.total * 4 then 2 else 1 end
    from public.plays p
    join public.games g on g.id = p.game_id and g.kind = 'curated'
    where p.user_id = (select auth.uid()) and p.verified and p.day_no is null
  ) t
  group by t.clue_id
$$;

-- ---------------------------------------------------------------------------
-- Points and ranks
-- ---------------------------------------------------------------------------

-- Points now count a clue's best checked score, once. Everything that counted before counts the same.
create or replace function public.player_points()
returns table (user_id uuid, points bigint)
language sql stable
set search_path = ''
as $$
  select t.user_id, sum(t.score)::bigint
  from (
    select p.user_id, p.score from public.plays p where p.verified and p.day_no is not null
    union all
    select p.user_id, max(p.score) from public.plays p where p.verified and p.day_no is null group by p.user_id, p.game_id
    union all
    select c.user_id, c.score from public.clue_plays c where c.verified
  ) t
  group by t.user_id
$$;

-- A rank is a view over points and is never stored: 5 levels to a rank, the gaps of `src/engine/level.ts`.
-- `src/engine/level.test.ts` fails if these numbers and the engine's drift apart.
create function public.rank_of(p_points bigint)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when coalesce(p_points, 0) >= 36020 then 'Chief'
    when coalesce(p_points, 0) >= 12970 then 'Inspector'
    when coalesce(p_points, 0) >= 3720 then 'Detective'
    else 'Rookie'
  end
$$;

-- A player's points and rank, by handle. Points are already public on the Players page.
create function public.points_of(p_handle text)
returns table (points bigint, rank text)
language sql stable security definer
set search_path = ''
as $$
  select coalesce(pp.points, 0), public.rank_of(coalesce(pp.points, 0))
  from public.profiles pr
  left join public.player_points() pp on pp.user_id = pr.id
  where pr.handle = p_handle
$$;

-- ---------------------------------------------------------------------------
-- Badges: closed cases, and points that count clues
-- ---------------------------------------------------------------------------

-- As before, plus: points count clues, and a case closed (a checked play of a whole catalogue puzzle) counts
-- toward the case badges.
create or replace function public.award_badges()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  pts bigint;
  run integer;
  closed integer;
  c text;
  earned text[] := array['first_game'];
  n integer;
begin
  if not new.verified then
    return new;
  end if;

  select coalesce(sum(t.score), 0) into pts
  from (
    select p.score from public.plays p where p.user_id = new.user_id and p.verified and p.day_no is not null
    union all
    select max(p.score) from public.plays p where p.user_id = new.user_id and p.verified and p.day_no is null group by p.game_id
    union all
    select c.score from public.clue_plays c where c.user_id = new.user_id and c.verified
  ) t;
  foreach n in array array[1000, 5000, 10000, 25000, 50000, 100000] loop
    if coalesce(pts, 0) >= n then earned := earned || ('points_' || n)::text; end if;
  end loop;

  if new.day_no is not null then
    if new.found = new.total then earned := earned || 'perfect_daily'::text; end if;
    run := public.own_streak(new.user_id);
    foreach n in array array[7, 30, 50, 100, 365] loop
      if run >= n then earned := earned || ('streak_' || n)::text; end if;
    end loop;
  else
    select count(distinct p.game_id) into closed
    from public.plays p
    join public.games g on g.id = p.game_id and g.kind = 'curated'
    where p.user_id = new.user_id and p.verified and p.day_no is null;
    foreach n in array array[1, 5, 10, 25] loop
      if closed >= n then earned := earned || ('cases_' || n)::text; end if;
    end loop;
  end if;

  foreach c in array earned loop
    insert into public.badges (user_id, code) values (new.user_id, c) on conflict do nothing;
    if found then
      perform public.notify(new.user_id, 'badge', null, jsonb_build_object('code', c));
    end if;
  end loop;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Grants. Nothing is executable unless listed here.
-- ---------------------------------------------------------------------------
revoke execute on function public.record_clue(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.merge_guest_progress(jsonb) from public, anon, authenticated;
revoke execute on function public.my_progress() from public, anon, authenticated;
revoke execute on function public.rank_of(bigint) from public, anon, authenticated;
revoke execute on function public.points_of(text) from public, anon, authenticated;

grant execute on function public.record_clue(uuid, text, integer, integer, integer) to service_role;
grant execute on function public.merge_guest_progress(jsonb) to authenticated;
grant execute on function public.my_progress() to authenticated;
grant execute on function public.points_of(text) to anon, authenticated;
