
-- Add password reset method toggle columns to villages table
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS reset_via_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reset_via_otp_enabled boolean NOT NULL DEFAULT true;
