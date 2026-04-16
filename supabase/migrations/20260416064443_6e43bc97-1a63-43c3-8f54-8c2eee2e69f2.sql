
-- Generic per-player action tracking for all game types
CREATE TABLE public.game_player_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.game_teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.game_team_members(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'point',
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  over_marker TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_game_player_actions_game ON public.game_player_actions(game_id);
CREATE INDEX idx_game_player_actions_member ON public.game_player_actions(member_id);

-- Enable RLS
ALTER TABLE public.game_player_actions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view player actions"
ON public.game_player_actions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage player actions"
ON public.game_player_actions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Game creators can manage player actions"
ON public.game_player_actions FOR ALL
USING (EXISTS (
  SELECT 1 FROM games WHERE games.id = game_player_actions.game_id AND games.created_by = auth.uid()
));

CREATE POLICY "Permitted users can manage player actions"
ON public.game_player_actions FOR ALL
USING (EXISTS (
  SELECT 1 FROM game_permissions
  WHERE game_permissions.game_id = game_player_actions.game_id
    AND game_permissions.user_id = auth.uid()
    AND (game_permissions.can_update_scores = true OR game_permissions.can_manage_game = true)
));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_player_actions;
