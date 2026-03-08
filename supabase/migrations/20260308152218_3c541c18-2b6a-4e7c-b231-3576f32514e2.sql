
-- =============================================
-- VILLAGE CONNECT PLATFORM - CORE SCHEMA
-- =============================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'user');
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'banned', 'suspended');
CREATE TYPE public.post_type AS ENUM ('text', 'image', 'video');
CREATE TYPE public.complaint_status AS ENUM ('reported', 'in_progress', 'resolved');
CREATE TYPE public.project_status AS ENUM ('planned', 'in_progress', 'completed', 'delayed');
CREATE TYPE public.notification_type AS ENUM ('announcement', 'comment', 'project_update', 'event', 'complaint_update', 'emergency', 'general');

-- UTILITY FUNCTION: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- VILLAGES TABLE
CREATE TABLE public.villages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  description TEXT,
  population INTEGER,
  logo_url TEXT,
  banner_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  theme_color TEXT DEFAULT '#16a34a',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Villages are viewable by everyone" ON public.villages
  FOR SELECT USING (true);

CREATE TRIGGER update_villages_updated_at
  BEFORE UPDATE ON public.villages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES TABLE (separate for security - must be created before profiles for RLS)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  village_id UUID,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, village_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User roles viewable by authenticated users" ON public.user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- SECURITY DEFINER FUNCTIONS FOR ROLES (created before RLS policies that use them)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'moderator' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1
$$;

-- Add village FK to user_roles after villages table exists
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_village_id_fkey
  FOREIGN KEY (village_id) REFERENCES public.villages(id);

-- Now add policies that use has_role
CREATE POLICY "Super admins can manage villages" ON public.villages
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can assign user roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND role = 'user'
  );

-- PROFILES TABLE (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  village_id UUID REFERENCES public.villages(id),
  full_name TEXT NOT NULL,
  mobile_number TEXT,
  occupation TEXT,
  skills TEXT[],
  avatar_url TEXT,
  bio TEXT,
  status public.user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CUSTOM VILLAGE ROLES
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id UUID NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom roles are viewable by authenticated users" ON public.custom_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage custom roles" ON public.custom_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- POSTS TABLE
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id UUID NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type public.post_type NOT NULL DEFAULT 'text',
  media_urls TEXT[],
  location_tag TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by authenticated users" ON public.posts
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "Active users can create posts" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all posts" ON public.posts
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator')
  );

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMMENTS TABLE
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by authenticated users" ON public.comments
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "Active users can comment" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage comments" ON public.comments
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator')
  );

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LIKES TABLE
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by authenticated users" ON public.likes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can like posts" ON public.likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can remove their own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update likes count on posts
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  village_id UUID REFERENCES public.villages(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'general',
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications for anyone" ON public.notifications
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator') OR
    auth.uid() = user_id
  );

-- MEDIA FILES TABLE
CREATE TABLE public.media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  village_id UUID REFERENCES public.villages(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media files are viewable by authenticated users" ON public.media_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload their own media" ON public.media_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media" ON public.media_files
  FOR DELETE USING (auth.uid() = user_id);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_village_id UUID;
BEGIN
  SELECT id INTO v_village_id FROM public.villages WHERE is_active = true LIMIT 1;
  INSERT INTO public.profiles (user_id, full_name, mobile_number, village_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'mobile_number',
    v_village_id,
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('village-assets', 'village-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for avatars
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for post media
CREATE POLICY "Post media is publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Authenticated users can upload post media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own post media" ON storage.objects
  FOR DELETE USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for village assets
CREATE POLICY "Village assets are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'village-assets');
CREATE POLICY "Admins can manage village assets" ON storage.objects
  FOR ALL USING (
    bucket_id = 'village-assets' AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin')
    )
  );

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_village_id ON public.profiles(village_id);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_village_id ON public.user_roles(village_id);
CREATE INDEX idx_posts_village_id ON public.posts(village_id);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_is_pinned ON public.posts(is_pinned);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_likes_post_id ON public.likes(post_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- INSERT VARADAYAPALLI AS FIRST VILLAGE
INSERT INTO public.villages (name, district, state, country, description, population)
VALUES ('Varadayapalli', 'Kadapa', 'Andhra Pradesh', 'India',
  'Varadayapalli is a village in Kadapa District, Andhra Pradesh, India. This platform connects villagers, facilitates development projects, and fosters community engagement.',
  750);
