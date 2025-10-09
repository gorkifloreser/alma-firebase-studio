-- Modify the 'audience' column to be of type JSONB with a default empty array.
-- This is safe to run even if the column already exists.
ALTER TABLE public.brand_hearts
DROP COLUMN IF EXISTS audience,
ADD COLUMN audience jsonb DEFAULT '[]'::jsonb;

-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.brand_hearts.audience IS 'Stores an array of buyer persona objects, each with a title and content.';

-- Enable RLS for the table if it's not already enabled
ALTER TABLE public.brand_hearts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent errors on re-run, then create them.

-- Allow users to read their own brand heart
DROP POLICY IF EXISTS "Allow individual read access on brand_hearts" ON public.brand_hearts;
CREATE POLICY "Allow individual read access on brand_hearts"
ON public.brand_hearts
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own brand heart (if they don't have one)
DROP POLICY IF EXISTS "Allow individual insert access on brand_hearts" ON public.brand_hearts;
CREATE POLICY "Allow individual insert access on brand_hearts"
ON public.brand_hearts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own brand heart
DROP POLICY IF EXISTS "Allow individual update access on brand_hearts" ON public.brand_hearts;
CREATE POLICY "Allow individual update access on brand_hearts"
ON public.brand_hearts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
