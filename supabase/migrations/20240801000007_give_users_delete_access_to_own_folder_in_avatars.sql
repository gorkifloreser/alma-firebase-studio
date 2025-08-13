
-- RLS Policy for DELETE access
-- Allows users to delete their own files from their folder
CREATE POLICY "Give users DELETE access to own folder"
ON storage.objects FOR DELETE
USING ( auth.uid()::text = (storage.foldername(name))[1] );
