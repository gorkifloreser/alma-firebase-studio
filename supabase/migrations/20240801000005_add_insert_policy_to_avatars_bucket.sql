
CREATE POLICY "Give users access to own folder 1s8hr_1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'alma' AND (storage.foldername(name))[1] = auth.uid()::text );
