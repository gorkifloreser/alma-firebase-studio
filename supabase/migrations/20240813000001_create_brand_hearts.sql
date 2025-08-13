create table brand_hearts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  mission jsonb,
  vision jsonb,
  values jsonb,
  tone_of_voice jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table brand_hearts enable row level security;

create policy "Users can view their own brand heart" on brand_hearts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own brand heart" on brand_hearts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own brand heart" on brand_hearts
  for update using (auth.uid() = user_id);

create or replace function handle_brand_heart_update()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_brand_heart_update
  before update on brand_hearts
  for each row
  execute procedure handle_brand_heart_update();