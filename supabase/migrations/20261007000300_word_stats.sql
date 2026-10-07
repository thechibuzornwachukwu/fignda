-- "Only 8% found this word": how many verified players found each word of a daily.

-- The words a verified play really found (answer keys), written by the Worker after replaying the log.
-- Older plays have none and are left out of the count.
alter table public.plays add column found_keys text[] check (found_keys is null or cardinality(found_keys) <= 200);

-- One row per answer of the day. Today's rows name the answers, so today is only for players who have
-- already finished it (they have seen every answer by then). Past days are open to everyone.
create function public.daily_word_stats(p_day integer)
returns table (key text, found bigint, players bigint)
language sql stable security definer
set search_path = ''
as $$
  with ok as (
    select p_day >= 1 and (
      p_day < public.fignda_day_no()
      or (p_day = public.fignda_day_no() and exists (
        select 1 from public.plays p where p.user_id = (select auth.uid()) and p.day_no = p_day
      ))
    ) as yes
  ),
  counted as (
    select p.found_keys from public.plays p
    where p.day_no = p_day and p.verified and p.found_keys is not null
  )
  select a.key,
         (select count(*) from counted c where a.key = any (c.found_keys)),
         (select count(*) from counted)
  from public.daily_answers d
  cross join lateral unnest(d.answers) as a (key)
  cross join ok
  where d.day_no = p_day and ok.yes
$$;

revoke execute on function public.daily_word_stats(integer) from public, anon, authenticated;
grant execute on function public.daily_word_stats(integer) to anon, authenticated;
