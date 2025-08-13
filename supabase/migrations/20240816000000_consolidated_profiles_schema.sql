-- supabase/migrations/20240816000000_consolidated_profiles_schema.sql

-- Drop existing function and any dependent objects (like triggers)
drop function if exists public.handle_new_user() cascade;

-- Drop existing policies on profiles table if they exist
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

-- Drop existing table if it exists
drop table if exists public.profiles;

-- Create the profiles table with a consolidated schema
create table public.profiles (
  id uuid references auth.users(id) not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  website text,
  primary_language text not null default 'en',
  secondary_language text,
  constraint language_not_empty check (primary_language <> '')
);

-- Re-enable Row Level Security
alter table public.profiles enable row level security;

-- Re-create policies for the profiles table
create policy "Users can view their own profile."
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Re-create the function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url, primary_language)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'en' -- Default to English
  );
  return new;
end;
$$;

-- Re-create the trigger to call the function on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set up Storage!
-- Note: This was in a previous migration, including it here for completeness.
-- Make sure the bucket doesn't already exist by checking the NAME.
insert into storage.buckets (id, name, public)
select 'alma-storage', 'alma', true
where not exists (
    select 1 from storage.buckets where name = 'alma'
);

-- Add policies for storage objects, dropping them first to ensure idempotency.
drop policy if exists "Give users access to own folder" on storage.objects;
drop policy if exists "allow users to upload to their folder" on storage.objects;

create policy "Give users access to own folder" on storage.objects for select using (
  auth.uid() = owner
);

create policy "allow users to upload to their folder" on storage.objects for insert with check (
  auth.uid() = owner
);
