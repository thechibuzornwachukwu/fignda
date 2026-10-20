-- Your People: one feed. Medals lately won by you, the people you follow, or the 50 top scorers, and cheers on
-- them. Badges are already public on every profile, so the feed shows nothing new, only gathers it. A cheer tells
-- the medal's owner, through the notifications they already have.

create table public.cheers (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9_]{2,30}$'),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, code),
  check (from_id <> to_id)
);

create index cheers_to on public.cheers (to_id, code);

alter table public.cheers enable row level security;
-- No policies and no grants: read and written through the functions below.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('follow', 'streak_ask', 'streak_start', 'room_invite', 'nudge', 'badge', 'cheer'));

-- First game is left out: everyone has it. 'friends' is you and the people you follow.
create function public.squad_feed(p_scope text, p_limit integer default 20)
returns table (handle text, name text, code text, earned_at timestamptz, cheers integer, cheered boolean, mine boolean)
language sql stable security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  who as (
    select f.followee_id as id from public.follows f, me
    where p_scope = 'friends' and f.follower_id = me.id
    union
    select me.id from me where p_scope = 'friends' and me.id is not null
    union
    select t.user_id from (select pp.user_id from public.player_points() pp order by pp.points desc limit 50) t
    where p_scope = 'world'
  )
  select pr.handle, pr.name, b.code, b.earned_at,
         (select count(*)::integer from public.cheers c where c.to_id = b.user_id and c.code = b.code),
         exists (select 1 from public.cheers c, me where c.from_id = me.id and c.to_id = b.user_id and c.code = b.code),
         b.user_id = (select id from me)
  from public.badges b
  join who on who.id = b.user_id
  join public.profiles pr on pr.id = b.user_id
  where b.code <> 'first_game' and b.earned_at > now() - interval '30 days'
  order by b.earned_at desc, pr.handle
  limit least(greatest(p_limit, 1), 50)
$$;

-- Cheer a medal, or take the cheer back. Only a medal the player has, never your own. Returns the new count.
create function public.cheer(p_handle text, p_code text, p_on boolean)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  them uuid;
begin
  if me is null then
    raise exception 'sign in to cheer' using errcode = '42501';
  end if;
  select pr.id into them from public.profiles pr where pr.handle = lower(p_handle);
  if them is null or them = me or not exists (select 1 from public.badges b where b.user_id = them and b.code = p_code) then
    raise exception 'nothing to cheer' using errcode = '22023';
  end if;
  if p_on then
    insert into public.cheers (from_id, to_id, code) values (me, them, p_code) on conflict do nothing;
    if found then
      perform public.notify(them, 'cheer', me, jsonb_build_object('code', p_code));
    end if;
  else
    delete from public.cheers c where c.from_id = me and c.to_id = them and c.code = p_code;
  end if;
  return (select count(*)::integer from public.cheers c where c.to_id = them and c.code = p_code);
end
$$;

revoke execute on function public.squad_feed(text, integer) from public, anon, authenticated;
revoke execute on function public.cheer(text, text, boolean) from public, anon, authenticated;
grant execute on function public.squad_feed(text, integer) to anon, authenticated;
grant execute on function public.cheer(text, text, boolean) to authenticated;
