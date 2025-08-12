-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  primary_language text not null,
  secondary_language text,
  full_name text,
  avatar_url text,
  website text,
  constraint language_not_empty check (primary_language <> '')
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security
alter table profiles
  enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile entry when a new user signs up.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, primary_language)
  values (new.id, 'en'); -- Default to English, user can change later
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set up Storage!
insert into storage.buckets (id, name, public)
  values ('alma-storage', 'alma', true); -- TODO: RLS for storage

create policy "Give users access to own folder" on storage.objects for select using (
  auth.uid() = owner
);

create policy "allow users to upload to their folder" on storage.objects for insert with check (
  auth.uid() = owner
);

