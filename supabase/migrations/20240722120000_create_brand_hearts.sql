
create table brand_hearts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz,
  
  brand_name text,
  brand_brief jsonb,
  mission jsonb,
  vision jsonb,
  "values" jsonb,
  tone_of_voice jsonb
);

alter table brand_hearts enable row level security;

create policy "Users can view their own brand heart"
on brand_hearts for select
using (auth.uid() = user_id);

create policy "Users can insert their own brand heart"
on brand_hearts for insert
with check (auth.uid() = user_id);

create policy "Users can update their own brand heart"
on brand_hearts for update
using (auth.uid() = user_id);
