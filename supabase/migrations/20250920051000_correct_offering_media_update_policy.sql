-- Drop the old, incorrect update policy
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.offering_media;

-- Create a new, correct update policy with both USING and WITH CHECK
CREATE POLICY "Enable update for authenticated users"
ON public.offering_media
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
