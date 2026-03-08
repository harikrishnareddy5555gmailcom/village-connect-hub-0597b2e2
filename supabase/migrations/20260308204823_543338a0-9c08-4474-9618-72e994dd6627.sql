
-- ============================================================
-- DONATION & FUND TRACKING SYSTEM
-- Features: enable/disable per village, audit trail, edit history
-- ============================================================

-- 1. Village-level feature flags (super admin controls)
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS donations_enabled boolean NOT NULL DEFAULT false;

-- 2. Donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id    uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  donor_name    text NOT NULL,
  donor_id      uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  currency      text NOT NULL DEFAULT 'INR',
  date          date NOT NULL DEFAULT CURRENT_DATE,
  project_id    uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  notes         text,
  is_anonymous  boolean NOT NULL DEFAULT false,
  added_by      uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  updated_at    timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id     uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  description    text NOT NULL,
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  currency       text NOT NULL DEFAULT 'INR',
  date           date NOT NULL DEFAULT CURRENT_DATE,
  project_id     uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  category       text NOT NULL DEFAULT 'General',
  proof_url      text,
  responsible_admin uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  notes          text,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  updated_at     timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Edit requests table (permission-based editing)
CREATE TABLE IF NOT EXISTS public.fund_edit_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id      uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  record_type     text NOT NULL CHECK (record_type IN ('donation', 'expense')),
  record_id       uuid NOT NULL,
  requested_by    uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reason          text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  reviewed_at     timestamp with time zone,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Audit log table (full edit history with undo/redo tracking)
CREATE TABLE IF NOT EXISTS public.fund_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id      uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  record_type     text NOT NULL CHECK (record_type IN ('donation', 'expense')),
  record_id       uuid NOT NULL,
  action          text NOT NULL CHECK (action IN ('create', 'edit', 'undo', 'redo', 'delete')),
  changed_by      uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  previous_data   jsonb,
  new_data        jsonb,
  edit_request_id uuid REFERENCES public.fund_edit_requests(id) ON DELETE SET NULL,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Timestamps triggers
CREATE OR REPLACE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_audit_log ENABLE ROW LEVEL SECURITY;

-- Donations: authenticated can read, admins write
CREATE POLICY "donations_select_authenticated"
  ON public.donations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "donations_insert_admin"
  ON public.donations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "donations_update_admin"
  ON public.donations FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "donations_delete_admin"
  ON public.donations FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Expenses
CREATE POLICY "expenses_select_authenticated"
  ON public.expenses FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "expenses_insert_admin"
  ON public.expenses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "expenses_update_admin"
  ON public.expenses FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "expenses_delete_admin"
  ON public.expenses FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Edit requests
CREATE POLICY "fund_edit_requests_select"
  ON public.fund_edit_requests FOR SELECT
  USING (auth.uid() = requested_by OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "fund_edit_requests_insert"
  ON public.fund_edit_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "fund_edit_requests_update_admin"
  ON public.fund_edit_requests FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Audit log
CREATE POLICY "fund_audit_select"
  ON public.fund_audit_log FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fund_audit_insert_admin"
  ON public.fund_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donations_village ON public.donations(village_id);
CREATE INDEX IF NOT EXISTS idx_donations_project ON public.donations(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_village ON public.expenses(village_id);
CREATE INDEX IF NOT EXISTS idx_fund_audit_record ON public.fund_audit_log(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_fund_edit_requests_status ON public.fund_edit_requests(village_id, status);
