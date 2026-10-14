-- Streak reminders (web push) and friend streaks.

-- ---------------------------------------------------------------------------
-- push_subs. One row per browser that asked for the daily reminder. Own rows only.
-- The endpoint is a URL the Worker will call, so only the real push services are accepted.
-- ---------------------------------------------------------------------------
create table public.push_subs (
  endpoint text primary key
    check (char_length(endpoint) between 20 and 1000)
    check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- IANA zone, e.g. Africa/Lagos. The reminder goes out at `hour` on the player's own clock.
  tz text not null check (char_length(tz) between 1 and 64),
  hour smallint not null default 19 check (hour between 0 and 23),
  -- Last daily number a reminder was sent for. One reminder a day at most.
  last_day integer not null default 0,
  created_at timestamptz not null default now()
);

create index push_subs_user on public.push_subs (user_id);

alter table public.push_subs enable row level security;

create policy "push_subs: read own" on public.push_subs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subs: add own" on public.push_subs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_subs: change own" on public.push_subs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subs: remove own" on public.push_subs
  for delete to authenticated using (user_id = (select auth.uid()));

grant select (endpoint, tz, hour) on public.push_subs to authenticated;
grant insert (endpoint, tz, hour) on public.push_subs to authenticated;
grant update (tz, hour) on public.push_subs to authenticated;
grant delete on public.push_subs to authenticated;

-- A real time zone, and no more than 5 browsers per player.
create function public.push_subs_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.tz) then
    raise exception 'Unknown time zone.' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.push_subs where user_id = new.user_id) >= 5 then
    raise exception 'Reminder limit reached.' using errcode = '54000';
  end if;
  return new;
end
$$;

create trigger push_subs_guard before insert or update on public.push_subs
  for each row execute function public.push_subs_guard();

-- Days in a row a player has played, ending today or yesterday. Every stored daily counts (it is their own view).
create function public.own_streak(p_user uuid)
returns integer
language sql stable
set search_path = ''
as $$
  with d as (
    select distinct p.day_no from public.plays p
    where p.user_id = p_user and p.day_no is not null and p.day_no <= public.fignda_day_no()
  ),
  r as (select d.day_no, d.day_no - row_number() over (order by d.day_no) as grp from d)
  select coalesce((
    select count(*)::integer from r
    where r.grp = (select x.grp from r x where x.day_no >= public.fignda_day_no() - 1 order by x.day_no desc limit 1)
  ), 0)
$$;

-- Worker cron, hourly: the browsers whose reminder hour is now and whose player has not played today.
-- Marks them as sent in the same statement, so two runs never send twice.
create function public.claim_due_reminders()
returns table (endpoint text)
language sql security definer
set search_path = ''
as $$
  update public.push_subs s
  set last_day = public.fignda_day_no()
  where s.last_day < public.fignda_day_no()
    and extract(hour from now() at time zone s.tz)::integer = s.hour
    and not exists (
      select 1 from public.plays p where p.user_id = s.user_id and p.day_no = public.fignda_day_no()
    )
  returning s.endpoint
$$;

-- ---------------------------------------------------------------------------
-- Friend streaks. Two players, one streak: it grows on each day both play the daily.
-- Asked by one, accepted by the other. Up to 5 running per player. Read and changed through functions only.
-- ---------------------------------------------------------------------------
create table public.friend_streaks (
  low uuid not null references auth.users (id) on delete cascade,
  high uuid not null references auth.users (id) on delete cascade,
  asked_by uuid not null,
  -- Null until accepted. Days before it never count.
  start_day integer,
  created_at timestamptz not null default now(),
  primary key (low, high),
  check (low < high),
  check (asked_by in (low, high))
);

create index friend_streaks_high on public.friend_streaks (high);

alter table public.friend_streaks enable row level security;
-- No policies and no grants.

-- Days in a row both players have a verified daily, from the day they started, ending today or yesterday.
create function public.pair_streak(a uuid, b uuid, p_start integer)
returns integer
language sql stable
set search_path = ''
as $$
  with d as (
    select distinct x.day_no
    from public.plays x
    join public.plays y on y.day_no = x.day_no
    where x.user_id = a and y.user_id = b and x.verified and y.verified
      and x.day_no >= p_start and x.day_no <= public.fignda_day_no()
  ),
  r as (select d.day_no, d.day_no - row_number() over (order by d.day_no) as grp from d)
  select coalesce((
    select count(*)::integer from r
    where r.grp = (select x.grp from r x where x.day_no >= public.fignda_day_no() - 1 order by x.day_no desc limit 1)
  ), 0)
