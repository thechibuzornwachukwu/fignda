-- The bond with a partner (BUILD_PLAN 3k): how many cases a player has closed with each one beside them.
-- Counted here, from checked plays, so nothing a client sends can raise it. A case counts once, for the
-- partner who was there the first time it was closed. It changes no score: it opens poses for that partner.

create table public.partner_cases (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  partner text not null check (partner in ('cat', 'dino', 'dog')),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- No policies and no grants: read through my_partner(), written by the trigger below.
alter table public.partner_cases enable row level security;

-- A checked play of a whole catalogue puzzle is a case closed. The partner beside the player then is
-- remembered for it. A player who never chose has the first partner.
create function public.note_partner_case()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.verified and new.day_no is null
     and exists (select 1 from public.games g where g.id = new.game_id and g.kind = 'curated') then
    insert into public.partner_cases (user_id, game_id, partner)
    values (new.user_id, new.game_id, coalesce((select pp.current from public.player_partners pp where pp.user_id = new.user_id), 'cat'))
    on conflict (user_id, game_id) do nothing;
  end if;
  return new;
end
$$;

create trigger plays_partner_case after insert on public.plays
  for each row execute function public.note_partner_case();

-- Your partners, your points, the partners those points allow, and the cases closed with each: {"cat": 4}.
drop function public.my_partner();
create function public.my_partner()
returns table (current text, owned text[], points bigint, slots integer, bonds jsonb)
language sql stable security definer
set search_path = ''
as $$
  select pp.current, pp.owned, coalesce(pts.points, 0), public.partner_slots(coalesce(pts.points, 0)),
         coalesce((select jsonb_object_agg(b.partner, b.n)
                   from (select pc.partner, count(*)::integer as n from public.partner_cases pc where pc.user_id = pp.user_id group by pc.partner) b), '{}'::jsonb)
  from public.player_partners pp
  left join public.player_points() pts on pts.user_id = pp.user_id
  where pp.user_id = (select auth.uid())
$$;

revoke execute on function public.note_partner_case() from public, anon, authenticated;
revoke execute on function public.my_partner() from public, anon, authenticated;
grant execute on function public.my_partner() to authenticated;