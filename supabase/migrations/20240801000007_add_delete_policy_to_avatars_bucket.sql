
CREATE POLICY "Give users access to own folder 1s8hr_3"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'alma' AND (storage.foldername(name))[1] = auth.uid()::text );
