-- Notifications and badges. Things that happen to a player while they are away: a new follower, a streak ask,
-- a streak starting, a room invite, a nudge, a badge earned. Written by triggers on the tables where those
-- things happen, so no client can invent one. Read and cleared through functions; own rows only.

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('follow', 'streak_ask', 'streak_start', 'room_invite', 'nudge', 'badge')),
  -- The other player, when there is one. Gone with their account.
  actor_id uuid references auth.users (id) on delete cascade,
  -- Small extras: the badge code, or the game and room of an invite.
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
-- No policies and no grants.

-- Badges: earned once, kept for good. Shown on the profile.
create table public.badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9_]{2,30}$'),
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.badges enable row level security;

-- One notification. The same thing from the same player within a day is not repeated (follow, unfollow, follow).
create function public.notify(p_user uuid, p_kind text, p_actor uuid, p_data jsonb default '{}'::jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  if exists (
    select 1 from public.notifications n
    where n.user_id = p_user and n.kind = p_kind and n.actor_id is not distinct from p_actor
      and n.data = p_data and n.created_at > now() - interval '1 day'
  ) then
    return;
  end if;
  insert into public.notifications (user_id, kind, actor_id, data) values (p_user, p_kind, p_actor, p_data);
  -- Keep the list short: the newest 100 per player.
  delete from public.notifications n
  where n.user_id = p_user
    and n.id not in (select x.id from public.notifications x where x.user_id = p_user order by x.created_at desc, x.id desc limit 100);
end
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.notify_follow()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.notify(new.followee_id, 'follow', new.follower_id);
  return new;
end
$$;

create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_follow();

create function public.notify_friend_streak()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  other uuid := case when new.asked_by = new.low then new.high else new.low end;
begin
  if tg_op = 'INSERT' and new.start_day is null then
    perform public.notify(other, 'streak_ask', new.asked_by);
  elsif new.start_day is not null and (tg_op = 'INSERT' or old.start_day is null) then
    -- The one who asked (or whose link it was) hears that it has started.
    perform public.notify(new.asked_by, 'streak_start', other);
  elsif tg_op = 'UPDATE' and new.low_nudged > old.low_nudged then
    perform public.notify(new.high, 'nudge', new.low, jsonb_build_object('day', new.low_nudged));
  elsif tg_op = 'UPDATE' and new.high_nudged > old.high_nudged then
    perform public.notify(new.low, 'nudge', new.high, jsonb_build_object('day', new.high_nudged));
  end if;
  return new;
end
$$;

create trigger friend_streaks_notify after insert or update on public.friend_streaks
  for each row execute function public.notify_friend_streak();

create function public.notify_game_invite()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.notify(
    new.to_id, 'room_invite', new.from_id,
    jsonb_build_object('game', new.game_id, 'room', new.room_code,
                       'title', (select g.title from public.games g where g.id = new.game_id))
  );
  return new;
end
$$;

create trigger game_invites_notify after insert on public.game_invites
  for each row execute function public.notify_game_invite();

-- Badges after a verified play: first game, first perfect daily, points and streak milestones.
create function public.award_badges()
returns trigger
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
  if not new.verified then
    return new;
  end if;

  select coalesce(sum(t.score), 0) into pts
  from (
    select p.score from public.plays p where p.user_id = new.user_id and p.verified and p.day_no is not null
    union all
    select max(p.score) from public.plays p where p.user_id = new.user_id and p.verified and p.day_no is null group by p.game_id
  ) t;
  foreach n in array array[1000, 5000, 10000, 25000, 50000, 100000] loop
    if pts >= n then earned := earned || ('points_' || n)::text; end if;
  end loop;

  if new.day_no is not null then
    if new.found = new.total then earned := earned || 'perfect_daily'::text; end if;
    run := public.own_streak(new.user_id);
    foreach n in array array[7, 30, 50, 100, 365] loop
      if run >= n then earned := earned || ('streak_' || n)::text; end if;
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

create trigger plays_badges after insert on public.plays
  for each row execute function public.award_badges();

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------
create function public.my_notifications(p_limit integer default 30)
returns table (id bigint, kind text, handle text, name text, data jsonb, created_at timestamptz, unread boolean)
language sql stable security definer
set search_path = ''
as $$
  select n.id, n.kind, pr.handle, pr.name, n.data, n.created_at, n.read_at is null
  from public.notifications n
  left join public.profiles pr on pr.id = n.actor_id
  where n.user_id = (select auth.uid())
  order by n.created_at desc, n.id desc
  limit least(greatest(p_limit, 1), 100)
$$;

create function public.unread_notifications()
returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer from public.notifications n where n.user_id = (select auth.uid()) and n.read_at is null
$$;

create function public.read_notifications()
returns void
language sql security definer
set search_path = ''
as $$
  update public.notifications set read_at = now() where user_id = (select auth.uid()) and read_at is null
$$;

-- A player's badges, oldest first. Public, like the rest of a profile.
create function public.badges_of(p_handle text)
returns table (code text, earned_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select b.code, b.earned_at
  from public.badges b
  join public.profiles pr on pr.id = b.user_id
  where p_handle ~ '^[a-z0-9._]{2,20}$' and pr.handle = p_handle
  order by b.earned_at, b.code
$$;

revoke execute on function public.notify(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_follow() from public, anon, authenticated;
revoke execute on function public.notify_friend_streak() from public, anon, authenticated;
revoke execute on function public.notify_game_invite() from public, anon, authenticated;
revoke execute on function public.award_badges() from public, anon, authenticated;
revoke execute on function public.my_notifications(integer) from public, anon, authenticated;
revoke execute on function public.unread_notifications() from public, anon, authenticated;
revoke execute on function public.read_notifications() from public, anon, authenticated;
revoke execute on function public.badges_of(text) from public, anon, authenticated;

grant execute on function public.my_notifications(integer) to authenticated;
grant execute on function public.unread_notifications() to authenticated;
grant execute on function public.read_notifications() to authenticated;
grant execute on function public.badges_of(text) to anon, authenticated;
