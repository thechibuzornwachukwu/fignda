-- The outfit question (BUILD_PLAN 3b): "Who are we dressing?" The answer is kept with the avatar as its `look`.
-- It only orders hair and outfit choices in the editor and steers Surprise me. It locks nothing.
--
-- It is personal, so it does not go on `profiles` itself: that table is readable by everyone, row and column,
-- and every public view and function joins it. A column there would need the table grant taken away from every
-- reader to hide it. It lives beside the profile instead, one row per player, and only its owner can touch it.
-- No view and no function reads this table. It is never used for ranking, matching or ads.
--
--   feminine   "A woman"
--   masculine  "A man"
--   mixed      "I'd rather not say": a full answer, the set everyone saw before the question existed
--   null       never answered, or skipped

create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  look text check (look is null or look in ('feminine', 'masculine', 'mixed')),
  updated_at timestamptz not null default now()
);

create trigger profile_private_touch before update on public.profile_private
  for each row execute function public.touch_updated_at();

alter table public.profile_private enable row level security;

-- Own row only, for every verb. Nothing for anon: a guest's answer stays in the browser.
create policy "profile_private: read own" on public.profile_private
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profile_private: insert own" on public.profile_private
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profile_private: update own" on public.profile_private
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Default privileges are revoked in core.sql; grant only what the editor needs. No delete: clearing is look = null,
-- and deleting the account removes the row with the profile.
grant select on public.profile_private to authenticated;
grant insert (user_id, look) on public.profile_private to authenticated;
-- The client saves with an upsert, which names user_id in its SET list. The update policy's check keeps it the owner's.
grant update (user_id, look) on public.profile_private to authenticated;
