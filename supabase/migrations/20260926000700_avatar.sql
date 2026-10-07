-- Avatars: a character the player designs, stored as a short code of part choices (src/avatar/draw.ts).
-- Only letters and digits ever reach the page, and the app redraws from the choices, so there is nothing to
-- moderate and nothing to inject. Null means "not designed yet": the app draws a starter from the handle.

alter table public.profiles
  add column avatar text check (avatar is null or avatar ~ '^([bshcemfxktao][0-9]{1,2}){1,12}$');

-- Own row only (policy "profiles: update own"). Reading is already public, like the name and handle.
grant update (avatar) on public.profiles to authenticated;
