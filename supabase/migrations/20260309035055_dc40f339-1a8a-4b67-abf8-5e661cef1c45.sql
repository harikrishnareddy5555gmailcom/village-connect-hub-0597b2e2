
-- 1. Allow admins to read all user_roles (so User Management page shows roles correctly)
CREATE POLICY "Admins can read all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. Allow super_admin to delete profiles (remove users from the system)
CREATE POLICY "Super admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
