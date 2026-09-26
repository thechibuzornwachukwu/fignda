-- Community: one-way follows and player discovery. Everything public is built from verified plays.

-- ---------------------------------------------------------------------------
-- follows. You follow and unfollow as yourself only; you may remove your own followers.
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on public.follows (followee_id);

alter table public.follows enable row level security;

create policy "follows: anyone reads" on public.follows for select to anon, authenticated using (true);
create policy "follows: follow as yourself" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "follows: unfollow or remove a follower" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

grant select on public.follows to anon, authenticated;
grant insert (follower_id, followee_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- Only real players can be followed, and nobody follows more than 2000 people.
create function public.follows_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.followee_id) then
    raise exception 'No such player.' using errcode = '23503';
  end if;
  if (select count(*) from public.follows where follower_id = new.follower_id) >= 2000 then
    raise exception 'Following limit reached.' using errcode = '54000';
  end if;
  return new;
end
$$;

create trigger follows_guard before insert on public.follows
  for each row execute function public.follows_guard();

-- Prefix search on handles.
create index if not exists profiles_handle_prefix on public.profiles (handle text_pattern_ops);
create index if not exists profiles_created on public.profiles (created_at desc);

-- ---------------------------------------------------------------------------
-- Streaks from verified daily plays: runs of consecutive days (gaps and islands).
-- ---------------------------------------------------------------------------
create function public.verified_streaks()
returns table (user_id uuid, current_streak integer, best_streak integer, dailies bigint, perfect bigint)
language sql stable
set search_path = ''
as $$
  with days as (
    select distinct p.user_id, p.day_no
    from public.plays p
    where p.verified and p.day_no is not null and p.day_no <= public.fignda_day_no()
  ),
  islands as (
    select d.user_id, d.day_no, d.day_no - row_number() over (partition by d.user_id order by d.day_no) as grp
    from days d
  ),
  runs as (
    select i.user_id, count(*)::integer as len, max(i.day_no) as last_day
    from islands i
    group by i.user_id, i.grp
  )
  select r.user_id,
         coalesce(max(r.len) filter (where r.last_day >= public.fignda_day_no() - 1), 0)::integer as current_streak,
         max(r.len)::integer as best_streak,
         (select count(distinct day_no) from public.plays x where x.user_id = r.user_id and x.verified and x.day_no is not null) as dailies,
         (select count(*) from public.plays x where x.user_id = r.user_id and x.verified and x.day_no < public.fignda_day_no() and x.found = x.total) as perfect
  from runs r
  group by r.user_id
$$;
-- Internal: exposes user ids. Only the functions below (which return handles) may call it.
revoke execute on function public.verified_streaks() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public read functions. Handles and names only, never ids or emails.
-- ---------------------------------------------------------------------------
create function public.profile_summary(p_handle text)
returns table (handle text, name text, created_at timestamptz, current_streak integer, best_streak integer,
               dailies bigint, perfect bigint, followers bigint, following bigint)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name, pr.created_at,
         coalesce(s.current_streak, 0), coalesce(s.best_streak, 0), coalesce(s.dailies, 0), coalesce(s.perfect, 0),
         (select count(*) from public.follows f where f.followee_id = pr.id),
         (select count(*) from public.follows f where f.follower_id = pr.id)
  from public.profiles pr
  left join public.verified_streaks() s on s.user_id = pr.id
  where p_handle ~ '^[a-z0-9._]{2,20}$' and pr.handle = p_handle
$$;

-- Lists of who follows whom, by handle.
create function public.followers_of(p_handle text, p_limit integer default 50)
returns table (handle text, name text)
language sql stable security definer
set search_path = ''
as $$
  select fp.handle, fp.name
  from public.profiles pr
  join public.follows f on f.followee_id = pr.id
  join public.profiles fp on fp.id = f.follower_id
  where pr.handle = p_handle
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

create function public.following_of(p_handle text, p_limit integer default 50)
returns table (handle text, name text)
language sql stable security definer
set search_path = ''
as $$
  select tp.handle, tp.name
  from public.profiles pr
  join public.follows f on f.follower_id = pr.id
  join public.profiles tp on tp.id = f.followee_id
  where pr.handle = p_handle
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- Today's (or any past) daily among you and the people you follow.
create function public.following_board(p_day integer, p_limit integer default 50)
returns table (rank bigint, handle text, score integer, secs integer, found smallint, total smallint)
language sql stable security definer
set search_path = ''
as $$
  with circle as (
    select (select auth.uid()) as id
    union
    select f.followee_id from public.follows f where f.follower_id = (select auth.uid())
  )
  select row_number() over (order by p.score desc, p.secs asc, p.created_at asc) as rank,
         pp.handle, p.score, p.secs, p.found, p.total
  from public.plays_public p
  join public.profiles pp on pp.handle = p.handle
  where p.day_no = p_day and p_day <= public.fignda_day_no() and pp.id in (select id from circle)
  order by rank
  limit least(greatest(p_limit, 1), 200)
$$;

-- Prefix search. Only the handle alphabet, so no wildcards get through.
create function public.players_search(p_prefix text, p_limit integer default 20)
returns table (handle text, name text)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name
  from public.profiles pr
  where lower(p_prefix) ~ '^[a-z0-9._]{1,20}$'
    and pr.handle like lower(p_prefix) || '%'
  order by pr.handle
  limit least(greatest(p_limit, 1), 50)
$$;

create function public.players_top(p_kind text, p_limit integer default 10)
returns table (handle text, name text, value bigint)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name,
         case p_kind when 'streak' then s.current_streak::bigint else s.perfect end as value
  from public.verified_streaks() s
  join public.profiles pr on pr.id = s.user_id
  where p_kind in ('streak', 'perfect')
    and (case p_kind when 'streak' then s.current_streak::bigint else s.perfect end) > 0
  order by value desc, pr.handle
  limit least(greatest(p_limit, 1), 50)
$$;

-- New players this week who have at least one verified play (no empty sign-ups).
create function public.players_new(p_limit integer default 10)
returns table (handle text, name text, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select pr.handle, pr.name, pr.created_at
  from public.profiles pr
  where pr.created_at > now() - interval '7 days'
    and exists (select 1 from public.plays p where p.user_id = pr.id and p.verified)
  order by pr.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- New functions are executable by PUBLIC unless revoked. Revoke everything, then grant exactly what is meant.
revoke execute on function public.follows_guard() from public, anon, authenticated;
revoke execute on function public.profile_summary(text) from public, anon, authenticated;
revoke execute on function public.followers_of(text, integer) from public, anon, authenticated;
revoke execute on function public.following_of(text, integer) from public, anon, authenticated;
revoke execute on function public.following_board(integer, integer) from public, anon, authenticated;
revoke execute on function public.players_search(text, integer) from public, anon, authenticated;
revoke execute on function public.players_top(text, integer) from public, anon, authenticated;
revoke execute on function public.players_new(integer) from public, anon, authenticated;
grant execute on function public.profile_summary(text) to anon, authenticated;
grant execute on function public.followers_of(text, integer) to anon, authenticated;
grant execute on function public.following_of(text, integer) to anon, authenticated;
grant execute on function public.following_board(integer, integer) to authenticated;
grant execute on function public.players_search(text, integer) to anon, authenticated;
grant execute on function public.players_top(text, integer) to anon, authenticated;
grant execute on function public.players_new(integer) to anon, authenticated;
