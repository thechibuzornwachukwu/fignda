-- Circles: a private daily table for a family, class, church or office. Joined by a link.
-- Default deny on both tables; every read and write goes through the functions below.
-- A circle only ever shows verified plays that are already public (plays_public), so a leaked code
-- reveals nothing private: at worst a stranger joins and sees the same scores the leaderboard shows.

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name text not null check (char_length(name) between 2 and 40 and name !~ '[<>[:cntrl:]]'),
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user on public.circle_members (user_id);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
revoke all on public.circles from anon, authenticated;
revoke all on public.circle_members from anon, authenticated;

-- 6 characters from an alphabet with no 0 O 1 I L.
create function public.new_circle_code()
returns text
language sql volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 31), 1), '')
  from (select extensions.gen_random_bytes(6) as b) r, generate_series(0, 5) as i
$$;

-- Create a circle and join it. Signed in players with a profile only. At most 20 circles each.
create function public.create_circle(p_name text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  clean text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  c text;
  cid uuid;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.circle_members where user_id = me) >= 20 then
    raise exception 'circle limit' using errcode = 'P0001';
  end if;
  for i in 1..5 loop
    c := public.new_circle_code();
    begin
      insert into public.circles (code, name, owner_id) values (c, clean, me) returning id into cid;
      exit;
    exception when unique_violation then
      cid := null;
    end;
  end loop;
  if cid is null then raise exception 'try again' using errcode = 'P0001'; end if;
  insert into public.circle_members (circle_id, user_id) values (cid, me);
  return c;
end;
$$;

-- What an invite link shows before you join: the name and how many are in. No member list.
create function public.circle_info(p_code text)
returns table (code text, name text, members bigint, is_member boolean, is_owner boolean)
language sql stable security definer
set search_path = ''
as $$
  select c.code, c.name,
         (select count(*) from public.circle_members m where m.circle_id = c.id),
         exists (select 1 from public.circle_members m where m.circle_id = c.id and m.user_id = (select auth.uid())),
         c.owner_id is not null and c.owner_id = (select auth.uid())
  from public.circles c
  where c.code = p_code
$$;

-- Join by code. At most 50 members a circle, 20 circles a player.
create function public.join_circle(p_code text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cid uuid;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select id into cid from public.circles where code = p_code for update;
  if cid is null then return false; end if;
  if exists (select 1 from public.circle_members where circle_id = cid and user_id = me) then return true; end if;
  if (select count(*) from public.circle_members where circle_id = cid) >= 50 then
    raise exception 'circle full' using errcode = 'P0001';
  end if;
  if (select count(*) from public.circle_members where user_id = me) >= 20 then
    raise exception 'circle limit' using errcode = 'P0001';
  end if;
  insert into public.circle_members (circle_id, user_id) values (cid, me);
  return true;
end;
$$;

-- Leave. The last one out closes the circle; an owner who leaves hands it to the longest standing member.
create function public.leave_circle(p_code text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cid uuid;
  own uuid;
begin
  select id, owner_id into cid, own from public.circles where code = p_code for update;
  if cid is null or me is null then return; end if;
  delete from public.circle_members where circle_id = cid and user_id = me;
  if not exists (select 1 from public.circle_members where circle_id = cid) then
    delete from public.circles where id = cid;
  elsif own = me then
    update public.circles set owner_id =
      (select user_id from public.circle_members where circle_id = cid order by joined_at, user_id limit 1)
    where id = cid;
  end if;
end;
$$;

-- The owner can remove a member (not themselves: they leave instead).
create function public.remove_circle_member(p_code text, p_handle text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cid uuid;
  them uuid;
begin
  select id into cid from public.circles where code = p_code and owner_id = me;
  if cid is null or me is null then return false; end if;
  select id into them from public.profiles where handle = p_handle;
  if them is null or them = me then return false; end if;
  delete from public.circle_members where circle_id = cid and user_id = them;
  return found;
end;
$$;

create function public.my_circles()
returns table (code text, name text, members bigint, is_owner boolean)
language sql stable security definer
set search_path = ''
as $$
  select c.code, c.name,
         (select count(*) from public.circle_members x where x.circle_id = c.id),
         c.owner_id is not null and c.owner_id = (select auth.uid())
  from public.circle_members m
  join public.circles c on c.id = m.circle_id
  where m.user_id = (select auth.uid())
  order by m.joined_at desc
$$;

-- Members only: one daily, ranked. Members who have not played come last with no score, so the table
-- says who is still to play.
create function public.circle_board(p_code text, p_day integer)
returns table (rank bigint, handle text, name text, score integer, secs integer, found smallint, total smallint)
language sql stable security definer
set search_path = ''
as $$
  with c as (
    select ci.id from public.circles ci
    where ci.code = p_code
      and exists (select 1 from public.circle_members m where m.circle_id = ci.id and m.user_id = (select auth.uid()))
  )
  select case when p.score is null then null
              else row_number() over (order by p.score desc nulls last, p.secs asc, p.created_at asc) end,
         pr.handle, pr.name, p.score, p.secs, p.found, p.total
  from c
  join public.circle_members m on m.circle_id = c.id
  join public.profiles pr on pr.id = m.user_id
  left join public.plays_public p on p.handle = pr.handle and p.day_no = p_day and p_day <= public.fignda_day_no()
  order by p.score desc nulls last, p.secs asc, pr.handle
$$;

-- Members only: the last 7 dailies added up. Days played breaks ties, then the handle.
create function public.circle_week(p_code text)
returns table (rank bigint, handle text, name text, score bigint, days bigint)
language sql stable security definer
set search_path = ''
as $$
  with c as (
    select ci.id from public.circles ci
    where ci.code = p_code
      and exists (select 1 from public.circle_members m where m.circle_id = ci.id and m.user_id = (select auth.uid()))
  ), t as (
    select pr.handle, pr.name, coalesce(sum(p.score), 0)::bigint as score, count(p.id) as days
    from c
    join public.circle_members m on m.circle_id = c.id
    join public.profiles pr on pr.id = m.user_id
    left join public.plays_public p on p.handle = pr.handle
      and p.day_no > public.fignda_day_no() - 7 and p.day_no <= public.fignda_day_no()
    group by pr.handle, pr.name
  )
  select row_number() over (order by t.score desc, t.days desc, t.handle), t.handle, t.name, t.score, t.days
  from t
  order by 1
$$;

revoke execute on function public.new_circle_code() from public, anon, authenticated;
revoke execute on function public.create_circle(text) from public, anon, authenticated;
revoke execute on function public.circle_info(text) from public, anon, authenticated;
revoke execute on function public.join_circle(text) from public, anon, authenticated;
revoke execute on function public.leave_circle(text) from public, anon, authenticated;
revoke execute on function public.remove_circle_member(text, text) from public, anon, authenticated;
revoke execute on function public.my_circles() from public, anon, authenticated;
revoke execute on function public.circle_board(text, integer) from public, anon, authenticated;
revoke execute on function public.circle_week(text) from public, anon, authenticated;
grant execute on function public.circle_info(text) to anon, authenticated;
grant execute on function public.create_circle(text) to authenticated;
grant execute on function public.join_circle(text) to authenticated;
grant execute on function public.leave_circle(text) to authenticated;
grant execute on function public.remove_circle_member(text, text) to authenticated;
grant execute on function public.my_circles() to authenticated;
grant execute on function public.circle_board(text, integer) to authenticated;
grant execute on function public.circle_week(text) to authenticated;
