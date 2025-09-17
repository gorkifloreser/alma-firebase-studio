-- Add the 'media_plan' column to the 'funnels' table to store orchestrated content ideas.
ALTER TABLE public.funnels
ADD COLUMN media_plan jsonb;

-- Drop the old 'media_plans' table as it has been replaced by the 'media_plan' column in 'funnels'.
DROP TABLE IF EXISTS public.media_plans;

-- Re-enable Row Level Security on the funnels table if it was disabled.
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