$$;

create function public.friend_streak_count(p_user uuid)
returns bigint
language sql stable
set search_path = ''
as $$
  select count(*) from public.friend_streaks f where p_user in (f.low, f.high) and f.start_day is not null
$$;

-- Ask a player to start a streak. If they already asked you, this starts it. Returns 'asked', 'started' or 'exists'.
create function public.friend_streak_ask(p_handle text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  lo uuid;
  hi uuid;
  cur public.friend_streaks%rowtype;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = me) then
    raise exception 'Finish your profile first.' using errcode = '42501';
  end if;
  select id into them from public.profiles where handle = p_handle;
  if them is null or them = me then
    raise exception 'No such player.' using errcode = '23503';
  end if;
  lo := least(me, them);
  hi := greatest(me, them);
  select * into cur from public.friend_streaks where low = lo and high = hi;

  if found then
    if cur.start_day is not null or cur.asked_by = me then
      return 'exists';
    end if;
    -- They asked first: asking back is a yes.
    if public.friend_streak_count(me) >= 5 or public.friend_streak_count(them) >= 5 then
      raise exception 'streak limit' using errcode = '54000';
    end if;
    update public.friend_streaks set start_day = public.fignda_day_no() where low = lo and high = hi;
    return 'started';
  end if;

  if public.friend_streak_count(me) >= 5 then
    raise exception 'streak limit' using errcode = '54000';
  end if;
  if (select count(*) from public.friend_streaks f where f.asked_by = me and f.start_day is null) >= 10 then
    raise exception 'ask limit' using errcode = '54000';
  end if;
  insert into public.friend_streaks (low, high, asked_by) values (lo, hi, me);
  return 'asked';
end
$$;

-- End a streak, take back an ask, or say no to one.
create function public.friend_streak_end(p_handle text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  n integer;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select id into them from public.profiles where handle = p_handle;
  if them is null then
    return false;
  end if;
  delete from public.friend_streaks where low = least(me, them) and high = greatest(me, them);
  get diagnostics n = row_count;
  return n > 0;
end
$$;

-- Your friend streaks: running ones first (longest on top), then asks waiting on you, then asks you sent.
create function public.my_friend_streaks()
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
         exists (select 1 from public.plays p where p.user_id = (select auth.uid()) and p.verified and p.day_no = public.fignda_day_no()) as you_today,
         exists (select 1 from public.plays p where p.user_id = m.other and p.verified and p.day_no = public.fignda_day_no()) as them_today
  from mine m
  join public.profiles pr on pr.id = m.other
  order by (m.start_day is null), 4 desc, m.created_at
$$;

-- What the reminder should say for one browser. Worker only: the endpoint is all the service worker knows.
create function public.reminder_context(p_endpoint text)
returns table (streak integer, friend text)
language sql stable security definer
set search_path = ''
as $$
  select public.own_streak(s.user_id),
         (select pr.name
          from public.friend_streaks f
          join public.profiles pr on pr.id = case when f.low = s.user_id then f.high else f.low end
          where s.user_id in (f.low, f.high) and f.start_day is not null
            and exists (select 1 from public.plays p where p.user_id = pr.id and p.verified and p.day_no = public.fignda_day_no())
          order by public.pair_streak(f.low, f.high, f.start_day) desc
          limit 1)
  from public.push_subs s
  where s.endpoint = p_endpoint
$$;

revoke execute on function public.push_subs_guard() from public, anon, authenticated;
revoke execute on function public.own_streak(uuid) from public, anon, authenticated;
revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
revoke execute on function public.pair_streak(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.friend_streak_count(uuid) from public, anon, authenticated;
revoke execute on function public.friend_streak_ask(text) from public, anon, authenticated;
revoke execute on function public.friend_streak_end(text) from public, anon, authenticated;
revoke execute on function public.my_friend_streaks() from public, anon, authenticated;
revoke execute on function public.reminder_context(text) from public, anon, authenticated;

grant execute on function public.claim_due_reminders() to service_role;
grant execute on function public.reminder_context(text) to service_role;
grant execute on function public.friend_streak_ask(text) to authenticated;
grant execute on function public.friend_streak_end(text) to authenticated;
grant execute on function public.my_friend_streaks() to authenticated;
