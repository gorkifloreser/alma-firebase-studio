-- Drop the old column
alter table public.media_plan_items drop column if exists conceptual_step;

-- Add the new columns if they don't exist
alter table public.media_plan_items add column if not exists stage_name text;
alter table public.media_plan_items add column if not exists objective text;
alter table public.media_plan_items add column if not exists concept text;
