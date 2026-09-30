CREATE POLICY "users read own report files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users upload own report files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own report files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);