-- Points and badges count a step of a written chapter (BUILD_PLAN set 4a). A step's best checked score adds to a
-- player's points, once, as a clue's does. A points badge or a run badge is given the moment a step or a clue
-- earns it: before this they were given only when a whole puzzle was saved.
--
-- `player_points` and `record_step` are replaced with their names, arguments, results and grants as they were.

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
    -- A step keeps its best score only, so a replay adds nothing.
    select s.user_id, s.score from public.chapter_plays s
  ) t
  group by t.user_id
$$;

-- The badges a step or a clue can earn: the first game, points, and the run. Given once each, with a notification,
-- as `award_badges` gives them when a whole puzzle is saved.
create function public.award_progress_badges(p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  pts bigint;
  run integer;
  c text;
  earned text[] := array['first_game'];
  n integer;
begin
  if p_user is null then
    return;
  end if;
  select coalesce((select pp.points from public.player_points() pp where pp.user_id = p_user), 0) into pts;
  foreach n in array array[1000, 5000, 10000, 25000, 50000, 100000] loop
    if pts >= n then earned := earned || ('points_' || n)::text; end if;
  end loop;
  run := public.own_streak(p_user);
  foreach n in array array[7, 30, 50, 100, 365] loop
    if run >= n then earned := earned || ('streak_' || n)::text; end if;
  end loop;
  foreach c in array earned loop
    insert into public.badges (user_id, code) values (p_user, c) on conflict do nothing;
    if found then
      perform public.notify(p_user, 'badge', null, jsonb_build_object('code', c));
    end if;
  end loop;
end
$$;

revoke execute on function public.award_progress_badges(uuid) from public, anon, authenticated;
grant execute on function public.award_progress_badges(uuid) to service_role;

-- A step: kept as before, then its badges, once today is among the days played.
create or replace function public.record_step(p_user uuid, p_chapter text, p_step integer, p_stars integer, p_score integer)
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
  perform public.award_progress_badges(p_user);
  return true;
end
$$;

-- A checked clue: the same badges. Named to run after `clue_plays_day`, so today is already a day played.
create function public.clue_play_badges()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.verified then
    perform public.award_progress_badges(new.user_id);
  end if;
  return new;
end
$$;

revoke execute on function public.clue_play_badges() from public, anon, authenticated;

create trigger clue_plays_run after insert or update on public.clue_plays
  for each row execute function public.clue_play_badges();
