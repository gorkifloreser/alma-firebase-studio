
-- Enable Row Level Security for funnel_presets
alter table public.funnel_presets enable row level security;

-- Allow authenticated users to view all presets (global and custom)
create policy "Enable read access for all authenticated users"
on public.funnel_presets
for select
to authenticated
using (true);

-- Allow users to insert their own custom presets
create policy "Enable insert for own presets"
on public.funnel_presets
for insert
to authenticated
with check (auth.uid() = user_id);

-- Allow users to update their own custom presets
create policy "Enable update for own presets"
on public.funnel_presets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Allow users to delete their own custom presets
create policy "Enable delete for own presets"
on public.funnel_presets
for delete
to authenticated
using (auth.uid() = user_id);

-- Grant permissions to the authenticated role
grant select, insert, update, delete on public.funnel_presets to authenticated;
