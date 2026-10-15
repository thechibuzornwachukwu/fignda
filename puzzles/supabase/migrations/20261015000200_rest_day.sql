-- Rest days (BUILD_PLAN set 3a): 1 a week, earned by playing 5 of the last 7, used by itself, free. The same
-- for friend streaks. The rule is `src/engine/rest.ts`, line for line; `src/engine/rest.test.ts` reads this file
-- and fails if the numbers drift. A rest day keeps a run alive and is not counted in it.

create function public.rest_run(p_days integer[], p_today integer)
returns integer
language plpgsql immutable
set search_path = ''
as $$
declare
  played integer[];
  rest integer[] := '{}';
  first_day integer;
  last_rest integer := -1000000;
  m integer;
  d integer;
  n integer;
  run integer := 0;
begin
  select coalesce(array_agg(distinct x order by x), '{}') into played
  from unnest(p_days) as x where x >= 1 and x <= p_today;
  if cardinality(played) = 0 then return 0; end if;
  first_day := played[1];
  m := first_day + 1;
  while m < p_today loop
    if not (m = any(played)) and (m - 1) = any(played) and ((m + 1) = any(played) or m + 1 = p_today) then
      select count(*) into n from unnest(played) as x where x >= m - 7 and x < m;
      if n >= 5 and m - last_rest >= 7 then
        rest := rest || m;
        last_rest := m;
      end if;
    end if;
    m := m + 1;
  end loop;
  d := case when p_today = any(played) then p_today else p_today - 1 end;
  while d = any(played) or d = any(rest) loop
    if d = any(played) then run := run + 1; end if;
    d := d - 1;
  end loop;
  return run;
end
$$;

revoke execute on function public.rest_run(integer[], integer) from public, anon, authenticated;
grant execute on function public.rest_run(integer[], integer) to service_role;

-- The run, and a shared run, now step over rest days. Names, arguments, results and grants are as they were.
create or replace function public.own_streak(p_user uuid)
returns integer
language sql stable
set search_path = ''
as $$
  select public.rest_run(array(select x.day_no from public.played_days(p_user) as x(day_no)), public.fignda_day_no())
$$;

create or replace function public.pair_streak(a uuid, b uuid, p_start integer)
returns integer
language sql stable
set search_path = ''
as $$
  select public.rest_run(array(
    select x.day_no from public.checked_days(a) as x(day_no) where x.day_no >= p_start
    intersect
    select y.day_no from public.checked_days(b) as y(day_no)
  ), public.fignda_day_no())
$$;
