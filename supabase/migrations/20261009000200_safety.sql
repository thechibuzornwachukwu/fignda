-- Safety state of a puzzle, written by the Worker when it saves one (worker/src/safety.ts).
--   passed     the word filter and an AI safety model both let it through
--   unchecked  the word filter let it through and no safety model could be reached (or it is older than the check)
--   failed     never stored by the publish paths: a puzzle that fails is not saved. Kept as a value so a later
--              re-check can mark a row without deleting it.
-- A puzzle opens by link when it is passed or unchecked. Only `passed` can become a daily candidate.

alter table public.games add column safety text not null default 'unchecked'
  check (safety in ('passed', 'failed', 'unchecked'));
