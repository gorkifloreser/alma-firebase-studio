-- Alter the existing profiles table to add language columns
alter table public.profiles
  add column primary_language text not null default 'en',
  add column secondary_language text;
