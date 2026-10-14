-- Partners (BUILD_PLAN 3g, SPEC section 5). The detectives who work a case beside the player: which ones a
-- player holds, and which one is beside them now.
--
-- The first partner is free. Each further one opens at a threshold of lifetime points, which are never spent.
-- The thresholds are checked here, not in the browser, because points for a partner will one day be sold:
-- nothing a client sends can take a partner it has not earned.
-- `src/engine/partners.test.ts` fails if these numbers and the engine's drift apart.

create table public.player_partners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current text not null check (current in ('cat', 'dino', 'dog')),
  owned text[] not null check (cardinality(owned) between 1 and 3 and owned <@ array['cat', 'dino', 'dog']),
  updated_at timestamptz not null default now(),
  check (current = any (owned))
);

-- No policies and no grants: read through my_partner(), written by choose_partner().
alter table public.player_partners enable row level security;

-- How many partners these points allow. At least 1.
create function public.partner_slots(p_points bigint)
returns integer
language sql immutable
set search_path = ''
as $$
  select case
    when coalesce(p_points, 0) >= 9000 then 3
    when coalesce(p_points, 0) >= 3000 then 2
    else 1
  end
$$;

-- Your partners, your points and how many partners those points allow. No row until a partner is chosen.
create function public.my_partner()
returns table (current text, owned text[], points bigint, slots integer)
language sql stable security definer
set search_path = ''
as $$
  select pp.current, pp.owned, coalesce(pts.points, 0), public.partner_slots(coalesce(pts.points, 0))
  from public.player_partners pp
  left join public.player_points() pts on pts.user_id = pp.user_id
  where pp.user_id = (select auth.uid())
$$;

-- Take a partner, or switch to one you hold. The first is free. Another is taken only when your points allow
-- one more than you hold. Anything else changes nothing. Answers with what you hold now, so the caller can
-- see whether it took.
create function public.choose_partner(p_who text)
returns table (current text, owned text[])
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mine public.player_partners%rowtype;
  pts bigint;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_who is null or p_who not in ('cat', 'dino', 'dog') then
    raise exception 'Bad input.' using errcode = '22023';
  end if;

  select * into mine from public.player_partners pp where pp.user_id = uid for update;
  if not found then
    insert into public.player_partners (user_id, current, owned) values (uid, p_who, array[p_who])
    on conflict (user_id) do nothing;
  elsif p_who = any (mine.owned) then
    update public.player_partners pp set current = p_who, updated_at = now() where pp.user_id = uid;
  else
    select coalesce(pp.points, 0) into pts from public.player_points() pp where pp.user_id = uid;
    if cardinality(mine.owned) < public.partner_slots(coalesce(pts, 0)) then
      update public.player_partners pp
        set current = p_who, owned = mine.owned || p_who, updated_at = now()
        where pp.user_id = uid;
    end if;
  end if;

  return query select pp.current, pp.owned from public.player_partners pp where pp.user_id = uid;
end
$$;

revoke execute on function public.partner_slots(bigint) from public, anon, authenticated;
revoke execute on function public.my_partner() from public, anon, authenticated;
revoke execute on function public.choose_partner(text) from public, anon, authenticated;

grant execute on function public.my_partner() to authenticated;
grant execute on function public.choose_partner(text) to authenticated;