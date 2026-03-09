-- Activate both test users
UPDATE public.profiles SET status = 'active' WHERE mobile_number IN ('9111111111', '9222222222');

-- Assign roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'user'::app_role FROM public.profiles WHERE mobile_number = '9111111111'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.profiles WHERE mobile_number = '9222222222'
ON CONFLICT DO NOTHING;