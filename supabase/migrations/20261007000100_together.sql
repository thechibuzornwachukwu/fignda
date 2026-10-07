-- Together boards: room games, ranked by team.
--
-- Each signed-in player in a room sends their own play log. The Worker replays it and stores the words that
-- player really selected, with the time of each. Nothing here trusts what teammates say about each other.
-- A word found by two players in one room is credited once, to whoever found it first. Solo boards (plays)
-- are untouched: room plays never write there. Guests cannot send a play, so they are never ranked.

create table public.room_plays (
  room_code text not null check (room_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  total smallint not null check (total between 1 and 200),
  hints smallint not null default 0 check (hints between 0 and 500),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  log jsonb,
  primary key (room_code, game_id, user_id),
  check (ended_at >= started_at)
);

create index room_plays_game on public.room_plays (game_id);
create index room_plays_user on public.room_plays (user_id);

create table public.room_finds (
  room_code text not null,
  game_id text not null,
  user_id uuid not null,
  key text not null check (char_length(key) between 1 and 60),
  at timestamptz not null,
  primary key (room_code, game_id, user_id, key),
  foreign key (room_code, game_id, user_id) references public.room_plays (room_code, game_id, user_id) on delete cascade
);

create index room_finds_word on public.room_finds (game_id, room_code, key, at);

alter table public.room_plays enable row level security;
alter table public.room_finds enable row level security;
-- No policies and no grants: clients read teams only through together_board().

-- One player's replayed room play, stored in one transaction. Worker only.
-- The start is worked out from the server clock (arrival minus play length), so no client clock is trusted.
create function public.record_room_play(
  p_room text, p_game text, p_user uuid, p_total integer, p_hints integer, p_finish_ms integer, p_finds jsonb, p_log jsonb
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  ended timestamptz := now();
  started timestamptz := ended - make_interval(secs => p_finish_ms / 1000.0);
begin
  insert into public.room_plays (room_code, game_id, user_id, total, hints, started_at, ended_at, log)
  values (p_room, p_game, p_user, p_total, p_hints, started, ended, p_log);

  insert into public.room_finds (room_code, game_id, user_id, key, at)
  select p_room, p_game, p_user, f->>'k', started + make_interval(secs => (f->>'t')::integer / 1000.0)
  from jsonb_array_elements(p_finds) f;
end
$$;

-- Teams on one puzzle: most words found together, then the faster team, then the earlier finish.
-- A team is two or more signed-in players in one room. Each player's share is the words they found first.
create function public.together_board(p_game text, p_limit integer default 20)
returns table (rank bigint, words integer, total integer, secs integer, players jsonb)
language sql stable security definer
set search_path = ''
as $$
  with members as (
    select rp.room_code, rp.user_id, rp.total, rp.started_at, rp.ended_at, pr.handle, pr.name
    from public.room_plays rp
    join public.profiles pr on pr.id = rp.user_id
    where rp.game_id = p_game
  ),
  credit as (
    select distinct on (f.room_code, f.key) f.room_code, f.user_id, f.key
    from public.room_finds f
    where f.game_id = p_game
    order by f.room_code, f.key, f.at, f.user_id
  ),
  share as (
    select m.room_code, m.handle, m.name, count(c.key)::integer as finds
    from members m
    left join credit c on c.room_code = m.room_code and c.user_id = m.user_id
    group by m.room_code, m.handle, m.name
  ),
  teams as (
    select m.room_code,
           max(m.total)::integer as total,
           ceil(extract(epoch from max(m.ended_at) - min(m.started_at)))::integer as secs,
           max(m.ended_at) as ended_at
    from members m
    group by m.room_code
    having count(*) >= 2
  ),
  scored as (
    select t.total, t.secs, t.ended_at,
           (select sum(s.finds)::integer from share s where s.room_code = t.room_code) as words,
           (select jsonb_agg(jsonb_build_object('handle', s.handle, 'name', s.name, 'finds', s.finds) order by s.finds desc, s.handle)
            from share s where s.room_code = t.room_code) as players
    from teams t
  )
  select row_number() over (order by s.words desc, s.secs asc, s.ended_at asc) as rank,
         s.words, s.total, s.secs, s.players
  from scored s
  order by rank
  limit least(greatest(p_limit, 1), 100)
$$;

revoke execute on function public.record_room_play(text, text, uuid, integer, integer, integer, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.together_board(text, integer) from public, anon, authenticated;
grant execute on function public.record_room_play(text, text, uuid, integer, integer, integer, jsonb, jsonb) to service_role;
grant execute on function public.together_board(text, integer) to anon, authenticated;
