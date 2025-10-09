-- This migration ensures the 'audience' column exists and has the correct type and default.
-- It also sets up Row Level Security (RLS) policies for the brand_hearts table.

-- Use a DO block to conditionally add/alter the column, making the script rerunnable.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.brand_hearts'::regclass AND attname = 'audience') THEN
    ALTER TABLE public.brand_hearts ADD COLUMN audience jsonb DEFAULT '[]'::jsonb;
  ELSE
    -- If it exists, ensure it is jsonb and has the correct default.
    -- This handles cases where it might have been created as a different type.
    ALTER TABLE public.brand_hearts ALTER COLUMN audience SET DATA TYPE jsonb USING audience::jsonb;
    ALTER TABLE public.brand_hearts ALTER COLUMN audience SET DEFAULT '[]'::jsonb;
  END IF;
END
$$;


-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.brand_hearts.audience IS 'Stores an array of buyer persona objects, each with a title and content.';

-- Enable RLS for the table if it's not already enabled
ALTER TABLE public.brand_hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_hearts FORCE ROW LEVEL SECURITY; -- Ensures it applies to table owners too

-- Drop existing policies to prevent "already exists" errors, then recreate them correctly.
-- This is a safe way to ensure the policies are exactly as defined below.
DROP POLICY IF EXISTS "Allow individual read access on brand_hearts" ON public.brand_hearts;
DROP POLICY IF EXISTS "Allow individual insert access on brand_hearts" ON public.brand_hearts;
DROP POLICY IF EXISTS "Allow individual update access on brand_hearts" ON public.brand_hearts;
DROP POLICY IF EXISTS "Allow individual delete access on brand_hearts" ON public.brand_hearts;


-- Create the policies that allow users to manage their own brand heart.
CREATE POLICY "Allow individual read access on brand_hearts"
ON public.brand_hearts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access on brand_hearts"
ON public.brand_hearts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access on brand_hearts"
ON public.brand_hearts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access on brand_hearts"
ON public.brand_hearts FOR DELETE
USING (auth.uid() = user_id);
