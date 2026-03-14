-- Create a security definer function that returns super_admin user IDs
-- This allows the members page to filter out super admins without exposing RLS data
CREATE OR REPLACE FUNCTION public.get_super_admin_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'super_admin';
$$;