-- Written chapters on the server (BUILD_PLAN set 4a). A chapter is a case told in steps (`design/stories`). The
-- Worker replays the log of a step with the shared engine and stores the best result here, as it does for a clue.
-- A chapter is not a row in `games`: its steps are files the Worker is built with, so there is nothing to seed.
--
-- This file only adds. No table, function or policy that exists is changed, so nothing a player has is touched.
-- The run that other players see (`own_streak`, `pair_streak`, reminders) still counts dailies only: moving
-- those to `play_days` is a file of its own, once this one has been tested against a real database.

create table public.chapter_plays (
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter text not null check (chapter ~ '^[a-z0-9-]{2,40}$'),
  -- The step, counted from 1. The last step of a "who did it" is the line-up.
  step smallint not null check (step between 1 and 12),
  stars smallint not null check (stars between 1 and 3),
  score integer not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter, step)
);

-- No policies and no grants: read through the functions below, written by the Worker through record_step().
alter table public.chapter_plays enable row level security;

-- The days a player finished something checked that is not a daily: a step of a chapter or a clue of a case.
-- With the dailies in `plays`, these are the days a run is counted from.
create table public.play_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_no integer not null check (day_no >= 1),
  primary key (user_id, day_no)
);

alter table public.play_days enable row level security;

-- ---------------------------------------------------------------------------
-- Writing
-- ---------------------------------------------------------------------------

-- Worker only, after it has replayed the log. Keeps the best stars and the best score, so a replay can only
-- raise them and cannot farm points. The Worker has already checked that the chapter and the step exist.
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
  insert into public.play_days (user_id, day_no)
  values (p_user, public.fignda_day_no())
  on conflict do nothing;
  return true;
end
$$;

-- A checked clue of a case counts as a day too. Guest progress moved to an account is unverified and does not:
-- it was not played today, and it was never checked.
create function public.clue_play_day()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.verified then
    insert into public.play_days (user_id, day_no)
    values (new.user_id, public.fignda_day_no())
    on conflict do nothing;
  end if;
  return new;
end
$$;

create trigger clue_plays_day after insert or update on public.clue_plays
  for each row execute function public.clue_play_day();

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------

-- Your own steps done, on any device, with the best stars of each.
create function public.my_chapter_progress()
returns table (chapter text, step smallint, stars smallint)
language sql stable security definer
set search_path = ''
as $$
  select c.chapter, c.step, c.stars
  from public.chapter_plays c
  where c.user_id = (select auth.uid())
$$;

-- The days your run is counted from: every daily you played, and every day you finished a checked step or clue.
create function public.my_play_days()
returns setof integer
language sql stable security definer
set search_path = ''
as $$
  select p.day_no from public.plays p
  where p.user_id = (select auth.uid()) and p.day_no is not null
  union
  select d.day_no from public.play_days d
  where d.user_id = (select auth.uid())
$$;

-- The board of a chapter: each player's best checked score on each step, added up. Handles and names are already
-- public on every other board. The top 100, most points first, then most stars, then whoever got there first.
create function public.chapter_board(p_chapter text)
returns table (handle text, name text, score bigint, stars bigint, steps bigint)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name, sum(c.score)::bigint, sum(c.stars)::bigint, count(*)::bigint
  from public.chapter_plays c
  join public.profiles pr on pr.id = c.user_id
  where c.chapter = p_chapter
  group by pr.id, pr.handle, pr.name
  order by sum(c.score) desc, sum(c.stars) desc, max(c.updated_at) asc
  limit 100
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

revoke execute on function public.record_step(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.clue_play_day() from public, anon, authenticated;
revoke execute on function public.my_chapter_progress() from public, anon, authenticated;
revoke execute on function public.my_play_days() from public, anon, authenticated;
revoke execute on function public.chapter_board(text) from public, anon, authenticated;

grant execute on function public.record_step(uuid, text, integer, integer, integer) to service_role;
grant execute on function public.my_chapter_progress() to authenticated;
grant execute on function public.my_play_days() to authenticated;
grant execute on function public.chapter_board(text) to anon, authenticated;
