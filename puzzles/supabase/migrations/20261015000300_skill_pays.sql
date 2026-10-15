-- Skill pays (BUILD_PLAN set 3b). The Worker tags a verified play with the skills its replay showed
-- (`skillsOf` in src/engine/skill.ts): clean_read, no_hint_perfect, long_word, deep_find. Each is a badge, given
-- once. A clean read adds 100 points to the tally, once a puzzle (CLEAN_BONUS in src/lib/profileStats.ts).
-- player_points and award_badges keep their names, arguments, results and grants.

alter table public.plays
  add column skills text[] not null default '{}'
  check (skills <@ array['clean_read', 'no_hint_perfect', 'long_word', 'deep_find']::text[]);

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
    -- A clean read: 100 more, once a puzzle.
    select p.user_id, 100 from public.plays p where p.verified and p.clean group by p.user_id, p.game_id
  ) t
  group by t.user_id
$$;

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

  -- The skills this play showed, from the Worker's replay.
  earned := earned || coalesce(new.skills, '{}');

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
