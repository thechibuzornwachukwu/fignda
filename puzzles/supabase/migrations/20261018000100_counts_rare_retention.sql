-- Data and privacy (BUILD_PLAN set 8) and rare finds (set 3b).
--
-- Counts: how many players have played each puzzle, and how many of them found each word, kept as counts with
-- no player on them. A play counts once a player and puzzle: the first checked one. A deleted account takes its
-- plays and leaves the counts.
--
-- Rare finds: a word fewer than 1 in 10 of a puzzle's players found, once 20 or more have played it. Worked out
-- when the play is saved (`plays.rare_keys`), so it never changes afterwards and points never go down. Each rare
-- word adds 50 points to the tally, once a word and puzzle (RARE_BONUS in src/lib/profileStats.ts), and the first
-- earns the Rare eye badge.
--
-- Retention (SECURITY.md): `prune_old_data()`, run by the Worker's hourly job.

create table public.puzzle_players (
  game_id text primary key,
  players integer not null default 0 check (players >= 0)
);
create table public.word_finds (
  game_id text not null,
  key text not null check (key ~ '^[a-z0-9]{1,40}$'),
  finds integer not null default 0 check (finds >= 0),
  primary key (game_id, key)
);
alter table public.puzzle_players enable row level security;
alter table public.word_finds enable row level security;

alter table public.plays add column rare_keys text[] not null default '{}';
grant select (rare_keys) on public.plays to authenticated;

-- Before a checked play is saved: which of its words were rare, from the counts as they stood.
create function public.plays_rare()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not new.verified or new.found_keys is null then return new; end if;
  select pp.players into n from public.puzzle_players pp where pp.game_id = new.game_id;
  if coalesce(n, 0) < 20 then return new; end if;
  select coalesce(array_agg(k order by k), '{}') into new.rare_keys
  from unnest(new.found_keys) as k
  where coalesce((select wf.finds from public.word_finds wf where wf.game_id = new.game_id and wf.key = k), 0) * 10 < n;
  return new;
end
$$;
create trigger plays_rare before insert on public.plays for each row execute function public.plays_rare();

-- After it is saved: the counts, on a player's first checked play of the puzzle only.
create function public.plays_count()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not new.verified then return new; end if;
  if exists (select 1 from public.plays p where p.user_id = new.user_id and p.game_id = new.game_id and p.verified and p.id <> new.id) then
    return new;
  end if;
  insert into public.puzzle_players (game_id, players) values (new.game_id, 1)
  on conflict (game_id) do update set players = public.puzzle_players.players + 1;
  insert into public.word_finds (game_id, key, finds)
  select new.game_id, k, 1 from unnest(coalesce(new.found_keys, '{}')) as k where k ~ '^[a-z0-9]{1,40}$'
  on conflict (game_id, key) do update set finds = public.word_finds.finds + 1;
  return new;
end
$$;
create trigger plays_count after insert on public.plays for each row execute function public.plays_count();

-- The counts so far, from each player's first checked play of each puzzle.
with firsts as (
  select distinct on (p.user_id, p.game_id) p.game_id, p.found_keys
  from public.plays p where p.verified
  order by p.user_id, p.game_id, p.created_at
)
insert into public.puzzle_players (game_id, players)
select f.game_id, count(*) from firsts f group by f.game_id
on conflict (game_id) do update set players = excluded.players;
with firsts as (
  select distinct on (p.user_id, p.game_id) p.game_id, p.found_keys
  from public.plays p where p.verified
  order by p.user_id, p.game_id, p.created_at
)
insert into public.word_finds (game_id, key, finds)
select f.game_id, k, count(*) from firsts f, unnest(coalesce(f.found_keys, '{}')) as k where k ~ '^[a-z0-9]{1,40}$' group by f.game_id, k
on conflict (game_id, key) do update set finds = excluded.finds;

-- The tally: as before, and 50 for each rare word, once a word and puzzle.
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
    union all
    select p.user_id, 100 from public.plays p where p.verified and p.clean group by p.user_id, p.game_id
    union all
    select r.user_id, 50 from (select distinct p.user_id, p.game_id, k from public.plays p, unnest(p.rare_keys) as k where p.verified) r
  ) t
  group by t.user_id
$$;

-- Badges: as before, and Rare eye on a play with a rare word.
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

  select coalesce((select pp.points from public.player_points() pp where pp.user_id = new.user_id), 0) into pts;
  foreach n in array array[1000, 5000, 10000, 25000, 50000, 100000] loop
    if pts >= n then earned := earned || ('points_' || n)::text; end if;
  end loop;

  earned := earned || coalesce(new.skills, '{}');
  if cardinality(coalesce(new.rare_keys, '{}')) > 0 then earned := earned || 'rare_eye'::text; end if;

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

-- What is kept, and for how long (SECURITY.md, Retention). Run hourly by the Worker.
create function public.prune_old_data()
returns void
language sql security definer
set search_path = ''
as $$
  -- A play's log is only for checking it: emptied after 90 days. Its score and words found stay.
  update public.plays set log = null where log is not null and created_at < now() - interval '90 days';
  update public.room_plays set log = null where log is not null and ended_at < now() - interval '90 days';
  delete from public.notifications where created_at < now() - interval '90 days';
  delete from public.game_invites where created_at < now() - interval '1 day';
  delete from public.rate_limits where window_start < now() - interval '2 days';
  delete from public.puzzle_reports where created_at < now() - interval '365 days';
$$;

revoke execute on function public.plays_rare() from public, anon, authenticated;
revoke execute on function public.plays_count() from public, anon, authenticated;
revoke execute on function public.prune_old_data() from public, anon, authenticated;
grant execute on function public.prune_old_data() to service_role;
