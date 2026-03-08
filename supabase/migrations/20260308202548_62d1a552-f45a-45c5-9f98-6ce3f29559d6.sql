-- ============= TEAMS SYSTEM =============

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role_in_team text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  progress integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view teams" ON public.teams AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage teams" ON public.teams AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- RLS for team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view team members" ON public.team_members AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage team members" ON public.team_members AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- RLS for team_tasks
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view team tasks" ON public.team_tasks AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage team tasks" ON public.team_tasks AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));
CREATE POLICY "Task assignees can update their tasks" ON public.team_tasks AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = assigned_to);

-- Updated_at triggers
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_tasks_updated_at BEFORE UPDATE ON public.team_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
