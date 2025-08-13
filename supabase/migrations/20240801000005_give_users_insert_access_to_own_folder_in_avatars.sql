
-- RLS Policy for INSERT access
-- Allows users to insert files into their own folder
CREATE POLICY "Give users INSERT access to own folder"
ON storage.objects FOR INSERT
WITH CHECK ( auth.uid()::text = (storage.foldername(name))[1] );
