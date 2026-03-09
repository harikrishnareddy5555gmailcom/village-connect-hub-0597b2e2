
-- Create admin_audit_log table to track destructive and important actions by admins
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  performed_by UUID NOT NULL,
  performed_by_name TEXT,
  village_id UUID REFERENCES public.villages(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE INDEX idx_admin_audit_log_village ON public.admin_audit_log(village_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_performed_by ON public.admin_audit_log(performed_by);
