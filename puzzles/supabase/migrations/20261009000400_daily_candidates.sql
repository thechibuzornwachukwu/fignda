-- Daily candidates: player-made puzzles good enough to become a daily with no person in the loop.
-- A puzzle is one only when all of these hold:
--   it has a maker (a signed in player; old guest any-topic puzzles never qualify)
--   its safety check passed (not merely unchecked)
--   it is not hidden, and nobody has ever reported it
--   at least 20 verified plays, counted as 20 different players other than the maker
--   at least 80% of its thumbs are "Good one"
-- Nothing reads this yet. Service role only: no grants to clients, and it runs with the caller's rights.

create view public.daily_candidates
with (security_invoker = true)
as
  select g.id, g.share_code as code, g.title, g.owner_id, g.created_at, s.players, s.ups, s.downs
  from public.games g
  cross join lateral (
    select
      (select count(distinct p.user_id) from public.plays p
        where p.game_id = g.id and p.verified and p.user_id <> g.owner_id) as players,
      (select count(*) from public.puzzle_ratings r where r.game_id = g.id and r.up) as ups,
      (select count(*) from public.puzzle_ratings r where r.game_id = g.id and not r.up) as downs
  ) s
  where g.kind = 'custom'
    and g.owner_id is not null
    and g.safety = 'passed'
    and g.hidden_at is null
    and not exists (select 1 from public.puzzle_reports r where r.game_id = g.id)
    and s.players >= 20
    and s.ups + s.downs > 0
    and s.ups * 5 >= (s.ups + s.downs) * 4;

revoke all on public.daily_candidates from public, anon, authenticated;
grant select on public.daily_candidates to service_role;
