
-- Add created_at and modified_at columns to the profiles table
alter table public.profiles
add column created_at timestamp with time zone not null default now();

alter table public.profiles
add column modified_at timestamp with time zone not null default now();

-- Create a trigger function to update modified_at timestamp
create function public.handle_updated_at()
returns trigger as $$
begin
  new.modified_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply the trigger to the profiles table
create trigger on_profile_updated
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();
