-- We use ALTER COLUMN to safely modify the existing audience column.
-- This ensures that if the column already exists (even with a different type),
-- it will be correctly converted to jsonb and have its default value set.
-- This avoids the "column already exists" error.
ALTER TABLE public.brand_hearts
ALTER COLUMN audience TYPE jsonb USING audience::jsonb;

ALTER TABLE public.brand_hearts
ALTER COLUMN audience SET DEFAULT '[]'::jsonb;


-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.brand_hearts.audience IS 'Stores an array of buyer persona objects, each with a title and content.';

-- Enable RLS for the table if it's not already enabled
-- (This might already be done in a previous migration, but it's safe to run again)
ALTER TABLE public.brand_hearts ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own brand heart
-- Using CREATE OR REPLACE POLICY is safer as it won't fail if the policy already exists.
CREATE OR REPLACE POLICY "Allow individual read access on brand_hearts"
ON public.brand_hearts
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own brand heart (if they don't have one)
CREATE OR REPLACE POLICY "Allow individual insert access on brand_hearts"
ON public.brand_hearts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own brand heart
CREATE OR REPLACE POLICY "Allow individual update access on brand_hearts"
ON public.brand_hearts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
