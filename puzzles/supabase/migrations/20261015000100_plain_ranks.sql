-- No story (BUILD_PLAN set 1b): the ranks have plain names. The points each one starts at are as they were, and
-- `src/engine/level.ts` holds the same names. Its name, arguments, result and grants are as they were.

create or replace function public.rank_of(p_points bigint)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when coalesce(p_points, 0) >= 36020 then 'Master'
    when coalesce(p_points, 0) >= 12970 then 'Sharp'
    when coalesce(p_points, 0) >= 3720 then 'Keen'
    else 'Starter'
  end
$$;
