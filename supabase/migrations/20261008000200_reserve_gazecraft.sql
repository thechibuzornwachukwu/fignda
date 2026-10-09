-- The game is now called Gazecraft. Nobody may take the name as a handle. The old name stays reserved.
create or replace function public.handle_is_valid(h text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select h is not null
     and h ~ '^[a-z0-9._]{2,20}$'
     and h not in ('admin', 'gazecraft', 'fignda', 'support', 'root', 'help')
$$;
