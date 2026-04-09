
-- ========== GAMES ==========
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id UUID NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  festival_date TIMESTAMPTZ,
  venue TEXT,
  game_type TEXT NOT NULL DEFAULT 'custom',
  scoring_mode TEXT NOT NULL DEFAULT 'points',
  target_score INTEGER,
  match_duration_minutes INTEGER,
  overs_limit INTEGER,
  max_players_per_team INTEGER,
  rules_summary TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  winner_team_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view games" ON public.games FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage games" ON public.games FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creators can update own games" ON public.games FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Active users can create games" ON public.games FOR INSERT WITH CHECK (
  auth.uid() = created_by AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.status = 'active'::user_status)
);
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== GAME PERMISSIONS (created early so other tables can reference it in policies) ==========
CREATE TABLE public.game_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(user_id),
  can_manage_game BOOLEAN NOT NULL DEFAULT false,
  can_manage_teams BOOLEAN NOT NULL DEFAULT false,
  can_update_scores BOOLEAN NOT NULL DEFAULT true,
  can_add_commentary BOOLEAN NOT NULL DEFAULT true,
  can_upload_memories BOOLEAN NOT NULL DEFAULT false,
  can_control_timer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);
ALTER TABLE public.game_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view permissions" ON public.game_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage permissions" ON public.game_permissions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ========== GAME TEAMS ==========
CREATE TABLE public.game_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  captain_name TEXT,
  color_tag TEXT DEFAULT '#16a34a',
  score_adjustment INTEGER NOT NULL DEFAULT 0,
  wickets INTEGER NOT NULL DEFAULT 0,
  overs NUMERIC NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view game teams" ON public.game_teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage game teams" ON public.game_teams FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage teams" ON public.game_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_teams.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage teams" ON public.game_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_teams.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_manage_teams = true OR game_permissions.can_manage_game = true))
);

-- ========== GAME TEAM MEMBERS ==========
CREATE TABLE public.game_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.game_teams(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player',
  jersey_number TEXT,
  is_playing BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view members" ON public.game_team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage members" ON public.game_team_members FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage members" ON public.game_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_team_members.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage members" ON public.game_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_team_members.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_manage_teams = true OR game_permissions.can_manage_game = true))
);

-- ========== GAME SUBSTITUTIONS ==========
CREATE TABLE public.game_substitutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.game_teams(id) ON DELETE CASCADE,
  player_out_name TEXT NOT NULL,
  player_in_name TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_substitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view substitutions" ON public.game_substitutions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage substitutions" ON public.game_substitutions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage substitutions" ON public.game_substitutions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_substitutions.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage substitutions" ON public.game_substitutions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_substitutions.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_manage_teams = true OR game_permissions.can_manage_game = true))
);

-- ========== SCORES ==========
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.game_teams(id) ON DELETE SET NULL,
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  score_type TEXT NOT NULL DEFAULT 'points',
  over_marker TEXT,
  created_by UUID REFERENCES public.profiles(user_id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view scores" ON public.scores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage scores" ON public.scores FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage scores" ON public.scores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = scores.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage scores" ON public.scores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = scores.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_update_scores = true OR game_permissions.can_manage_game = true))
);

-- ========== GAME COMMENTARY ==========
CREATE TABLE public.game_commentary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.game_teams(id) ON DELETE SET NULL,
  commentary TEXT NOT NULL,
  over_marker TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_commentary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view commentary" ON public.game_commentary FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage commentary" ON public.game_commentary FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage commentary" ON public.game_commentary FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_commentary.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can add commentary" ON public.game_commentary FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_commentary.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_add_commentary = true OR game_permissions.can_manage_game = true))
);

-- ========== GAME MEMORIES ==========
CREATE TABLE public.game_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view game memories" ON public.game_memories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can upload their own memories" ON public.game_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own memories" ON public.game_memories FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage game memories" ON public.game_memories FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ========== GAME TIMERS ==========
CREATE TABLE public.game_timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  paused_elapsed_seconds INTEGER DEFAULT 0,
  timer_mode TEXT DEFAULT 'running'
);
ALTER TABLE public.game_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view timers" ON public.game_timers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage timers" ON public.game_timers FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage timers" ON public.game_timers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_timers.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage timers" ON public.game_timers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_timers.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_control_timer = true OR game_permissions.can_manage_game = true))
);

-- ========== CRICKET STATES ==========
CREATE TABLE public.game_cricket_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE UNIQUE,
  batting_team_id UUID REFERENCES public.game_teams(id) ON DELETE SET NULL,
  bowling_team_id UUID REFERENCES public.game_teams(id) ON DELETE SET NULL,
  striker_member_id UUID REFERENCES public.game_team_members(id) ON DELETE SET NULL,
  non_striker_member_id UUID REFERENCES public.game_team_members(id) ON DELETE SET NULL,
  bowler_member_id UUID REFERENCES public.game_team_members(id) ON DELETE SET NULL,
  current_over INTEGER NOT NULL DEFAULT 0,
  current_ball_in_over INTEGER NOT NULL DEFAULT 0,
  last_wicket_type TEXT,
  last_out_member_id UUID REFERENCES public.game_team_members(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_cricket_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view cricket states" ON public.game_cricket_states FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage cricket states" ON public.game_cricket_states FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage cricket states" ON public.game_cricket_states FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_cricket_states.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage cricket states" ON public.game_cricket_states FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_cricket_states.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_update_scores = true OR game_permissions.can_manage_game = true))
);

-- ========== CRICKET PLAYER STATS ==========
CREATE TABLE public.game_cricket_player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.game_team_members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.game_teams(id) ON DELETE CASCADE,
  runs_scored INTEGER NOT NULL DEFAULT 0,
  balls_faced INTEGER NOT NULL DEFAULT 0,
  fours INTEGER NOT NULL DEFAULT 0,
  sixes INTEGER NOT NULL DEFAULT 0,
  is_out BOOLEAN NOT NULL DEFAULT false,
  wicket_type TEXT,
  dismissed_by_member_id UUID REFERENCES public.game_team_members(id) ON DELETE SET NULL,
  overs_bowled_balls INTEGER NOT NULL DEFAULT 0,
  maidens INTEGER NOT NULL DEFAULT 0,
  runs_conceded INTEGER NOT NULL DEFAULT 0,
  wickets_taken INTEGER NOT NULL DEFAULT 0,
  wides INTEGER NOT NULL DEFAULT 0,
  no_balls INTEGER NOT NULL DEFAULT 0,
  run_outs_involved INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, member_id)
);
ALTER TABLE public.game_cricket_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view cricket stats" ON public.game_cricket_player_stats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage cricket stats" ON public.game_cricket_player_stats FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Game creators can manage cricket stats" ON public.game_cricket_player_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE games.id = game_cricket_player_stats.game_id AND games.created_by = auth.uid())
);
CREATE POLICY "Permitted users can manage cricket stats" ON public.game_cricket_player_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.game_permissions WHERE game_permissions.game_id = game_cricket_player_stats.game_id AND game_permissions.user_id = auth.uid() AND (game_permissions.can_update_scores = true OR game_permissions.can_manage_game = true))
);

-- ========== REALTIME ==========
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_commentary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_cricket_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_cricket_player_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_substitutions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_timers;
