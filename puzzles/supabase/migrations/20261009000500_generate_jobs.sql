-- Making a puzzle in the background. POST /api/generate (with "background": true) writes a job and answers at
-- once; GET /api/generate/:id/run does the slow model call and writes the result here; GET /api/generate/:id
-- reads the state. Worker (service role) only.

create table public.generate_jobs (
  id uuid primary key default gen_random_uuid(),
  -- Who asked: 'user:<uuid>', or 'ip:<address>:<browser key>' for a guest. One waiting job per key.
  owner_key text not null check (char_length(owner_key) between 1 and 200),
  user_id uuid references auth.users (id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 60),
  state text not null default 'waiting' check (state in ('waiting', 'done', 'failed')),
  -- Done: the share code of the puzzle.
  game_code text check (game_code is null or game_code ~ '^[A-Z2-7]{8}$'),
  -- Failed: a plain code the client maps to a copy line.
  error text check (error is null or error ~ '^[a-z_]{2,40}$'),
  -- The rate limit counter this ask was counted on, so a failure can hand it back. Guests only.
  refund_key text check (refund_key is null or char_length(refund_key) <= 200),
  -- The one runner working on it. A runner renews claimed_at while it works; a claim that stops being renewed
  -- goes stale and another run may take the job.
  claim_id uuid,
  claimed_at timestamptz,
  attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'done') = (game_code is not null)),
  check ((state = 'failed') = (error is not null))
);

create unique index generate_jobs_one_waiting on public.generate_jobs (owner_key) where state = 'waiting';
create index generate_jobs_created on public.generate_jobs (created_at);

create trigger generate_jobs_touch before update on public.generate_jobs
  for each row execute function public.touch_updated_at();

alter table public.generate_jobs enable row level security;
-- No policies and no grants: clients never see this table. The job id is handed out by the Worker.

-- Take the job for one runner. Returns the claim id, or null when the job is finished, another runner holds a
-- live claim, or it has been tried too often. One statement, so two runs can never both win.
create function public.claim_generate_job(p_id uuid, p_stale_seconds integer, p_max_attempts integer)
returns uuid
language sql security definer
set search_path = ''
as $$
  update public.generate_jobs j
  set claim_id = gen_random_uuid(), claimed_at = now(), attempts = j.attempts + 1
  where j.id = p_id
    and j.state = 'waiting'
    and j.attempts < p_max_attempts
    and (j.claimed_at is null or j.claimed_at < now() - make_interval(secs => p_stale_seconds))
  returning j.claim_id
$$;

-- Hand one counted request back (a failed attempt should not cost a guest one of their 5). Only the window
-- the request was counted in; if that hour is over there is nothing to give back.
create function public.refund_rate_limit(p_key text, p_window_seconds integer, p_at timestamptz)
returns void
language sql security definer
set search_path = ''
as $$
  update public.rate_limits
  set count = greatest(count - 1, 0)
  where key = p_key
    and window_start = to_timestamp(floor(extract(epoch from p_at) / p_window_seconds) * p_window_seconds)
$$;

-- Old jobs are of no use to anyone. Called by the hourly cron.
create function public.prune_generate_jobs()
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.generate_jobs where created_at < now() - interval '2 days'
$$;

revoke execute on function public.claim_generate_job(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.refund_rate_limit(text, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.prune_generate_jobs() from public, anon, authenticated;
grant execute on function public.claim_generate_job(uuid, integer, integer) to service_role;
grant execute on function public.refund_rate_limit(text, integer, timestamptz) to service_role;
grant execute on function public.prune_generate_jobs() to service_role;
