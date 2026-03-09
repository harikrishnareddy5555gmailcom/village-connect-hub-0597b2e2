
-- ============================================================
-- 1. Add gender + privacy fields to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_mobile boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT true;

-- ============================================================
-- 2. Add UPI/QR payment info to villages table
-- ============================================================
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS upi_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qr_code_url text DEFAULT NULL;

-- ============================================================
-- 3. Add payment_method + proof_url + campaign_id to donations
-- ============================================================
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS proof_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campaign_id uuid DEFAULT NULL;

-- ============================================================
-- 4. Donation Campaigns table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.donation_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_amount numeric,
  image_urls text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaigns"
  ON public.donation_campaigns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage campaigns"
  ON public.donation_campaigns FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_donation_campaigns_updated_at
  BEFORE UPDATE ON public.donation_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK for campaign_id in donations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'donations_campaign_id_fkey'
  ) THEN
    ALTER TABLE public.donations
      ADD CONSTRAINT donations_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES public.donation_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 5. Village Memories table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  caption text,
  image_urls text[] NOT NULL DEFAULT '{}',
  location_tag text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view memories"
  ON public.memories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can add memories"
  ON public.memories FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'::user_status)
  );

CREATE POLICY "Authors and admins can delete memories"
  ON public.memories FOR DELETE
  USING (
    auth.uid() = author_id OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 6. Polls table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view polls"
  ON public.polls FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage polls"
  ON public.polls FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Poll Votes table (one vote per user per poll)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view poll votes"
  ON public.poll_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can vote once per poll"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'::user_status)
  );

CREATE POLICY "Users can delete their own vote"
  ON public.poll_votes FOR DELETE
  USING (auth.uid() = user_id);
