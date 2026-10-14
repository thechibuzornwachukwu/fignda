-- The 4th partner, the robot, is in the game as Agent 404 (BUILD_PLAN 3h). The tables and functions that
-- know the partners by name learn it, and a 4th partner opens at 20,000 lifetime points.
-- `src/engine/partners.test.ts` fails if these numbers and the engine's drift apart.

alter table public.player_partners drop constraint player_partners_current_check;
alter table public.player_partners drop constraint player_partners_owned_check;
alter table public.player_partners
  add constraint player_partners_current_check check (current in ('cat', 'dino', 'dog', 'robot')),
  add constraint player_partners_owned_check check (cardinality(owned) between 1 and 4 and owned <@ array['cat', 'dino', 'dog', 'robot']);

alter table public.partner_cases drop constraint partner_cases_partner_check;
alter table public.partner_cases
  add constraint partner_cases_partner_check check (partner in ('cat', 'dino', 'dog', 'robot'));

-- How many partners these points allow. At least 1.
create or replace function public.partner_slots(p_points bigint)
returns integer
language sql immutable
set search_path = ''
as $$
  select case
    when coalesce(p_points, 0) >= 20000 then 4
    when coalesce(p_points, 0) >= 9000 then 3
    when coalesce(p_points, 0) >= 3000 then 2
    else 1
  end
$$;

-- As before, with the robot among the partners that can be chosen.
create or replace function public.choose_partner(p_who text)
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
  if p_who is null or p_who not in ('cat', 'dino', 'dog', 'robot') then
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