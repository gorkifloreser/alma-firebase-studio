
-- RLS Policy for UPDATE access
-- Allows users to update their own files in their folder
CREATE POLICY "Give users UPDATE access to own folder"
ON storage.objects FOR UPDATE
USING ( auth.uid()::text = (storage.foldername(name))[1] );
