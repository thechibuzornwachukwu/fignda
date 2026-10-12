-- The unmasking is the last clue of a case (BUILD_PLAN 4e): the culprit's name, guessed a letter at a time.
-- It is kept like any clue, under number 40. So a case is closed in 2 ways now: a checked play of the whole
-- puzzle, as before, or a checked unmasking. Both count once toward the case badges and the bond with a pet.

-- How many catalogue cases a player has closed, either way.
create function public.cases_closed(p_user uuid)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer
  from (
    select p.game_id
    from public.plays p
    join public.games g on g.id = p.game_id and g.kind = 'curated'
    where p.user_id = p_user and p.verified and p.day_no is null
    union
    select c.game_id
    from public.clue_plays c
    join public.games g on g.id = c.game_id and g.kind = 'curated'
    where c.user_id = p_user and c.verified and c.clue = 40
  ) t
$$;

-- A checked unmasking: the pet beside the player is remembered for the case, once, and the case badges are
-- given. `record_clue` only ever writes checked rows, and writes the same row again for a replay.
create function public.note_unmasking()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  closed integer;
  n integer;
  c text;
begin
  if new.clue <> 40 or not new.verified
     or not exists (select 1 from public.games g where g.id = new.game_id and g.kind = 'curated') then
    return new;
  end if;

  insert into public.partner_cases (user_id, game_id, partner)
  values (new.user_id, new.game_id, coalesce((select pp.current from public.player_partners pp where pp.user_id = new.user_id), 'cat'))
  on conflict (user_id, game_id) do nothing;

  closed := public.cases_closed(new.user_id);
  foreach n in array array[1, 5, 10, 25] loop
    if closed >= n then
      c := 'cases_' || n;
      insert into public.badges (user_id, code) values (new.user_id, c) on conflict do nothing;
      if found then
        perform public.notify(new.user_id, 'badge', null, jsonb_build_object('code', c));
      end if;
    end if;
  end loop;
  return new;
end
$$;

create trigger clue_plays_unmasking after insert or update on public.clue_plays
  for each row execute function public.note_unmasking();

-- A whole puzzle played after some cases were closed by unmasking: the badges count both.
create function public.note_cases_closed()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  closed integer;
  n integer;
  c text;
begin
  if not new.verified or new.day_no is not null then
    return new;
  end if;
  closed := public.cases_closed(new.user_id);
  foreach n in array array[1, 5, 10, 25] loop
    if closed >= n then
      c := 'cases_' || n;
      insert into public.badges (user_id, code) values (new.user_id, c) on conflict do nothing;
      if found then
        perform public.notify(new.user_id, 'badge', null, jsonb_build_object('code', c));
      end if;
    end if;
  end loop;
  return new;
end
$$;

create trigger plays_cases_closed after insert on public.plays
  for each row execute function public.note_cases_closed();

revoke execute on function public.cases_closed(uuid) from public, anon, authenticated;
revoke execute on function public.note_unmasking() from public, anon, authenticated;
revoke execute on function public.note_cases_closed() from public, anon, authenticated;
grant execute on function public.cases_closed(uuid) to service_role;
