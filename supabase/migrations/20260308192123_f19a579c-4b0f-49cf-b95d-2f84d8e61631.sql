
-- Fix all RLS policies from RESTRICTIVE to PERMISSIVE
-- The policies were created with AS RESTRICTIVE which blocks data unless ALL policies pass.
-- We need to drop and recreate all policies as PERMISSIVE (default).

-- ===================== POSTS =====================
DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Active users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.posts;

CREATE POLICY "Posts are viewable by authenticated users"
  ON public.posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "Active users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all posts"
  ON public.posts FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- ===================== COMMENTS =====================
DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON public.comments;
DROP POLICY IF EXISTS "Active users can comment" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can manage comments" ON public.comments;

CREATE POLICY "Comments are viewable by authenticated users"
  ON public.comments FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "Active users can comment"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage comments"
  ON public.comments FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- ===================== COMPLAINTS =====================
DROP POLICY IF EXISTS "Authenticated users can view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Active users can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON public.complaints;

CREATE POLICY "Authenticated users can view complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Admins can update complaints"
  ON public.complaints FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- ===================== EVENTS =====================
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Authenticated users can view events"
  ON public.events FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- ===================== BUSINESSES =====================
DROP POLICY IF EXISTS "Authenticated users can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Active users can list businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can manage businesses" ON public.businesses;

CREATE POLICY "Authenticated users can view businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can list businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Admins can manage businesses"
  ON public.businesses FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- ===================== PROJECTS =====================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- ===================== DISCUSSIONS =====================
DROP POLICY IF EXISTS "Authenticated users can view discussions" ON public.discussions;
DROP POLICY IF EXISTS "Active users can start discussions" ON public.discussions;
DROP POLICY IF EXISTS "Authors and admins can update discussions" ON public.discussions;

CREATE POLICY "Authenticated users can view discussions"
  ON public.discussions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can start discussions"
  ON public.discussions FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Authors and admins can update discussions"
  ON public.discussions FOR UPDATE
  USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ===================== DISCUSSION REPLIES =====================
DROP POLICY IF EXISTS "Authenticated users can view replies" ON public.discussion_replies;
DROP POLICY IF EXISTS "Active users can reply" ON public.discussion_replies;

CREATE POLICY "Authenticated users can view replies"
  ON public.discussion_replies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can reply"
  ON public.discussion_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

-- ===================== LIKES =====================
DROP POLICY IF EXISTS "Likes are viewable by authenticated users" ON public.likes;
DROP POLICY IF EXISTS "Active users can like posts" ON public.likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.likes;

CREATE POLICY "Likes are viewable by authenticated users"
  ON public.likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can like posts"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can remove their own likes"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- ===================== NOTIFICATIONS =====================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications for anyone" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications for anyone"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator') OR auth.uid() = user_id);

-- ===================== PROFILES =====================
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- ===================== USER ROLES =====================
DROP POLICY IF EXISTS "User roles viewable by authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign user roles" ON public.user_roles;

CREATE POLICY "User roles viewable by authenticated users"
  ON public.user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can assign user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') AND role = 'user');

-- ===================== MEDIA FILES =====================
DROP POLICY IF EXISTS "Media files are viewable by authenticated users" ON public.media_files;
DROP POLICY IF EXISTS "Users can upload their own media" ON public.media_files;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_files;

CREATE POLICY "Media files are viewable by authenticated users"
  ON public.media_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload their own media"
  ON public.media_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.media_files FOR DELETE
  USING (auth.uid() = user_id);
