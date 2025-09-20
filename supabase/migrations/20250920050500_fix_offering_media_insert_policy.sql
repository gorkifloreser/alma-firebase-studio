
-- Drop the old, overly permissive insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.offering_media;

-- Create a new, correct insert policy that checks ownership
CREATE POLICY "Enable insert for own media"
ON public.offering_media
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
