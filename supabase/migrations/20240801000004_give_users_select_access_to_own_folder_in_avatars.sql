
-- RLS Policy for SELECT access
-- Allows users to select/view their own files in their folder
CREATE POLICY "Give users SELECT access to own folder"
ON storage.objects FOR SELECT
USING ( auth.uid()::text = (storage.foldername(name))[1] );
