-- Storage RLS policies for post-media bucket (allow authenticated users to upload/read)
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to post-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload post media'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can upload post media"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'post-media' AND auth.uid() IS NOT NULL)
    $policy$;
  END IF;
END $$;

-- Allow public read of post-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read post media'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read post media"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'post-media')
    $policy$;
  END IF;
END $$;

-- Allow users to delete their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own post media'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can delete own post media"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text)
    $policy$;
  END IF;
END $$;
