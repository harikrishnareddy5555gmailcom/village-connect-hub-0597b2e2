
-- =========================================================
-- 1. ADD STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-gallery', 'memory-gallery', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-proofs', 'donation-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Memory gallery public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memory-gallery');

CREATE POLICY "Authenticated users can upload memories"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'memory-gallery' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own memories from gallery"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'memory-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Donation proofs public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'donation-proofs');

CREATE POLICY "Authenticated users can upload donation proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'donation-proofs' AND auth.uid() IS NOT NULL);

-- =========================================================
-- 2. FIX PROFILES: ADD PRIVACY COLUMNS (if not exist)
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS show_mobile boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_occupation boolean NOT NULL DEFAULT true;

-- =========================================================
-- 3. VILLAGES: ADD PAYMENT FIELDS (if not exist)  
-- =========================================================
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS donations_enabled boolean NOT NULL DEFAULT false;

-- =========================================================
-- 4. DONATIONS: ADD PAYMENT_METHOD + PROOF_URL (if not exist)
-- =========================================================
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS proof_url text;

-- =========================================================
-- 5. FIX SUPER ADMIN VISIBILITY
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Fix USER_ROLES RLS: admins cannot see super_admin role entries
DROP POLICY IF EXISTS "Admins can assign user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles viewable by authenticated users" ON public.user_roles;

CREATE POLICY "Super admins see all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins see roles excluding super_admin"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
    AND role != 'super_admin'::app_role
  );

CREATE POLICY "Users see own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND role != 'super_admin'::app_role);

-- Only super_admin can assign roles now
CREATE POLICY "Only super admins can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- =========================================================
-- 6. FIX handle_new_user TO PASS GENDER + PRIVACY DEFAULTS
-- =========================================================
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
  v_is_female := (v_gender = 'Female');
  
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
