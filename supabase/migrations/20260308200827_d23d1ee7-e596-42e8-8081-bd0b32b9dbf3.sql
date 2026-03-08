
-- Fix all RLS policies: drop RESTRICTIVE ones and recreate as PERMISSIVE
-- This is the root cause of all data not loading

-- ===================== VILLAGES =====================
DROP POLICY IF EXISTS "Villages are viewable by everyone" ON public.villages;
DROP POLICY IF EXISTS "Super admins can manage villages" ON public.villages;
CREATE POLICY "Villages are viewable by everyone" ON public.villages AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Super admins can manage villages" ON public.villages AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===================== PROFILES =====================
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== POSTS =====================
DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Active users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.posts;
CREATE POLICY "Posts are viewable by authenticated users" ON public.posts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND is_deleted = false);
CREATE POLICY "Active users can create posts" ON public.posts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Users can update their own posts" ON public.posts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage all posts" ON public.posts AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ===================== COMMENTS =====================
DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON public.comments;
DROP POLICY IF EXISTS "Active users can comment" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can manage comments" ON public.comments;
CREATE POLICY "Comments are viewable by authenticated users" ON public.comments AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND is_deleted = false);
CREATE POLICY "Active users can comment" ON public.comments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Users can update their own comments" ON public.comments AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins can manage comments" ON public.comments AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ===================== LIKES =====================
DROP POLICY IF EXISTS "Likes are viewable by authenticated users" ON public.likes;
DROP POLICY IF EXISTS "Active users can like posts" ON public.likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.likes;
CREATE POLICY "Likes are viewable by authenticated users" ON public.likes AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Active users can like posts" ON public.likes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Users can remove their own likes" ON public.likes AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== EVENTS =====================
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Authenticated users can view events" ON public.events AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage events" ON public.events AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ===================== COMPLAINTS =====================
DROP POLICY IF EXISTS "Authenticated users can view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Active users can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON public.complaints;
CREATE POLICY "Authenticated users can view complaints" ON public.complaints AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Active users can create complaints" ON public.complaints AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Admins can update complaints" ON public.complaints AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins can delete complaints" ON public.complaints AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== BUSINESSES =====================
DROP POLICY IF EXISTS "Authenticated users can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Active users can add businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can manage businesses" ON public.businesses;
CREATE POLICY "Authenticated users can view businesses" ON public.businesses AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Active users can add businesses" ON public.businesses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Admins can manage businesses" ON public.businesses AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ===================== PROJECTS =====================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects" ON public.projects AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage projects" ON public.projects AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ===================== PROJECT UPDATES =====================
DROP POLICY IF EXISTS "Authenticated users can view project updates" ON public.project_updates;
DROP POLICY IF EXISTS "Active users can post project updates" ON public.project_updates;
DROP POLICY IF EXISTS "Authors and admins can delete project updates" ON public.project_updates;
CREATE POLICY "Authenticated users can view project updates" ON public.project_updates AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Active users can post project updates" ON public.project_updates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Authors and admins can delete project updates" ON public.project_updates AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== DISCUSSIONS =====================
DROP POLICY IF EXISTS "Authenticated users can view discussions" ON public.discussions;
DROP POLICY IF EXISTS "Active users can start discussions" ON public.discussions;
DROP POLICY IF EXISTS "Authors and admins can update discussions" ON public.discussions;
DROP POLICY IF EXISTS "Admins can delete discussions" ON public.discussions;
CREATE POLICY "Authenticated users can view discussions" ON public.discussions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Active users can start discussions" ON public.discussions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Authors and admins can update discussions" ON public.discussions AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can delete discussions" ON public.discussions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== DISCUSSION REPLIES =====================
DROP POLICY IF EXISTS "Authenticated users can view replies" ON public.discussion_replies;
DROP POLICY IF EXISTS "Active users can reply" ON public.discussion_replies;
DROP POLICY IF EXISTS "Admins can delete replies" ON public.discussion_replies;
CREATE POLICY "Authenticated users can view replies" ON public.discussion_replies AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Active users can reply" ON public.discussion_replies AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status));
CREATE POLICY "Admins can delete replies" ON public.discussion_replies AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== NOTIFICATIONS =====================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications for anyone" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can create notifications for anyone" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR auth.uid() = user_id);

-- ===================== USER ROLES =====================
DROP POLICY IF EXISTS "User roles viewable by authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "User roles viewable by authenticated users" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can assign user roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role = 'user'::app_role);
CREATE POLICY "Super admins can manage all roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ===================== MEDIA FILES =====================
DROP POLICY IF EXISTS "Media files are viewable by authenticated users" ON public.media_files;
DROP POLICY IF EXISTS "Users can upload their own media" ON public.media_files;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_files;
CREATE POLICY "Media files are viewable by authenticated users" ON public.media_files AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can upload their own media" ON public.media_files AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own media" ON public.media_files AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== CUSTOM ROLES =====================
DROP POLICY IF EXISTS "Custom roles are viewable by authenticated users" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can manage custom roles" ON public.custom_roles;
CREATE POLICY "Custom roles are viewable by authenticated users" ON public.custom_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage custom roles" ON public.custom_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
