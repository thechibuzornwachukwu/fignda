-- Leagues (BUILD_PLAN set 3g). Tables of up to 20, 5 tiers (Bronze, Silver, Gold, Jade, Onyx: LEAGUE_TIERS in
-- src/lib/league.ts), a week from Monday 00:00 UTC. Weekly points come only from first clears: the first checked
-- play of a whole puzzle, and the first time a clue is kept, so replaying on Sunday night earns nothing. When a
-- week ends the top 5 of each table go up a tier (with points to show for it) and the bottom 5 go down, but nobody goes down in a table of
-- fewer than 5. A player can leave, and join again. Clients read and act only through the functions below.

create table public.league_players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier smallint not null default 0 check (tier between 0 and 4),
  left_at timestamptz
);

create table public.league_seats (
  week date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  tier smallint not null check (tier between 0 and 4),
  table_no integer not null check (table_no >= 1),
  joined_at timestamptz not null default now(),
  primary key (week, user_id)
);
create index league_seats_table on public.league_seats (week, tier, table_no);

create table public.league_weeks (
  week date primary key,
  closed_at timestamptz not null default now()
);

alter table public.league_players enable row level security;
alter table public.league_seats enable row level security;
alter table public.league_weeks enable row level security;

-- The Monday a moment falls in, UTC.
create function public.league_week(p_at timestamptz)
returns date
language sql immutable
set search_path = ''
as $$
  select (date_trunc('week', p_at at time zone 'UTC'))::date
$$;

-- A player's points in a week: first clears only.
create function public.league_points(p_user uuid, p_week date)
returns bigint
language sql stable
set search_path = ''
as $$
  select coalesce(sum(t.score), 0)::bigint from (
    select p.score from public.plays p
    where p.user_id = p_user and p.verified and p.day_no is null
      and public.league_week(p.created_at) = p_week
      and p.created_at = (select min(q.created_at) from public.plays q where q.user_id = p.user_id and q.game_id = p.game_id and q.verified)
    union all
    select c.score from public.clue_plays c
    where c.user_id = p_user and c.verified and public.league_week(c.created_at) = p_week
  ) t
$$;

-- The caller's table this week, seated on first look. Empty for a guest and for a player who left.
create function public.my_league()
returns table (place integer, handle text, name text, points bigint, me boolean, tier smallint, players integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  w date := public.league_week(now());
  t smallint;
  tab integer;
begin
  if uid is null then return; end if;
  insert into public.league_players (user_id) values (uid) on conflict do nothing;
  if exists (select 1 from public.league_players lp where lp.user_id = uid and lp.left_at is not null) then return; end if;

  select s.tier, s.table_no into t, tab from public.league_seats s where s.week = w and s.user_id = uid;
  if tab is null then
    select lp.tier into t from public.league_players lp where lp.user_id = uid;
    select s.table_no into tab from public.league_seats s
    where s.week = w and s.tier = t group by s.table_no having count(*) < 20 order by s.table_no limit 1;
    if tab is null then
      select coalesce(max(s.table_no), 0) + 1 into tab from public.league_seats s where s.week = w and s.tier = t;
    end if;
    insert into public.league_seats (week, user_id, tier, table_no) values (w, uid, t, tab) on conflict do nothing;
  end if;

  return query
  with seated as (
    select s.user_id, s.joined_at, public.league_points(s.user_id, w) as pts
    from public.league_seats s
    where s.week = w and s.tier = t and s.table_no = tab
  )
  select (row_number() over (order by x.pts desc, x.joined_at))::integer, pr.handle, pr.name, x.pts, x.user_id = uid, t,
         (count(*) over ())::integer
  from seated x join public.profiles pr on pr.id = x.user_id
  order by 1;
end
$$;

create function public.leave_league()
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.league_players (user_id, left_at) values ((select auth.uid()), now())
  on conflict (user_id) do update set left_at = now();
  delete from public.league_seats where user_id = (select auth.uid()) and week = public.league_week(now());
$$;

create function public.join_league()
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.league_players (user_id) values ((select auth.uid()))
  on conflict (user_id) do update set left_at = null;
$$;

-- Every week that has ended and is not closed yet: up and down, once. Run by the Worker's hourly job.
create function public.close_league_weeks()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  w date;
  n integer := 0;
begin
  for w in
    select distinct s.week from public.league_seats s
    where s.week < public.league_week(now()) and not exists (select 1 from public.league_weeks lw where lw.week = s.week)
    order by s.week
  loop
    with scored as (
      select s.user_id, s.tier, s.table_no, s.joined_at, public.league_points(s.user_id, w) as pts
      from public.league_seats s where s.week = w
    ),
    ranked as (
      select x.user_id, x.tier, x.pts,
             row_number() over (partition by x.tier, x.table_no order by x.pts desc, x.joined_at) as place,
             count(*) over (partition by x.tier, x.table_no) as players
      from scored x
    )
    update public.league_players lp
    set tier = case
      when r.place <= 5 and r.pts > 0 then least(r.tier + 1, 4)
      when r.players >= 5 and r.place > 5 and r.place > r.players - 5 then greatest(r.tier - 1, 0)
      else r.tier end
    from ranked r where lp.user_id = r.user_id;
    insert into public.league_weeks (week) values (w) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end
$$;

revoke execute on function public.league_week(timestamptz) from public, anon, authenticated;
revoke execute on function public.league_points(uuid, date) from public, anon, authenticated;
revoke execute on function public.my_league() from public, anon;
revoke execute on function public.leave_league() from public, anon;
revoke execute on function public.join_league() from public, anon;
revoke execute on function public.close_league_weeks() from public, anon, authenticated;
grant execute on function public.my_league() to authenticated;
grant execute on function public.leave_league() to authenticated;
grant execute on function public.join_league() to authenticated;
grant execute on function public.close_league_weeks() to service_role;
