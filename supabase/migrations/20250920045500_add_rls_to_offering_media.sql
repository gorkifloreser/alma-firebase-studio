
-- Enable Row Level Security on the offering_media table
ALTER TABLE public.offering_media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean slate
DROP POLICY IF EXISTS "Allow authenticated users to view their own media" ON public.offering_media;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own media" ON public.offering_media;
DROP POLICY IF EXISTS "Allow authenticated users to update their own media" ON public.offering_media;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own media" ON public.offering_media;

-- Create policy for SELECT
-- Users can see their own media.
CREATE POLICY "Allow authenticated users to view their own media"
ON public.offering_media FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for INSERT
-- Users can add new media.
CREATE POLICY "Allow authenticated users to insert their own media"
ON public.offering_media FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for UPDATE
-- Users can update their own media.
CREATE POLICY "Allow authenticated users to update their own media"
ON public.offering_media FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for DELETE
-- Users can delete their own media.
CREATE POLICY "Allow authenticated users to delete their own media"
ON public.offering_media FOR DELETE
USING (auth.uid() = user_id);
