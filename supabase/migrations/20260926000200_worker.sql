-- Worker support: rate limits and the generate cache. Service role only.

-- Fixed-window counters. One row per (key, window). Old rows are pruned as we go.
create table public.rate_limits (
  key text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies and no grants: clients never see this table.

-- Counts one hit and says whether it is allowed. Atomic under concurrency.
create function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, retry_after integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, win, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into n;

  -- Opportunistic cleanup of expired windows for this key.
  delete from public.rate_limits where key = p_key and window_start < win;

  allowed := n <= p_max;
  retry_after := greatest(1, ceil(extract(epoch from (win + make_interval(secs => p_window_seconds) - now())))::integer);
  return next;
end
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Generate cache: custom games remember the normalised topic they came from.
alter table public.games add column topic_key text check (topic_key is null or char_length(topic_key) <= 60);
create index games_topic_recent on public.games (topic_key, created_at desc) where topic_key is not null;
