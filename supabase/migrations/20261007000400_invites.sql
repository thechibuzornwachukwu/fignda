-- Invites: a link that starts a friend streak, a nudge to a streak friend, and inviting a player you follow
-- into a room. Everything is reached through functions; the tables themselves are closed to clients.

-- ---------------------------------------------------------------------------
-- Streak links. One reusable link per player. Whoever opens it and says yes starts a streak with them at once:
-- sending the link was the ask, so there is no second step.
-- ---------------------------------------------------------------------------
create table public.streak_links (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.streak_links enable row level security;

create function public.new_streak_code()
returns text
language sql volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 31), 1), '')
  from (select extensions.gen_random_bytes(8) as b) r, generate_series(0, 7) as i
$$;

-- Your link's code. Made the first time you ask.
create function public.my_streak_link()
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  c text;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select code into c from public.streak_links where user_id = me;
  if c is null then
    c := public.new_streak_code();
    insert into public.streak_links (code, user_id) values (c, me);
  end if;
  return c;
end
$$;

-- Who a link is from. Anyone may look: the invite page shows it before sign in.
create function public.streak_link_info(p_code text)
returns table (handle text, name text)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name
  from public.streak_links l
  join public.profiles pr on pr.id = l.user_id
  where p_code ~ '^[A-HJ-NP-Z2-9]{8}$' and l.code = p_code
$$;

-- Say yes to a link. Returns 'started', 'exists' (already running) or 'self'.
create function public.friend_streak_join(p_code text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  lo uuid;
  hi uuid;
  running boolean;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select user_id into them from public.streak_links where code = p_code;
  if them is null then
    raise exception 'No such link.' using errcode = '23503';
  end if;
  if them = me then
    return 'self';
  end if;
  lo := least(me, them);
  hi := greatest(me, them);
  select start_day is not null into running from public.friend_streaks where low = lo and high = hi;
  if running then
    return 'exists';
  end if;
  if public.friend_streak_count(me) >= 5 or public.friend_streak_count(them) >= 5 then
    raise exception 'streak limit' using errcode = '54000';
  end if;
  insert into public.friend_streaks (low, high, asked_by, start_day)
  values (lo, hi, them, public.fignda_day_no())
  on conflict (low, high) do update set start_day = excluded.start_day;
  return 'started';
end
$$;

-- ---------------------------------------------------------------------------
-- Nudges. Once you have played, you can nudge a streak friend who has not: one a day per friend.
-- Worker only (it sends the push). Returns the friend's browsers.
-- ---------------------------------------------------------------------------
alter table public.friend_streaks add column low_nudged integer not null default 0;
alter table public.friend_streaks add column high_nudged integer not null default 0;

create function public.claim_nudge(p_user uuid, p_handle text)
returns table (endpoint text)
language plpgsql security definer
set search_path = ''
as $$
declare
  them uuid;
  today integer := public.fignda_day_no();
  n integer;
begin
  select id into them from public.profiles where handle = p_handle;
  if them is null or them = p_user then
    raise exception 'no streak' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.friend_streaks f
    where f.low = least(p_user, them) and f.high = greatest(p_user, them) and f.start_day is not null
  ) then
    raise exception 'no streak' using errcode = '23503';
  end if;
  if not exists (select 1 from public.plays p where p.user_id = p_user and p.verified and p.day_no = today) then
    raise exception 'play first' using errcode = '22023';
  end if;
  if exists (select 1 from public.plays p where p.user_id = them and p.day_no = today) then
    raise exception 'already played' using errcode = '22023';
  end if;
  -- Mark the nudge on the nudger's side of the pair. Nothing changes if it was already sent today.
  update public.friend_streaks f
  set low_nudged = case when f.low = p_user then today else f.low_nudged end,
      high_nudged = case when f.high = p_user then today else f.high_nudged end
  where f.low = least(p_user, them) and f.high = greatest(p_user, them) and f.start_day is not null
    and (case when f.low = p_user then f.low_nudged else f.high_nudged end) < today;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'already nudged' using errcode = '54000';
  end if;
  return query select s.endpoint from public.push_subs s where s.user_id = them;
end
$$;

-- ---------------------------------------------------------------------------
-- Game invites. Ask a player you follow into your room. They see it on the games screen for an hour.
-- A push goes out only when they follow you back, so strangers cannot buzz anyone's phone.
-- ---------------------------------------------------------------------------
create table public.game_invites (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  room_code text not null check (room_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, room_code),
  check (from_id <> to_id)
);

create index game_invites_to on public.game_invites (to_id, created_at desc);

alter table public.game_invites enable row level security;

-- Worker only. Stores the invite and returns the browsers to push to (none unless they follow you back).
create function public.claim_invite(p_user uuid, p_handle text, p_game text, p_room text)
returns table (endpoint text)
language plpgsql security definer
set search_path = ''
as $$
declare
  them uuid;
begin
  select id into them from public.profiles where handle = p_handle;
  if them is null or them = p_user
     or not exists (select 1 from public.follows f where f.follower_id = p_user and f.followee_id = them) then
    raise exception 'not following' using errcode = '42501';
  end if;
  if not exists (select 1 from public.games g where g.id = p_game) then
    raise exception 'no game' using errcode = '23503';
  end if;
  insert into public.game_invites (from_id, to_id, game_id, room_code) values (p_user, them, p_game, p_room);
  -- Old invites are no use to anyone.
  delete from public.game_invites where created_at < now() - interval '1 day';
  return query
    select s.endpoint from public.push_subs s
    where s.user_id = them
      and exists (select 1 from public.follows f where f.follower_id = them and f.followee_id = p_user);
end
$$;

-- Invites to you from the last hour, newest first.
create function public.my_game_invites()
returns table (handle text, name text, game_id text, title text, room_code text, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name, i.game_id, g.title, i.room_code, i.created_at
  from public.game_invites i
  join public.profiles pr on pr.id = i.from_id
  join public.games g on g.id = i.game_id
  where i.to_id = (select auth.uid()) and i.created_at > now() - interval '1 hour'
  order by i.created_at desc
  limit 10
$$;

-- What the reminder should say now also knows about a fresh invite (last 30 minutes).
drop function public.reminder_context(text);
create function public.reminder_context(p_endpoint text)
returns table (streak integer, friend text, invite_from text, invite_game text, invite_room text)
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

revoke execute on function public.new_streak_code() from public, anon, authenticated;
revoke execute on function public.my_streak_link() from public, anon, authenticated;
revoke execute on function public.streak_link_info(text) from public, anon, authenticated;
revoke execute on function public.friend_streak_join(text) from public, anon, authenticated;
revoke execute on function public.claim_nudge(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_invite(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.my_game_invites() from public, anon, authenticated;
revoke execute on function public.reminder_context(text) from public, anon, authenticated;

grant execute on function public.my_streak_link() to authenticated;
grant execute on function public.streak_link_info(text) to anon, authenticated;
grant execute on function public.friend_streak_join(text) to authenticated;
grant execute on function public.my_game_invites() to authenticated;
grant execute on function public.claim_nudge(uuid, text) to service_role;
grant execute on function public.claim_invite(uuid, text, text, text) to service_role;
grant execute on function public.reminder_context(text) to service_role;
