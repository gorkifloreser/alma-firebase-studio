-- supabase/migrations/20250920140000_refactor_media_plan_items.sql

-- Add new columns for structured data
ALTER TABLE public.media_plan_items
ADD COLUMN IF NOT EXISTS stage_name TEXT,
ADD COLUMN IF NOT EXISTS objective TEXT,
ADD COLUMN IF NOT EXISTS concept TEXT;

-- NOTE: In a real-world scenario with existing data, you would write a script here
-- to migrate data from the old 'conceptual_step' JSONB column to the new columns.
-- For this development environment, we will assume the table can be reset.
-- Example migration logic (not run):
-- UPDATE public.media_plan_items
-- SET
--   stage_name = conceptual_step->>'stageName',
--   objective = conceptual_step->>'objective',
--   concept = conceptual_step->>'concept'
-- WHERE conceptual_step IS NOT NULL;

-- Drop the old JSONB column
ALTER TABLE public.media_plan_items
DROP COLUMN IF EXISTS conceptual_step;
