-- The run without a daily (BUILD_PLAN set 4a). A day counts when something checked was finished on it: a daily
-- from before the daily went, a step of a written chapter or a clue of a case. The run other players see, friend
-- streaks and reminders move from "played the daily" to that. Nobody's run ends because the daily did.
--
-- 5 functions that exist are replaced, each with its name, arguments, result and grants as they were. Only the
-- place a day is read from changes.

-- ---------------------------------------------------------------------------
-- The days a player played
-- ---------------------------------------------------------------------------

-- Every day a player played: any daily of theirs, and any day in `play_days`. Their own run is counted from these.
create function public.played_days(p_user uuid)
returns setof integer
language sql stable security definer
set search_path = ''
as $$
  select p.day_no from public.plays p
  where p.user_id = p_user and p.day_no is not null
  union
  select d.day_no from public.play_days d
  where d.user_id = p_user
$$;

-- The same, with checked dailies only. What 2 players share is counted from these, as it was counted from
-- checked dailies before. A day in `play_days` is always a checked one.
create function public.checked_days(p_user uuid)
returns setof integer
language sql stable security definer
set search_path = ''
as $$
  select p.day_no from public.plays p
  where p.user_id = p_user and p.day_no is not null and p.verified
  union
  select d.day_no from public.play_days d
  where d.user_id = p_user
$$;

-- Inside the database only. The Worker's role may call them because a function it calls does.
revoke execute on function public.played_days(uuid) from public, anon, authenticated;
revoke execute on function public.checked_days(uuid) from public, anon, authenticated;
grant execute on function public.played_days(uuid) to service_role;
grant execute on function public.checked_days(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- The run, a shared run, and who has played today
-- ---------------------------------------------------------------------------

create or replace function public.own_streak(p_user uuid)
returns integer
language sql stable
set search_path = ''
as $$
  with d as (
    select distinct x.day_no from public.played_days(p_user) as x(day_no)
    where x.day_no <= public.fignda_day_no()
  ),
  r as (select d.day_no, d.day_no - row_number() over (order by d.day_no) as grp from d)
  select coalesce((
    select count(*)::integer from r
    where r.grp = (select x.grp from r x where x.day_no >= public.fignda_day_no() - 1 order by x.day_no desc limit 1)
  ), 0)
$$;

create or replace function public.pair_streak(a uuid, b uuid, p_start integer)
returns integer
language sql stable
set search_path = ''
as $$
  with d as (
    select x.day_no from public.checked_days(a) as x(day_no)
    where x.day_no >= p_start and x.day_no <= public.fignda_day_no()
    intersect
    select y.day_no from public.checked_days(b) as y(day_no)
  ),
  r as (select d.day_no, d.day_no - row_number() over (order by d.day_no) as grp from d)
  select coalesce((
    select count(*)::integer from r
    where r.grp = (select x.grp from r x where x.day_no >= public.fignda_day_no() - 1 order by x.day_no desc limit 1)
  ), 0)
$$;

create or replace function public.my_friend_streaks()
returns table (handle text, name text, state text, streak integer, you_today boolean, them_today boolean)
language sql stable security definer
set search_path = ''
as $$
  with mine as (
    select case when f.low = (select auth.uid()) then f.high else f.low end as other, f.asked_by, f.start_day, f.created_at
    from public.friend_streaks f
    where (select auth.uid()) in (f.low, f.high)
  )
  select pr.handle, pr.name,
         case when m.start_day is not null then 'active' when m.asked_by = (select auth.uid()) then 'outgoing' else 'incoming' end as state,
         case when m.start_day is null then 0 else public.pair_streak((select auth.uid()), m.other, m.start_day) end as streak,
         exists (select 1 from public.checked_days((select auth.uid())) as d(day_no) where d.day_no = public.fignda_day_no()) as you_today,
         exists (select 1 from public.checked_days(m.other) as d(day_no) where d.day_no = public.fignda_day_no()) as them_today
  from mine m
  join public.profiles pr on pr.id = m.other
  order by (m.start_day is null), 4 desc, m.created_at
$$;

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------

-- A reminder is for a player who has not played today: no daily, no step, no clue.
create or replace function public.claim_due_reminders()
returns table (endpoint text)
language sql security definer
set search_path = ''
as $$
  update public.push_subs s
  set last_day = public.fignda_day_no()
  where s.last_day < public.fignda_day_no()
    and extract(hour from now() at time zone s.tz)::integer = s.hour
    and not exists (
      select 1 from public.played_days(s.user_id) as d(day_no) where d.day_no = public.fignda_day_no()
    )
  returning s.endpoint
$$;

create or replace function public.reminder_context(p_endpoint text)
returns table (streak integer, friend text, invite_from text, invite_game text, invite_room text)
language sql stable security definer
set search_path = ''
as $$
  select public.own_streak(s.user_id),
         (select pr.name
          from public.friend_streaks f
          join public.profiles pr on pr.id = case when f.low = s.user_id then f.high else f.low end
          where s.user_id in (f.low, f.high) and f.start_day is not null
            and exists (select 1 from public.checked_days(pr.id) as d(day_no) where d.day_no = public.fignda_day_no())
          order by public.pair_streak(f.low, f.high, f.start_day) desc
          limit 1),
         inv.name, inv.game_id, inv.room_code
  from public.push_subs s
  left join lateral (
    select pr.name, i.game_id, i.room_code
    from public.game_invites i
    join public.profiles pr on pr.id = i.from_id
    where i.to_id = s.user_id and i.created_at > now() - interval '30 minutes'
    order by i.created_at desc
    limit 1
  ) inv on true
  where s.endpoint = p_endpoint
$$;
