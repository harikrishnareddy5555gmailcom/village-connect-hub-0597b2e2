
-- Fix storage RLS policies for all buckets
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can upload donation proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view donation proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete donation proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload to village assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update village assets" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view village assets" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload memory gallery" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view memory gallery" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own memory gallery" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload their avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Donation proofs: admins upload, public view
CREATE POLICY "Admins can upload donation proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'donation-proofs' AND (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Anyone can view donation proofs" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'donation-proofs');

CREATE POLICY "Admins can delete donation proofs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'donation-proofs' AND (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

-- Post media: authenticated upload, public view
CREATE POLICY "Authenticated users can upload post media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "Anyone can view post media" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'post-media');

CREATE POLICY "Users can delete own post media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media');

-- Village assets: admins upload, public view
CREATE POLICY "Admins can upload to village assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'village-assets' AND (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Admins can update village assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'village-assets' AND (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Anyone can view village assets" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'village-assets');

-- Memory gallery: authenticated upload, public view
CREATE POLICY "Authenticated users can upload memory gallery" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-gallery');

CREATE POLICY "Anyone can view memory gallery" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'memory-gallery');

CREATE POLICY "Users can delete own memory gallery" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-gallery');

-- Avatars: authenticated upload, public view
CREATE POLICY "Authenticated users can upload their avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- Recreate handle_new_user trigger properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_village_id UUID;
  v_gender text;
  v_is_female boolean;
BEGIN
  SELECT id INTO v_village_id FROM public.villages WHERE is_active = true LIMIT 1;
  v_gender := NEW.raw_user_meta_data->>'gender';
  v_is_female := (lower(v_gender) = 'female');
  INSERT INTO public.profiles (
    user_id, full_name, mobile_number, gender, village_id,
    status, show_mobile, show_email, show_occupation
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'mobile_number',
    v_gender,
    v_village_id,
    'pending',
    NOT v_is_female,
    NOT v_is_female,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
