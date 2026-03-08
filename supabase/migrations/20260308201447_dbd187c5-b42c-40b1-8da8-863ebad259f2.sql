-- Add FK from posts/events/projects/discussions/discussion_replies/project_updates author columns → profiles.user_id
-- This enables Supabase JS client's automatic join via select('*, profiles(...)') 

ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.discussions
  ADD CONSTRAINT discussions_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.discussion_replies
  ADD CONSTRAINT discussion_replies_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.project_updates
  ADD CONSTRAINT project_updates_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.likes
  ADD CONSTRAINT likes_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
