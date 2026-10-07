-- Avatars grew a new part (festive touches, letter z). Accept any lower case letter followed by a position,
-- up to 24 parts, so adding a part later needs no migration. Still letters and digits only: nothing to inject.
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles
  add constraint profiles_avatar_check check (avatar is null or avatar ~ '^([a-z][0-9]{1,2}){1,24}$');
