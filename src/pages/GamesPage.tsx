import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Camera, Clock3, Eye, ImagePlus, MessageSquareText, Pause, Pencil, Play, Plus, Radio, Shield, Square, Trash2, Trophy, Users } from 'lucide-react';
import GameScoreboard from '@/components/games/GameScoreboard';
import QuickScorePanel from '@/components/games/QuickScorePanel';
import ScoreTimeline from '@/components/games/ScoreTimeline';
import CricketBallByBall from '@/components/games/CricketBallByBall';
import PlayerScoreTracker from '@/components/games/PlayerScoreTracker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────
type GameRow = {
  id: string;
  title: string;
  description: string | null;
  festival_date: string | null;
  venue: string | null;
  game_type: string;
  scoring_mode: string;
  target_score: number | null;
  match_duration_minutes: number | null;
  overs_limit: number | null;
  max_players_per_team: number | null;
  rules_summary: string | null;
  status: string;
  winner_team_id: string | null;
  created_by: string;
};

type TeamRow = {
  id: string;
  game_id: string;
  name: string;
  captain_name: string | null;
  color_tag: string | null;
  score_adjustment: number;
  wickets: number;
  overs: number;
  is_winner: boolean;
};

type MemberRow = {
  id: string;
  game_id: string;
  team_id: string;
  member_name: string;
  role: string;
  jersey_number: string | null;
  is_playing: boolean;
};

type SubstitutionRow = {
  id: string;
  game_id: string;
  team_id: string;
  player_out_name: string;
  player_in_name: string;
  note: string | null;
  created_at: string;
};

type ScoreRow = {
  id: string;
  game_id: string;
  team_id: string | null;
  points: number;
  description: string | null;
  score_type: string;
  over_marker: string | null;
  timestamp: string;
};

type CommentaryRow = {
  id: string;
  game_id: string;
  team_id: string | null;
  commentary: string;
  over_marker: string | null;
  created_by: string;
  created_at: string;
};

type CricketStateRow = {
  id: string;
  game_id: string;
  batting_team_id: string | null;
  bowling_team_id: string | null;
  striker_member_id: string | null;
  non_striker_member_id: string | null;
  bowler_member_id: string | null;
  current_over: number;
  current_ball_in_over: number;
  last_wicket_type: string | null;
  last_out_member_id: string | null;
};

type CricketPlayerStatsRow = {
  id: string;
  game_id: string;
  member_id: string;
  team_id: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  wicket_type: string | null;
  dismissed_by_member_id: string | null;
  overs_bowled_balls: number;
  maidens: number;
  runs_conceded: number;
  wickets_taken: number;
  wides: number;
  no_balls: number;
  run_outs_involved: number;
};

type GameMemoryRow = {
  id: string;
  game_id: string;
  user_id: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
};

type PlayerActionRow = {
  id: string;
  game_id: string;
  team_id: string;
  member_id: string;
  action_type: string;
  points: number;
  description: string | null;
  created_at: string;
};

type PermissionRow = {
  id: string;
  game_id: string;
  user_id: string;
  can_manage_game: boolean;
  can_manage_teams: boolean;
  can_update_scores: boolean;
  can_add_commentary: boolean;
  can_upload_memories: boolean;
  can_control_timer: boolean;
};

type VillageMember = {
  user_id: string;
  full_name: string | null;
};

type TimerRow = {
  id: string;
  game_id: string;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
  is_active: boolean;
  paused_elapsed_seconds: number | null;
  timer_mode: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────
const blankGame = {
  title: '',
  description: '',
  festival_date: '',
  venue: '',
  game_type: 'custom',
  scoring_mode: 'points',
  target_score: '',
  match_duration_minutes: '',
  overs_limit: '',
  max_players_per_team: '',
  rules_summary: '',
};

const toGameForm = (game: GameRow) => ({
  title: game.title ?? '',
  description: game.description ?? '',
  festival_date: game.festival_date ? new Date(game.festival_date).toISOString().slice(0, 10) : '',
  venue: game.venue ?? '',
  game_type: game.game_type ?? 'custom',
  scoring_mode: game.scoring_mode ?? 'points',
  target_score: game.target_score?.toString() ?? '',
  match_duration_minutes: game.match_duration_minutes?.toString() ?? '',
  overs_limit: game.overs_limit?.toString() ?? '',
  max_players_per_team: game.max_players_per_team?.toString() ?? '',
  rules_summary: game.rules_summary ?? '',
});

const blankTeam = { name: '', captain_name: '', color_tag: '#16a34a' };
const blankScore = { team_id: '', points: '', score_type: 'points', over_marker: '', description: '' };
const blankCommentary = { team_id: '', over_marker: '', commentary: '' };
const blankCricketSetup = {
  batting_team_id: '',
  bowling_team_id: '',
  striker_member_id: '',
  non_striker_member_id: '',
  bowler_member_id: '',
  wicket_type: 'bowled',
  out_player_id: '',
  notes: '',
};
const emptyPermissionForm = { user_id: '', can_manage_game: false, can_manage_teams: false, can_update_scores: true, can_add_commentary: true, can_upload_memories: false, can_control_timer: false };
const LIVE_SECOND = 1000;

const suggestedTeamLimits: Record<string, string> = {
  kabaddi: '7',
  cricket: '11',
  volleyball: '6',
  tug_of_war: '8',
  kho_kho: '9',
};

const permissionLabels = [
  { key: 'can_manage_game' as const, label: 'Manage game' },
  { key: 'can_manage_teams' as const, label: 'Teams' },
  { key: 'can_update_scores' as const, label: 'Scores' },
  { key: 'can_control_timer' as const, label: 'Timer' },
  { key: 'can_add_commentary' as const, label: 'Commentary' },
  { key: 'can_upload_memories' as const, label: 'Memories' },
];

const formatIndiaDate = (d: string) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; } };
const formatIndiaTime = (d: string) => { try { return format(new Date(d), 'hh:mm a'); } catch { return d; } };

// ─── Main Component ──────────────────────────────────────────────────
const GamesPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage } = useVillage();
  const qc = useQueryClient();
  const villageId = currentVillage?.id ?? null;
  const isAdminLevel = role === 'super_admin' || role === 'admin';

  // ─── State ─────────────────────────────────────────────
  const [showCreateGame, setShowCreateGame] = React.useState(false);
  const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);
  const [editingGameId, setEditingGameId] = React.useState<string | null>(null);
  const [deleteGameId, setDeleteGameId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'ongoing' | 'planned' | 'completed'>('ongoing');
  const [gameForm, setGameForm] = React.useState(blankGame);
  const [teamForm, setTeamForm] = React.useState(blankTeam);
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [scoreForm, setScoreForm] = React.useState(blankScore);
  const [commentaryForm, setCommentaryForm] = React.useState(blankCommentary);
  const [permissionForm, setPermissionForm] = React.useState(emptyPermissionForm);
  const [permissionSearch, setPermissionSearch] = React.useState('');
  const [memberDrafts, setMemberDrafts] = React.useState<Record<string, { member_name: string; role: string; jersey_number: string }>>({});
  const [memberEditDrafts, setMemberEditDrafts] = React.useState<Record<string, { member_name: string; role: string; jersey_number: string }>>({});
  const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
  const [replacementDrafts, setReplacementDrafts] = React.useState<Record<string, { player_in_name: string; note: string }>>({});
  const [cricketSetup, setCricketSetup] = React.useState(blankCricketSetup);
  const [memoryDescription, setMemoryDescription] = React.useState('');
  const [memoryFile, setMemoryFile] = React.useState<File | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  // ─── Queries ───────────────────────────────────────────
  const gamesQuery = useQuery({
    queryKey: ['games', villageId],
    enabled: !!villageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('village_id', villageId!)
        .order('festival_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GameRow[];
    },
  });

  const games = gamesQuery.data ?? [];

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), LIVE_SECOND);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!games.length) { setSelectedGameId(null); return; }
    setSelectedGameId((c) => (c && games.some((g) => g.id === c) ? c : games[0].id));
  }, [games]);

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? null;
  const gameIds = React.useMemo(() => games.map((g) => g.id), [games]);

  const allTeamsQuery = useQuery({
    queryKey: ['game-teams-all', gameIds],
    enabled: gameIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_teams').select('*').in('game_id', gameIds).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TeamRow[];
    },
  });

  const allScoresQuery = useQuery({
    queryKey: ['game-scores-all', gameIds],
    enabled: gameIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('scores').select('*').in('game_id', gameIds).order('timestamp', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScoreRow[];
    },
  });

  const timersQuery = useQuery({
    queryKey: ['game-timers-all', gameIds],
    enabled: gameIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_timers').select('*').in('game_id', gameIds);
      if (error) throw error;
      return (data ?? []) as unknown as TimerRow[];
    },
  });

  const teamsQuery = useQuery({
    queryKey: ['game-teams', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_teams').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TeamRow[];
    },
  });

  const membersQuery = useQuery({
    queryKey: ['game-team-members', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_team_members').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MemberRow[];
    },
  });

  const scoresQuery = useQuery({
    queryKey: ['game-scores', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('scores').select('*').eq('game_id', selectedGameId!).order('timestamp', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScoreRow[];
    },
  });

  const commentaryQuery = useQuery({
    queryKey: ['game-commentary', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_commentary').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CommentaryRow[];
    },
  });

  const substitutionsQuery = useQuery({
    queryKey: ['game-substitutions', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_substitutions').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubstitutionRow[];
    },
  });

  const permissionsQuery = useQuery({
    queryKey: ['game-permissions', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_permissions').select('*').eq('game_id', selectedGameId!);
      if (error) throw error;
      return (data ?? []) as unknown as PermissionRow[];
    },
  });

  const memoriesQuery = useQuery({
    queryKey: ['game-memories', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_memories').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GameMemoryRow[];
    },
  });

  const cricketStateQuery = useQuery({
    queryKey: ['game-cricket-state', selectedGameId],
    enabled: !!selectedGameId && selectedGame?.game_type === 'cricket',
    queryFn: async () => {
      const { data, error } = await supabase.from('game_cricket_states').select('*').eq('game_id', selectedGameId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as CricketStateRow | null;
    },
  });

  const cricketStatsQuery = useQuery({
    queryKey: ['game-cricket-player-stats', selectedGameId],
    enabled: !!selectedGameId && selectedGame?.game_type === 'cricket',
    queryFn: async () => {
      const { data, error } = await supabase.from('game_cricket_player_stats').select('*').eq('game_id', selectedGameId!);
      if (error) throw error;
      return (data ?? []) as unknown as CricketPlayerStatsRow[];
    },
  });

  const playerActionsQuery = useQuery({
    queryKey: ['game-player-actions', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_player_actions').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PlayerActionRow[];
    },
  });

  const villageMembersQuery = useQuery({
    queryKey: ['game-village-members', villageId],
    enabled: !!villageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('village_id', villageId!)
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as VillageMember[];
    },
  });

  // ─── Derived data ──────────────────────────────────────
  const teams = teamsQuery.data ?? [];
  const allTeams = allTeamsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const scores = scoresQuery.data ?? [];
  const allScores = allScoresQuery.data ?? [];
  const commentary = commentaryQuery.data ?? [];
  const substitutions = substitutionsQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const memories = memoriesQuery.data ?? [];
  const cricketState = cricketStateQuery.data ?? null;
  const cricketPlayerStats = cricketStatsQuery.data ?? [];
  const playerActions = playerActionsQuery.data ?? [];
  const villageMembers = villageMembersQuery.data ?? [];
  const timers = timersQuery.data ?? [];

  const myPermission = permissions.find((p) => p.user_id === user?.id);
  const canManageGame = isAdminLevel || !!myPermission?.can_manage_game;
  const canManageTeams = canManageGame || !!myPermission?.can_manage_teams;
  const canUpdateScores = canManageGame || !!myPermission?.can_update_scores;
  const canAddCommentary = canManageGame || !!myPermission?.can_add_commentary;
  const canUploadMemories = canManageGame || !!myPermission?.can_upload_memories;
  const canControlTimer = canManageGame || !!myPermission?.can_control_timer || canUpdateScores;
  const canAssignPermissions = isAdminLevel;

  const selectedTimer = timers.find((t) => t.game_id === selectedGameId) ?? null;

  const getTeamName = (teamId: string | null) => teams.find((t) => t.id === teamId)?.name ?? 'Match update';
  const getTeamMembers = (teamId: string) => members.filter((m) => m.team_id === teamId);
  const getPlayingMembers = (teamId: string) => members.filter((m) => m.team_id === teamId && m.is_playing !== false);
  const getMemberName = (memberId: string | null) => members.find((m) => m.id === memberId)?.member_name ?? 'Not set';
  const getCricketStats = (memberId: string | null) => cricketPlayerStats.find((e) => e.member_id === memberId) ?? null;
  const getTeamTotal = (teamId: string) =>
    (teams.find((t) => t.id === teamId)?.score_adjustment ?? 0) +
    scores.filter((s) => s.team_id === teamId).reduce((sum, s) => sum + Number(s.points || 0), 0);

  const teamsForGame = (gameId: string) => allTeams.filter((t) => t.game_id === gameId);
  const scoresForGame = (gameId: string) => allScores.filter((s) => s.game_id === gameId);
  const timerForGame = (gameId: string) => timers.find((t) => t.game_id === gameId) ?? null;
  const filteredGames = games.filter((g) => (statusFilter === 'all' ? true : g.status === statusFilter));
  const maxPlayersPerTeam = selectedGame?.max_players_per_team ?? null;
  const teamIsFull = (teamId: string) => (maxPlayersPerTeam ? getTeamMembers(teamId).length >= maxPlayersPerTeam : false);

  const getGameScoreSummary = (gameId: string) => {
    const gt = teamsForGame(gameId);
    if (!gt.length) return 'Teams not added';
    return gt.slice(0, 2).map((t) => {
      const total = (t.score_adjustment ?? 0) + scoresForGame(gameId).filter((s) => s.team_id === t.id).reduce((sum, s) => sum + Number(s.points || 0), 0);
      return `${t.name} ${total}`;
    }).join('  |  ');
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'ongoing') return 'bg-destructive/15 text-destructive border-destructive/20';
    if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTimerSeconds = React.useCallback((game: GameRow, timer: TimerRow | null) => {
    if (!timer) return game.match_duration_minutes ? game.match_duration_minutes * 60 : null;
    const baseElapsed = timer.paused_elapsed_seconds ?? 0;
    const liveElapsed = timer.is_active && timer.start_time ? Math.max(0, Math.floor((now - new Date(timer.start_time).getTime()) / 1000)) : 0;
    const totalElapsed = baseElapsed + liveElapsed;
    const mode = timer.timer_mode ?? (game.match_duration_minutes ? 'countdown' : 'running');
    if (mode === 'running') return totalElapsed;
    const totalDuration = game.match_duration_minutes ? game.match_duration_minutes * 60 : 0;
    return Math.max(0, totalDuration - totalElapsed);
  }, [now]);

  const formatSeconds = (seconds: number | null) => {
    if (seconds === null) return 'No timer';
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const filteredPermissionMembers = villageMembers.filter((m) => {
    if (m.user_id === user?.id) return false;
    const q = permissionSearch.trim().toLowerCase();
    if (!q) return true;
    return (m.full_name ?? '').toLowerCase().includes(q);
  });

  // ─── Cricket setup effect ─────────────────────────────
  React.useEffect(() => {
    if (selectedGame?.game_type !== 'cricket') { setCricketSetup(blankCricketSetup); return; }
    setCricketSetup((c) => ({
      ...c,
      batting_team_id: cricketState?.batting_team_id ?? '',
      bowling_team_id: cricketState?.bowling_team_id ?? '',
      striker_member_id: cricketState?.striker_member_id ?? '',
      non_striker_member_id: cricketState?.non_striker_member_id ?? '',
      bowler_member_id: cricketState?.bowler_member_id ?? '',
      out_player_id: cricketState?.last_out_member_id ?? c.out_player_id,
    }));
  }, [cricketState, selectedGame?.game_type]);

  // ─── Realtime ──────────────────────────────────────────
  React.useEffect(() => {
    if (!villageId) return;
    const channel = supabase
      .channel(`games-live-${villageId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => qc.invalidateQueries({ queryKey: ['games'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_teams' }, () => { qc.invalidateQueries({ queryKey: ['game-teams'] }); qc.invalidateQueries({ queryKey: ['game-teams-all'] }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => { qc.invalidateQueries({ queryKey: ['game-scores'] }); qc.invalidateQueries({ queryKey: ['game-scores-all'] }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_commentary' }, () => qc.invalidateQueries({ queryKey: ['game-commentary'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_memories' }, () => qc.invalidateQueries({ queryKey: ['game-memories'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_cricket_states' }, () => qc.invalidateQueries({ queryKey: ['game-cricket-state'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_cricket_player_stats' }, () => qc.invalidateQueries({ queryKey: ['game-cricket-player-stats'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_team_members' }, () => qc.invalidateQueries({ queryKey: ['game-team-members'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_substitutions' }, () => qc.invalidateQueries({ queryKey: ['game-substitutions'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_permissions' }, () => qc.invalidateQueries({ queryKey: ['game-permissions'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_timers' }, () => qc.invalidateQueries({ queryKey: ['game-timers-all'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_player_actions' }, () => qc.invalidateQueries({ queryKey: ['game-player-actions'] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, villageId]);

  // ─── Mutations ─────────────────────────────────────────
  const createGame = useMutation({
    mutationFn: async () => {
      if (!user?.id || !villageId) throw new Error('Village or user is missing');
      const { data, error } = await supabase.from('games').insert({
        village_id: villageId,
        created_by: user.id,
        title: gameForm.title.trim(),
        description: gameForm.description.trim() || null,
        festival_date: gameForm.festival_date ? new Date(`${gameForm.festival_date}T00:00:00`).toISOString() : null,
        venue: gameForm.venue.trim() || null,
        game_type: gameForm.game_type,
        scoring_mode: gameForm.scoring_mode,
        target_score: gameForm.target_score ? Number(gameForm.target_score) : null,
        match_duration_minutes: gameForm.match_duration_minutes ? Number(gameForm.match_duration_minutes) : null,
        overs_limit: gameForm.overs_limit ? Number(gameForm.overs_limit) : null,
        max_players_per_team: gameForm.max_players_per_team ? Number(gameForm.max_players_per_team) : null,
        rules_summary: gameForm.rules_summary.trim() || null,
      } as any).select('*').single();
      if (error) throw error;
      return data as unknown as GameRow;
    },
    onSuccess: (game) => {
      setShowCreateGame(false); setGameForm(blankGame); setSelectedGameId(game.id);
      qc.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game created');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create game'),
  });

  const updateGame = useMutation({
    mutationFn: async () => {
      if (!editingGameId) throw new Error('Choose a game to edit');
      const { error } = await supabase.from('games').update({
        title: gameForm.title.trim(),
        description: gameForm.description.trim() || null,
        festival_date: gameForm.festival_date ? new Date(`${gameForm.festival_date}T00:00:00`).toISOString() : null,
        venue: gameForm.venue.trim() || null,
        game_type: gameForm.game_type,
        scoring_mode: gameForm.scoring_mode,
        target_score: gameForm.target_score ? Number(gameForm.target_score) : null,
        match_duration_minutes: gameForm.match_duration_minutes ? Number(gameForm.match_duration_minutes) : null,
        overs_limit: gameForm.overs_limit ? Number(gameForm.overs_limit) : null,
        max_players_per_team: gameForm.max_players_per_team ? Number(gameForm.max_players_per_team) : null,
        rules_summary: gameForm.rules_summary.trim() || null,
      } as any).eq('id', editingGameId);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowCreateGame(false); setEditingGameId(null); setGameForm(blankGame);
      qc.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game updated');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update game'),
  });

  const deleteGame = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase.from('games').delete().eq('id', gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteGameId(null); setSelectedGameId(null);
      qc.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game deleted');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete game'),
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      if (!selectedGameId || !user?.id) throw new Error('Select a game first');
      const { error } = await supabase.from('game_teams').insert({
        game_id: selectedGameId,
        name: teamForm.name.trim(),
        captain_name: teamForm.captain_name.trim() || null,
        color_tag: teamForm.color_tag || null,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setTeamForm(blankTeam);
      qc.invalidateQueries({ queryKey: ['game-teams', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-teams-all'] });
      toast.success('Team added');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add team'),
  });

  const updateTeam = useMutation({
    mutationFn: async () => {
      if (!editingTeamId) throw new Error('Choose a team');
      const { error } = await supabase.from('game_teams').update({
        name: teamForm.name.trim(),
        captain_name: teamForm.captain_name.trim() || null,
        color_tag: teamForm.color_tag || null,
      } as any).eq('id', editingTeamId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingTeamId(null); setTeamForm(blankTeam);
      qc.invalidateQueries({ queryKey: ['game-teams', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-teams-all'] });
      toast.success('Team updated');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update team'),
  });

  const deleteTeam = useMutation({
    mutationFn: async (teamId: string) => {
      await Promise.all([
        supabase.from('game_team_members').delete().eq('team_id', teamId),
        supabase.from('scores').delete().eq('team_id', teamId),
        supabase.from('game_commentary').delete().eq('team_id', teamId),
        supabase.from('game_substitutions').delete().eq('team_id', teamId),
      ]);
      const { error } = await supabase.from('game_teams').delete().eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-teams', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-teams-all'] });
      qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-scores', selectedGameId] });
      toast.success('Team deleted');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete team'),
  });

  const addMember = useMutation({
    mutationFn: async ({ teamId, member }: { teamId: string; member: { member_name: string; role: string; jersey_number: string } }) => {
      if (!selectedGameId || !user?.id) throw new Error('Select a game first');
      if (teamIsFull(teamId)) throw new Error('Team has reached the player limit');
      const { error } = await supabase.from('game_team_members').insert({
        game_id: selectedGameId,
        team_id: teamId,
        member_name: member.member_name.trim(),
        role: member.role.trim() || 'player',
        jersey_number: member.jersey_number.trim() || null,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] });
      setMemberDrafts((c) => ({ ...c, [v.teamId]: { member_name: '', role: 'player', jersey_number: '' } }));
      toast.success('Member added');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add member'),
  });

  const updateMember = useMutation({
    mutationFn: async ({ memberId, member }: { memberId: string; member: { member_name: string; role: string; jersey_number: string } }) => {
      const { error } = await supabase.from('game_team_members').update({
        member_name: member.member_name.trim(),
        role: member.role.trim() || 'player',
        jersey_number: member.jersey_number.trim() || null,
      } as any).eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingMemberId(null);
      qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] });
      toast.success('Player updated');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update player'),
  });

  const deleteMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('game_team_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] });
      toast.success('Player removed');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to remove player'),
  });

  const substituteMember = useMutation({
    mutationFn: async ({ member, replacement }: { member: MemberRow; replacement: { player_in_name: string; note: string } }) => {
      if (!user?.id) throw new Error('Missing user');
      const trimmedName = replacement.player_in_name.trim();
      if (!trimmedName) throw new Error('Replacement player name is required');
      await supabase.from('game_team_members').insert({ game_id: member.game_id, team_id: member.team_id, member_name: trimmedName, role: member.role, jersey_number: member.jersey_number, created_by: user.id } as any);
      await supabase.from('game_team_members').delete().eq('id', member.id);
      await supabase.from('game_substitutions').insert({ game_id: member.game_id, team_id: member.team_id, player_out_name: member.member_name, player_in_name: trimmedName, note: replacement.note.trim() || null, created_by: user.id } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-substitutions', selectedGameId] });
      toast.success('Substitution saved');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const addScore = useMutation({
    mutationFn: async () => {
      if (!selectedGameId || !user?.id) throw new Error('Select a game first');
      const { error } = await supabase.from('scores').insert({
        game_id: selectedGameId,
        team_id: scoreForm.team_id || null,
        points: Number(scoreForm.points || 0),
        description: scoreForm.description.trim() || null,
        created_by: user.id,
        score_type: scoreForm.score_type,
        over_marker: scoreForm.over_marker.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setScoreForm(blankScore);
      qc.invalidateQueries({ queryKey: ['game-scores', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-scores-all'] });
      toast.success('Score updated');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save score'),
  });

  const addCommentary = useMutation({
    mutationFn: async () => {
      if (!selectedGameId || !user?.id) throw new Error('Select a game first');
      const { error } = await supabase.from('game_commentary').insert({
        game_id: selectedGameId,
        team_id: commentaryForm.team_id || null,
        commentary: commentaryForm.commentary.trim(),
        over_marker: commentaryForm.over_marker.trim() || null,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentaryForm(blankCommentary);
      qc.invalidateQueries({ queryKey: ['game-commentary', selectedGameId] });
      toast.success('Commentary posted');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to post commentary'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ gameId, status }: { gameId: string; status: string }) => {
      const { error } = await supabase.from('games').update({ status } as any).eq('id', gameId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['games'] }); toast.success('Game updated'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update game'),
  });

  const markWinner = useMutation({
    mutationFn: async (teamId: string) => {
      if (!selectedGameId) throw new Error('Select a game first');
      await Promise.all([
        supabase.from('games').update({ winner_team_id: teamId, status: 'completed' } as any).eq('id', selectedGameId),
        ...teams.map((t) => supabase.from('game_teams').update({ is_winner: t.id === teamId } as any).eq('id', t.id)),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['games'] });
      qc.invalidateQueries({ queryKey: ['game-teams', selectedGameId] });
      toast.success('Winner saved');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save winner'),
  });

  const savePermission = useMutation({
    mutationFn: async () => {
      if (!selectedGameId || !user?.id || !permissionForm.user_id) throw new Error('Choose a user first');
      const { error } = await supabase.from('game_permissions').upsert({
        game_id: selectedGameId,
        user_id: permissionForm.user_id,
        granted_by: user.id,
        can_manage_game: permissionForm.can_manage_game,
        can_manage_teams: permissionForm.can_manage_teams,
        can_update_scores: permissionForm.can_update_scores,
        can_control_timer: permissionForm.can_control_timer,
        can_add_commentary: permissionForm.can_add_commentary,
        can_upload_memories: permissionForm.can_upload_memories,
      } as any, { onConflict: 'game_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      setPermissionForm(emptyPermissionForm);
      qc.invalidateQueries({ queryKey: ['game-permissions', selectedGameId] });
      toast.success('Permission updated');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save permission'),
  });

  const upsertTimer = useMutation({
    mutationFn: async (action: 'start' | 'pause' | 'reset') => {
      if (!selectedGameId) throw new Error('Select a game first');
      const currentTimer = timers.find((t) => t.game_id === selectedGameId) ?? null;
      const elapsed = currentTimer?.paused_elapsed_seconds ?? 0;
      const liveElapsed = currentTimer?.is_active && currentTimer.start_time
        ? Math.max(0, Math.floor((Date.now() - new Date(currentTimer.start_time).getTime()) / 1000)) : 0;

      if (action === 'reset' && currentTimer) {
        await supabase.from('game_timers').update({ is_active: false, start_time: null, end_time: null, paused_elapsed_seconds: 0, timer_mode: selectedGame?.match_duration_minutes ? 'countdown' : 'running' } as any).eq('id', currentTimer.id);
        return;
      }
      if (action === 'pause' && currentTimer) {
        await supabase.from('game_timers').update({ is_active: false, end_time: new Date().toISOString(), paused_elapsed_seconds: elapsed + liveElapsed } as any).eq('id', currentTimer.id);
        return;
      }
      if (currentTimer) {
        await supabase.from('game_timers').update({ is_active: true, start_time: new Date().toISOString(), end_time: null, timer_mode: currentTimer.timer_mode ?? (selectedGame?.match_duration_minutes ? 'countdown' : 'running') } as any).eq('id', currentTimer.id);
        return;
      }
      await supabase.from('game_timers').insert({ game_id: selectedGameId, start_time: new Date().toISOString(), is_active: true, paused_elapsed_seconds: 0, timer_mode: selectedGame?.match_duration_minutes ? 'countdown' : 'running' } as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['game-timers-all'] }); toast.success('Timer updated'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const saveCricketSetup = useMutation({
    mutationFn: async () => {
      if (!selectedGameId || selectedGame?.game_type !== 'cricket') throw new Error('Select a cricket game');
      const { error } = await supabase.from('game_cricket_states').upsert({
        game_id: selectedGameId,
        batting_team_id: cricketSetup.batting_team_id || null,
        bowling_team_id: cricketSetup.bowling_team_id || null,
        striker_member_id: cricketSetup.striker_member_id || null,
        non_striker_member_id: cricketSetup.non_striker_member_id || null,
        bowler_member_id: cricketSetup.bowler_member_id || null,
        current_over: cricketState?.current_over ?? 0,
        current_ball_in_over: cricketState?.current_ball_in_over ?? 0,
      } as any, { onConflict: 'game_id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['game-cricket-state', selectedGameId] }); toast.success('Cricket setup saved'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const quickScore = useMutation({
    mutationFn: async ({ team, points, scoreType, description, wicketDelta = 0 }: { team: TeamRow; points: number; scoreType: string; description: string; wicketDelta?: number }) => {
      if (!selectedGameId || !user?.id) throw new Error('Select a game first');
      if (wicketDelta !== 0) {
        await supabase.from('game_teams').update({ wickets: Math.max(0, (team.wickets ?? 0) + wicketDelta) } as any).eq('id', team.id);
      }
      const { error } = await supabase.from('scores').insert({ game_id: selectedGameId, team_id: team.id, points, description, created_by: user.id, score_type: scoreType } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-teams', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-teams-all'] });
      qc.invalidateQueries({ queryKey: ['game-scores', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-scores-all'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  // ─── Ball-by-Ball Cricket Recording ────────────────────
  const recordCricketBall = useMutation({
    mutationFn: async ({ runs, isWicket, isWide, isNoBall, wicketType, outPlayerId }: {
      runs: number; isWicket?: boolean; isWide?: boolean; isNoBall?: boolean; wicketType?: string; outPlayerId?: string;
    }) => {
      if (!selectedGameId || !user?.id || !cricketState) throw new Error('Cricket state not initialized');
      const battingTeam = teams.find(t => t.id === cricketState.batting_team_id);
      const bowlingTeam = teams.find(t => t.id === cricketState.bowling_team_id);
      if (!battingTeam || !bowlingTeam) throw new Error('Teams not set');
      const strikerId = cricketState.striker_member_id;
      const nonStrikerId = cricketState.non_striker_member_id;
      const bowlerId = cricketState.bowler_member_id;
      if (!strikerId || !nonStrikerId || !bowlerId) throw new Error('Set striker, non-striker, and bowler first');

      const isLegalDelivery = !isWide && !isNoBall;
      const totalRuns = runs + (isWide ? 1 : 0) + (isNoBall ? 1 : 0);
      const overMarker = `${cricketState.current_over}.${cricketState.current_ball_in_over + 1}`;

      // 1. Add score event
      let desc = `${runs} run${runs !== 1 ? 's' : ''}`;
      if (isWide) desc = `Wide + ${runs} run${runs !== 1 ? 's' : ''}`;
      if (isNoBall) desc = `No ball + ${runs} run${runs !== 1 ? 's' : ''}`;
      if (isWicket) desc = `WICKET! ${wicketType ?? 'bowled'}`;
      await supabase.from('scores').insert({
        game_id: selectedGameId, team_id: battingTeam.id, points: totalRuns,
        description: desc, created_by: user.id, score_type: isWicket ? 'wicket' : 'points', over_marker: overMarker,
      } as any);

      // 2. Update batter stats
      const ensureStats = async (memberId: string, teamId: string) => {
        const existing = cricketPlayerStats.find(s => s.member_id === memberId);
        if (existing) return existing;
        const { data } = await supabase.from('game_cricket_player_stats').insert({
          game_id: selectedGameId, member_id: memberId, team_id: teamId,
        } as any).select('*').single();
        return data as unknown as CricketPlayerStatsRow;
      };

      const strikerStats = await ensureStats(strikerId, battingTeam.id);
      const bowlerStats = await ensureStats(bowlerId, bowlingTeam.id);

      if (strikerStats) {
        const updates: Record<string, number | boolean | string | null> = {
          runs_scored: (strikerStats.runs_scored ?? 0) + runs,
          balls_faced: (strikerStats.balls_faced ?? 0) + (isLegalDelivery ? 1 : 0),
        };
        if (runs === 4) updates.fours = (strikerStats.fours ?? 0) + 1;
        if (runs === 6) updates.sixes = (strikerStats.sixes ?? 0) + 1;
        if (isWicket) {
          updates.is_out = true;
          updates.wicket_type = wicketType ?? 'bowled';
        }
        await supabase.from('game_cricket_player_stats').update(updates as any).eq('id', strikerStats.id);
      }

      // 3. Update bowler stats
      if (bowlerStats) {
        const updates: Record<string, number> = {
          overs_bowled_balls: (bowlerStats.overs_bowled_balls ?? 0) + (isLegalDelivery ? 1 : 0),
          runs_conceded: (bowlerStats.runs_conceded ?? 0) + totalRuns,
        };
        if (isWicket && wicketType !== 'run_out') updates.wickets_taken = (bowlerStats.wickets_taken ?? 0) + 1;
        if (isWide) updates.wides = (bowlerStats.wides ?? 0) + 1;
        if (isNoBall) updates.no_balls = (bowlerStats.no_balls ?? 0) + 1;
        await supabase.from('game_cricket_player_stats').update(updates as any).eq('id', bowlerStats.id);
      }

      // 4. Update team wickets if wicket
      if (isWicket) {
        await supabase.from('game_teams').update({
          wickets: Math.max(0, (battingTeam.wickets ?? 0) + 1),
        } as any).eq('id', battingTeam.id);
      }

      // 5. Update cricket state: ball count, over tracking, batter rotation
      let newBall = cricketState.current_ball_in_over + (isLegalDelivery ? 1 : 0);
      let newOver = cricketState.current_over;
      let newStriker = strikerId;
      let newNonStriker = nonStrikerId;
      let newBowler = bowlerId;
      let promptBowlerChange = false;

      // Rotate batters on odd runs (1, 3, 5)
      if (runs % 2 === 1) {
        [newStriker, newNonStriker] = [nonStrikerId, strikerId];
      }

      // End of over: rotate strike back, increment over, prompt new bowler
      if (newBall >= 6) {
        newBall = 0;
        newOver += 1;
        // End of over swaps strike
        [newStriker, newNonStriker] = [newNonStriker, newStriker];
        newBowler = null as any; // Force bowler selection
        promptBowlerChange = true;

        // Update team overs
        await supabase.from('game_teams').update({ overs: newOver } as any).eq('id', bowlingTeam.id);
      }

      // If wicket, new batter comes in at striker position
      if (isWicket) {
        newStriker = null as any; // Force new batter selection
        // Mark out player
        if (outPlayerId) {
          await supabase.from('game_team_members').update({ is_playing: false } as any).eq('id', outPlayerId);
        }
      }

      await supabase.from('game_cricket_states').update({
        current_ball_in_over: newBall,
        current_over: newOver,
        striker_member_id: newStriker || null,
        non_striker_member_id: newNonStriker || null,
        bowler_member_id: newBowler || null,
        last_wicket_type: isWicket ? (wicketType ?? 'bowled') : cricketState.last_wicket_type,
        last_out_member_id: isWicket ? (outPlayerId ?? strikerId) : cricketState.last_out_member_id,
      } as any).eq('game_id', selectedGameId);

      // Auto commentary
      await supabase.from('game_commentary').insert({
        game_id: selectedGameId, team_id: battingTeam.id,
        commentary: desc, over_marker: overMarker, created_by: user.id,
      } as any);

      return { promptBowlerChange, newOver };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['game-cricket-state', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-cricket-player-stats', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-teams', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-teams-all'] });
      qc.invalidateQueries({ queryKey: ['game-scores', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-scores-all'] });
      qc.invalidateQueries({ queryKey: ['game-commentary', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] });
      if (result?.promptBowlerChange) {
        toast.info(`Over ${result.newOver} complete! Select a new bowler.`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to record ball'),
  });

  const updatePlayerStatus = useMutation({
    mutationFn: async ({ memberId, isPlaying }: { memberId: string; isPlaying: boolean }) => {
      const { error } = await supabase.from('game_team_members').update({ is_playing: isPlaying } as any).eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['game-team-members', selectedGameId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const recordPlayerAction = useMutation({
    mutationFn: async ({ teamId, memberId, actionType, points, description }: {
      teamId: string; memberId: string; actionType: string; points: number; description: string;
    }) => {
      if (!selectedGameId || !user?.id) throw new Error('Select a game first');
      const { error } = await supabase.from('game_player_actions').insert({
        game_id: selectedGameId,
        team_id: teamId,
        member_id: memberId,
        action_type: actionType,
        points,
        description,
        created_by: user.id,
      } as any);
      if (error) throw error;
      // Also add to scores for team total
      if (points > 0) {
        await supabase.from('scores').insert({
          game_id: selectedGameId,
          team_id: teamId,
          points,
          description,
          created_by: user.id,
          score_type: 'points',
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game-player-actions', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-scores', selectedGameId] });
      qc.invalidateQueries({ queryKey: ['game-scores-all'] });
      toast.success('Action recorded');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to record action'),
  });

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🏏 Village Games</h1>
          <p className="text-sm text-muted-foreground">Live scoreboard, teams, and match control room</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ongoing', 'planned', 'completed', 'all'] as const).map((s) => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">{s === 'ongoing' ? '🔴 Live' : s}</Button>
          ))}
          {canManageGame && (
            <Button size="sm" onClick={() => { setShowCreateGame(true); setEditingGameId(null); setGameForm(blankGame); }}>
              <Plus size={14} className="mr-1.5" />New Game
            </Button>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteGameId} onOpenChange={() => setDeleteGameId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete game?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the game and all associated teams, scores, and data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGameId && deleteGame.mutate(deleteGameId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit Game Form */}
      {showCreateGame && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 text-lg font-semibold">{editingGameId ? 'Edit Game' : 'Create New Game'}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Title *</Label><Input className="mt-1.5" placeholder="Cricket Finals 2025" value={gameForm.title} onChange={(e) => setGameForm((c) => ({ ...c, title: e.target.value }))} /></div>
            <div><Label>Venue</Label><Input className="mt-1.5" placeholder="Village ground" value={gameForm.venue} onChange={(e) => setGameForm((c) => ({ ...c, venue: e.target.value }))} /></div>
            <div><Label>Festival date</Label><Input className="mt-1.5" type="date" value={gameForm.festival_date} onChange={(e) => setGameForm((c) => ({ ...c, festival_date: e.target.value }))} /></div>
            <div>
              <Label>Game type</Label>
              <select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={gameForm.game_type} onChange={(e) => {
                const gt = e.target.value;
                setGameForm((c) => ({
                  ...c,
                  game_type: gt,
                  scoring_mode: gt === 'cricket' ? 'overs' : 'points',
                  max_players_per_team: suggestedTeamLimits[gt] ?? c.max_players_per_team,
                }));
              }}>
                <option value="cricket">🏏 Cricket</option>
                <option value="kabaddi">🤼 Kabaddi</option>
                <option value="volleyball">🏐 Volleyball</option>
                <option value="kho_kho">🏃 Kho Kho</option>
                <option value="tug_of_war">🪢 Tug of War</option>
                <option value="custom">🎮 Custom</option>
              </select>
            </div>
            <div><Label>Target score</Label><Input className="mt-1.5" type="number" placeholder="200" value={gameForm.target_score} onChange={(e) => setGameForm((c) => ({ ...c, target_score: e.target.value }))} /></div>
            <div><Label>Match duration (min)</Label><Input className="mt-1.5" type="number" placeholder="90" value={gameForm.match_duration_minutes} onChange={(e) => setGameForm((c) => ({ ...c, match_duration_minutes: e.target.value }))} /></div>
            {gameForm.game_type === 'cricket' && <div><Label>Overs limit</Label><Input className="mt-1.5" type="number" placeholder="20" value={gameForm.overs_limit} onChange={(e) => setGameForm((c) => ({ ...c, overs_limit: e.target.value }))} /></div>}
            <div><Label>Max players per team</Label><Input className="mt-1.5" type="number" placeholder="11" value={gameForm.max_players_per_team} onChange={(e) => setGameForm((c) => ({ ...c, max_players_per_team: e.target.value }))} /></div>
          </div>
          <div className="mt-3"><Label>Description</Label><Textarea className="mt-1.5" rows={2} value={gameForm.description} onChange={(e) => setGameForm((c) => ({ ...c, description: e.target.value }))} /></div>
          <div className="mt-3"><Label>Rules and notes</Label><Textarea className="mt-1.5" rows={2} value={gameForm.rules_summary} onChange={(e) => setGameForm((c) => ({ ...c, rules_summary: e.target.value }))} /></div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCreateGame(false); setEditingGameId(null); setGameForm(blankGame); }}>Cancel</Button>
            <Button onClick={() => (editingGameId ? updateGame.mutate() : createGame.mutate())} disabled={!gameForm.title.trim() || createGame.isPending || updateGame.isPending}>
              {createGame.isPending || updateGame.isPending ? 'Saving...' : editingGameId ? 'Save Changes' : 'Create Game'}
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: sidebar + detail */}
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Games List Sidebar */}
        <aside className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Games Board</h2>
            <span className="text-xs text-muted-foreground">{filteredGames.length} shown</span>
          </div>
          <div className="space-y-3">
            {gamesQuery.isLoading && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Loading games...</div>}
            {!gamesQuery.isLoading && filteredGames.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No games in this filter yet.</div>}
            {filteredGames.map((game) => (
              <button key={game.id} type="button" onClick={() => setSelectedGameId(game.id)} className={cn('w-full rounded-2xl border p-4 text-left transition-all hover:shadow-md', selectedGameId === game.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background')}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {game.status === 'ongoing' && <Radio size={12} className="text-destructive animate-pulse" />}
                      <p className="font-semibold text-sm">{game.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{game.game_type} · {game.scoring_mode}</p>
                  </div>
                  <Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadgeClass(game.status))}>{game.status === 'ongoing' ? 'LIVE' : game.status}</Badge>
                </div>
                <div className="rounded-xl bg-muted/30 px-3 py-2">
                  <p className="text-xs font-medium">{getGameScoreSummary(game.id)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{game.festival_date ? formatIndiaDate(game.festival_date) : 'No date'}{game.venue ? ` · ${game.venue}` : ''}</span>
                  <span className="font-medium">{formatSeconds(getTimerSeconds(game, timerForGame(game.id)))}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{teamsForGame(game.id).map((t) => t.name).join(' vs ') || 'Teams pending'}</span>
                  <span className="font-medium text-primary">{selectedGameId === game.id ? 'Viewing' : 'View'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Game Detail */}
        <section className="rounded-2xl border bg-card p-5">
          {!selectedGame && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Select a game to manage it.</div>}
          {selectedGame && (
            <>
              {/* Header */}
              <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{selectedGame.title}</h2>
                    <Badge variant="outline" className={cn('capitalize', getStatusBadgeClass(selectedGame.status))}>{selectedGame.status === 'ongoing' ? 'LIVE' : selectedGame.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedGame.description || 'Live village match control room.'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">{selectedGame.festival_date ? formatIndiaDate(selectedGame.festival_date) : 'Date not set'}</span>
                    {selectedGame.venue && <span className="rounded-full bg-muted px-2.5 py-1">{selectedGame.venue}</span>}
                    {selectedGame.target_score && <span className="rounded-full bg-muted px-2.5 py-1">Target {selectedGame.target_score}</span>}
                    {selectedGame.match_duration_minutes && <span className="rounded-full bg-muted px-2.5 py-1">{selectedGame.match_duration_minutes} min</span>}
                    {selectedGame.overs_limit && <span className="rounded-full bg-muted px-2.5 py-1">{selectedGame.overs_limit} overs</span>}
                  </div>
                </div>
                {canManageGame && (
                  <div className="flex flex-wrap gap-2">
                    {selectedGame.status === 'planned' && <Button size="sm" onClick={() => updateStatus.mutate({ gameId: selectedGame.id, status: 'ongoing' })}><Play size={13} className="mr-1.5" />Start</Button>}
                    {selectedGame.status !== 'completed' && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ gameId: selectedGame.id, status: 'completed' })}>Complete</Button>}
                    {isAdminLevel && <Button size="sm" variant="outline" onClick={() => { setEditingGameId(selectedGame.id); setGameForm(toGameForm(selectedGame)); setShowCreateGame(true); }}><Pencil size={13} className="mr-1.5" />Edit</Button>}
                    {isAdminLevel && <Button size="sm" variant="destructive" onClick={() => setDeleteGameId(selectedGame.id)}><Trash2 size={13} className="mr-1.5" />Delete</Button>}
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-background p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Teams</p><p className="mt-2 text-2xl font-semibold">{teams.length}</p></div>
                <div className="rounded-xl border bg-background p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Score Events</p><p className="mt-2 text-2xl font-semibold">{scores.length}</p></div>
                <div className="rounded-xl border bg-background p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Live Timer</p><p className="mt-2 text-2xl font-semibold">{formatSeconds(getTimerSeconds(selectedGame, selectedTimer))}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedTimer?.is_active ? 'Timer is running' : 'Ready'}</p>
                </div>
              </div>

              {/* Winner Banner */}
              {selectedGame.status === 'completed' && selectedGame.winner_team_id && (
                <div className="mb-5 rounded-xl border border-yellow-300/30 bg-yellow-50 dark:bg-yellow-900/10 p-4">
                  <p className="text-sm font-semibold">🏆 Winner: {getTeamName(selectedGame.winner_team_id)}</p>
                </div>
              )}

              {/* Timer Controls */}
              <div className="mb-5 rounded-xl border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Match Controls</p></div>
                  <div className="flex flex-wrap gap-2">
                    {canControlTimer && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => upsertTimer.mutate('start')}>
                          {selectedTimer?.is_active ? <Play size={13} className="mr-1.5" /> : <Clock3 size={13} className="mr-1.5" />}
                          {selectedTimer ? (selectedTimer.is_active ? 'Restart' : 'Resume') : 'Start Timer'}
                        </Button>
                        {selectedTimer && <Button size="sm" variant="outline" onClick={() => upsertTimer.mutate('pause')}><Pause size={13} className="mr-1.5" />Pause</Button>}
                        {selectedTimer && <Button size="sm" variant="outline" onClick={() => upsertTimer.mutate('reset')}><Square size={13} className="mr-1.5" />Reset</Button>}
                      </>
                    )}
                    <div className="rounded-full border px-3 py-2 text-xs text-muted-foreground"><Eye size={12} className="mr-1 inline-block" />Villagers can watch live</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-muted/50 p-2">
                  <TabsTrigger className="min-w-[100px] flex-1 sm:flex-none" value="overview">Overview</TabsTrigger>
                  <TabsTrigger className="min-w-[100px] flex-1 sm:flex-none" value="live">Live</TabsTrigger>
                  <TabsTrigger className="min-w-[100px] flex-1 sm:flex-none" value="commentary">Commentary</TabsTrigger>
                  <TabsTrigger className="min-w-[100px] flex-1 sm:flex-none" value="memories">Memories</TabsTrigger>
                  {canAssignPermissions && <TabsTrigger className="min-w-[100px] flex-1 sm:flex-none" value="permissions">Permissions</TabsTrigger>}
                </TabsList>

                {/* ─── Overview Tab ─── */}
                <TabsContent value="overview" className="mt-5 space-y-5">
                  {/* Rules */}
                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="font-semibold">Match Plan</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedGame.rules_summary || 'No special rules added yet.'}</p>
                  </div>

                  {/* Match Staff */}
                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="font-semibold">Match Staff</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {permissions.length === 0 && <p className="text-sm text-muted-foreground">No moderators assigned yet.</p>}
                      {permissions.map((p) => {
                        const labels = permissionLabels.filter((l) => p[l.key]).map((l) => l.label);
                        return <div key={p.id} className="rounded-full border px-3 py-2 text-sm">{villageMembers.find((m) => m.user_id === p.user_id)?.full_name || 'Staff'}<span className="text-xs text-muted-foreground"> · {labels.join(', ') || 'View only'}</span></div>;
                      })}
                    </div>
                  </div>

                  {/* Add Team */}
                  {canManageTeams && (
                    <div className="rounded-xl border p-4">
                      <div className="mb-3 flex items-center gap-2"><Users size={16} className="text-primary" /><h3 className="font-semibold">{editingTeamId ? 'Edit team' : 'Add team'}</h3></div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input placeholder="Team name" value={teamForm.name} onChange={(e) => setTeamForm((c) => ({ ...c, name: e.target.value }))} />
                        <Input placeholder="Captain name" value={teamForm.captain_name} onChange={(e) => setTeamForm((c) => ({ ...c, captain_name: e.target.value }))} />
                        <Input type="color" value={teamForm.color_tag} onChange={(e) => setTeamForm((c) => ({ ...c, color_tag: e.target.value }))} />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        {editingTeamId && <Button variant="outline" onClick={() => { setEditingTeamId(null); setTeamForm(blankTeam); }}>Cancel</Button>}
                        <Button onClick={() => (editingTeamId ? updateTeam.mutate() : createTeam.mutate())} disabled={!teamForm.name.trim()}>
                          {editingTeamId ? 'Save Team' : 'Add Team'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Team Cards with Members */}
                  <div className="grid gap-4 xl:grid-cols-2">
                    {teams.map((team) => {
                      const membersForTeam = getTeamMembers(team.id);
                      const draft = memberDrafts[team.id] ?? { member_name: '', role: 'player', jersey_number: '' };
                      return (
                        <div key={team.id} className="rounded-xl border p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: team.color_tag ?? '#16a34a' }} />
                                <p className="font-semibold">{team.name}</p>
                                {team.is_winner && <Trophy size={14} className="text-yellow-500" />}
                              </div>
                              <p className="text-xs text-muted-foreground">Captain: {team.captain_name || 'Not set'} · Score {getTeamTotal(team.id)}{maxPlayersPerTeam ? ` · ${membersForTeam.length}/${maxPlayersPerTeam}` : ''}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {canManageTeams && <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => { setEditingTeamId(team.id); setTeamForm({ name: team.name, captain_name: team.captain_name ?? '', color_tag: team.color_tag ?? '#16a34a' }); }}>Edit</Button>}
                              {canManageTeams && <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => deleteTeam.mutate(team.id)}>Del</Button>}
                              {canManageGame && <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => markWinner.mutate(team.id)}>{team.is_winner ? '🏆' : 'Winner'}</Button>}
                            </div>
                          </div>

                          {/* Quick Score Buttons */}
                          {canUpdateScores && selectedGame.status === 'ongoing' && (
                            <div className="mb-3 flex flex-wrap gap-1">
                              {selectedGame.game_type === 'cricket' ? (
                                <>
                                  {[1, 2, 3, 4, 6].map((r) => <Button key={r} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => quickScore.mutate({ team, points: r, scoreType: 'points', description: `${r} run${r > 1 ? 's' : ''}` })}>+{r}</Button>)}
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive" onClick={() => quickScore.mutate({ team, points: 0, scoreType: 'wicket', description: 'Wicket', wicketDelta: 1 })}>W</Button>
                                </>
                              ) : selectedGame.game_type === 'kabaddi' ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => quickScore.mutate({ team, points: 1, scoreType: 'points', description: 'Raid point' })}>Raid +1</Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => quickScore.mutate({ team, points: 2, scoreType: 'bonus', description: 'Bonus point' })}>Bonus +2</Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive" onClick={() => quickScore.mutate({ team, points: 0, scoreType: 'wicket', description: 'Player out', wicketDelta: 1 })}>Out</Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => quickScore.mutate({ team, points: 1, scoreType: 'points', description: 'All out bonus' })}>All Out +1</Button>
                                </>
                              ) : (
                                <>
                                  {[1, 2, 3, 5].map((p) => <Button key={p} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => quickScore.mutate({ team, points: p, scoreType: 'points', description: `+${p} point${p > 1 ? 's' : ''}` })}>+{p}</Button>)}
                                </>
                              )}
                            </div>
                          )}

                          {/* Members List */}
                          <div className="space-y-1.5">
                            {membersForTeam.length === 0 && <p className="text-xs text-muted-foreground">No members yet.</p>}
                            {membersForTeam.map((member) => {
                              const editDraft = memberEditDrafts[member.id] ?? { member_name: member.member_name, role: member.role, jersey_number: member.jersey_number ?? '' };
                              const replacement = replacementDrafts[member.id] ?? { player_in_name: '', note: '' };
                              return (
                                <div key={member.id} className={cn("rounded-lg px-3 py-2 text-sm", member.is_playing === false ? 'bg-destructive/5 opacity-60' : 'bg-muted/30')}>
                                  {editingMemberId === member.id ? (
                                    <div className="space-y-2">
                                      <div className="grid gap-2 md:grid-cols-3">
                                        <Input className="h-8 text-xs" value={editDraft.member_name} onChange={(e) => setMemberEditDrafts((c) => ({ ...c, [member.id]: { ...editDraft, member_name: e.target.value } }))} />
                                        <Input className="h-8 text-xs" value={editDraft.role} onChange={(e) => setMemberEditDrafts((c) => ({ ...c, [member.id]: { ...editDraft, role: e.target.value } }))} />
                                        <Input className="h-8 text-xs" value={editDraft.jersey_number} onChange={(e) => setMemberEditDrafts((c) => ({ ...c, [member.id]: { ...editDraft, jersey_number: e.target.value } }))} />
                                      </div>
                                      <div className="flex gap-1">
                                        <Button size="sm" className="h-7 text-xs" onClick={() => updateMember.mutate({ memberId: member.id, member: editDraft })}>Save</Button>
                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingMemberId(null)}>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <span className="font-medium">{member.member_name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">{member.role}{member.jersey_number ? ` #${member.jersey_number}` : ''}</span>
                                        {member.is_playing === false && <Badge variant="outline" className="ml-2 text-[10px] text-destructive">OUT</Badge>}
                                      </div>
                                      {canManageTeams && (
                                        <div className="flex gap-1">
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingMemberId(member.id)}><Pencil size={10} /></Button>
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteMember.mutate(member.id)}><Trash2 size={10} /></Button>
                                          {member.is_playing && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => updatePlayerStatus.mutate({ memberId: member.id, isPlaying: false })}>✕</Button>}
                                          {!member.is_playing && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={() => updatePlayerStatus.mutate({ memberId: member.id, isPlaying: true })}>✓</Button>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Member */}
                          {canManageTeams && !teamIsFull(team.id) && (
                            <div className="mt-3 flex gap-2">
                              <Input className="h-8 text-xs flex-1" placeholder="Player name" value={draft.member_name} onChange={(e) => setMemberDrafts((c) => ({ ...c, [team.id]: { ...draft, member_name: e.target.value } }))} />
                              <Input className="h-8 text-xs w-20" placeholder="Role" value={draft.role} onChange={(e) => setMemberDrafts((c) => ({ ...c, [team.id]: { ...draft, role: e.target.value } }))} />
                              <Input className="h-8 text-xs w-16" placeholder="#" value={draft.jersey_number} onChange={(e) => setMemberDrafts((c) => ({ ...c, [team.id]: { ...draft, jersey_number: e.target.value } }))} />
                              <Button size="sm" className="h-8 text-xs" disabled={!draft.member_name.trim()} onClick={() => addMember.mutate({ teamId: team.id, member: draft })}>Add</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* ─── Live Tab ─── */}
                <TabsContent value="live" className="mt-5 space-y-5">
                   {/* Scoreboard */}
                   <GameScoreboard
                     teams={teams}
                     scores={scores}
                     gameType={selectedGame.game_type}
                     oversLimit={selectedGame.overs_limit}
                     targetScore={selectedGame.target_score}
                     isCompleted={selectedGame.status === 'completed'}
                     winnerTeamId={selectedGame.winner_team_id}
                   />

                   {/* Quick Score Panel - All Game Types */}
                   {canUpdateScores && selectedGame.status === 'ongoing' && (
                     <QuickScorePanel
                       teams={teams}
                       gameType={selectedGame.game_type}
                       isPending={quickScore.isPending}
                       onQuickScore={(params) => quickScore.mutate(params)}
                     />
                   )}

                  {/* Cricket Setup */}
                  {selectedGame.game_type === 'cricket' && canUpdateScores && (
                    <div className="rounded-xl border p-4">
                      <h3 className="font-semibold mb-3">🏏 Cricket Setup</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>Batting Team</Label>
                          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cricketSetup.batting_team_id} onChange={(e) => setCricketSetup((c) => ({ ...c, batting_team_id: e.target.value }))}>
                            <option value="">Select</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label>Bowling Team</Label>
                          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cricketSetup.bowling_team_id} onChange={(e) => setCricketSetup((c) => ({ ...c, bowling_team_id: e.target.value }))}>
                            <option value="">Select</option>
                            {teams.filter((t) => t.id !== cricketSetup.batting_team_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label>Striker</Label>
                          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cricketSetup.striker_member_id} onChange={(e) => setCricketSetup((c) => ({ ...c, striker_member_id: e.target.value }))}>
                            <option value="">Select</option>
                            {getPlayingMembers(cricketSetup.batting_team_id).map((m) => <option key={m.id} value={m.id}>{m.member_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label>Non-Striker</Label>
                          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cricketSetup.non_striker_member_id} onChange={(e) => setCricketSetup((c) => ({ ...c, non_striker_member_id: e.target.value }))}>
                            <option value="">Select</option>
                            {getPlayingMembers(cricketSetup.batting_team_id).filter((m) => m.id !== cricketSetup.striker_member_id).map((m) => <option key={m.id} value={m.id}>{m.member_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label>Bowler</Label>
                          <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cricketSetup.bowler_member_id} onChange={(e) => setCricketSetup((c) => ({ ...c, bowler_member_id: e.target.value }))}>
                            <option value="">Select</option>
                            {getPlayingMembers(cricketSetup.bowling_team_id).map((m) => <option key={m.id} value={m.id}>{m.member_name}</option>)}
                          </select>
                        </div>
                      </div>
                      <Button className="mt-3" onClick={() => saveCricketSetup.mutate()} disabled={saveCricketSetup.isPending}>Save Cricket Setup</Button>
                    </div>
                  )}

                  {/* Ball-by-Ball Cricket Panel */}
                   {selectedGame.game_type === 'cricket' && canUpdateScores && cricketState && selectedGame.status === 'ongoing' && (
                     <CricketBallByBall
                       cricketState={cricketState}
                       members={members}
                       isPending={recordCricketBall.isPending}
                       wicketType={cricketSetup.wicket_type}
                       onWicketTypeChange={(type) => setCricketSetup(c => ({ ...c, wicket_type: type }))}
                       onRecordBall={(params) => recordCricketBall.mutate(params)}
                     />
                   )}
                  {canUpdateScores && (
                    <div className="rounded-xl border p-4">
                      <h3 className="font-semibold mb-3">📋 Detailed Score</h3>
                      <div className="space-y-3">
                        <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={scoreForm.team_id} onChange={(e) => setScoreForm((c) => ({ ...c, team_id: e.target.value }))}>
                          <option value="">Select team</option>
                          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>

                        {/* Quick Templates */}
                        <div className="grid gap-2 sm:grid-cols-3">
                          {(selectedGame.game_type === 'cricket'
                            ? [
                              { label: 'Single', points: '1', score_type: 'points', description: 'Single run' },
                              { label: 'Four', points: '4', score_type: 'points', description: 'Four runs' },
                              { label: 'Six', points: '6', score_type: 'points', description: 'Six runs' },
                              { label: 'Wicket', points: '0', score_type: 'wicket', description: 'Player out' },
                              { label: 'Wide', points: '1', score_type: 'bonus', description: 'Wide ball' },
                              { label: 'No Ball', points: '1', score_type: 'bonus', description: 'No ball' },
                            ]
                            : selectedGame.game_type === 'kabaddi'
                              ? [
                                { label: 'Raid +1', points: '1', score_type: 'points', description: 'Raid point' },
                                { label: 'Tackle +1', points: '1', score_type: 'points', description: 'Tackle point' },
                                { label: 'Bonus +1', points: '1', score_type: 'bonus', description: 'Bonus point' },
                                { label: 'Super Raid', points: '3', score_type: 'points', description: 'Super raid' },
                                { label: 'All Out', points: '2', score_type: 'bonus', description: 'All out bonus' },
                                { label: 'Empty Raid', points: '0', score_type: 'note', description: 'Empty raid' },
                              ]
                              : [
                                { label: '+1 Point', points: '1', score_type: 'points', description: 'Point' },
                                { label: '+2 Points', points: '2', score_type: 'points', description: 'Two points' },
                                { label: '+3 Points', points: '3', score_type: 'points', description: 'Three points' },
                                { label: 'Bonus', points: '1', score_type: 'bonus', description: 'Bonus point' },
                                { label: 'Foul', points: '-1', score_type: 'note', description: 'Foul penalty' },
                                { label: 'Note', points: '0', score_type: 'note', description: 'Match note' },
                              ]
                          ).map((t) => (
                            <button key={t.label} type="button" onClick={() => setScoreForm((c) => ({ ...c, points: t.points, score_type: t.score_type, description: t.description }))}
                              className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5">
                              <p className="font-medium">{t.label}</p>
                              <p className="text-xs text-muted-foreground">{t.description}</p>
                            </button>
                          ))}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Input type="number" placeholder="Points" value={scoreForm.points} onChange={(e) => setScoreForm((c) => ({ ...c, points: e.target.value }))} />
                          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={scoreForm.score_type} onChange={(e) => setScoreForm((c) => ({ ...c, score_type: e.target.value }))}>
                            <option value="points">Points</option>
                            <option value="bonus">Bonus</option>
                            <option value="wicket">Wicket/Out</option>
                            <option value="note">Note</option>
                          </select>
                        </div>
                        <Textarea rows={2} placeholder="What happened?" value={scoreForm.description} onChange={(e) => setScoreForm((c) => ({ ...c, description: e.target.value }))} />
                        <Button onClick={() => addScore.mutate()} disabled={!scoreForm.team_id || scoreForm.points === '' || addScore.isPending}>
                          {addScore.isPending ? 'Saving...' : 'Save Score Event'}
                        </Button>
                      </div>
                    </div>
                  )}

                   {/* Score Timeline */}
                   <ScoreTimeline scores={scores} teams={teams} />

                  {/* Substitutions */}
                  {substitutions.length > 0 && (
                    <div className="rounded-xl border p-4">
                      <h4 className="font-medium mb-3">Substitutions</h4>
                      <div className="space-y-2">
                        {substitutions.map((s) => (
                          <div key={s.id} className="rounded-lg bg-muted/20 px-3 py-2 text-sm">
                            <span className="font-medium">{teams.find((t) => t.id === s.team_id)?.name}</span>
                            <p className="text-xs mt-1">OUT: {s.player_out_name} · IN: {s.player_in_name}</p>
                            {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cricket Batting & Bowling Cards */}
                  {selectedGame.game_type === 'cricket' && cricketState && (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-xl border p-4">
                        <h3 className="font-semibold">Batting Card</h3>
                        <div className="mt-3 space-y-2">
                          {getTeamMembers(cricketState.batting_team_id ?? '').map((member) => {
                            const stats = getCricketStats(member.id);
                            return (
                              <div key={member.id} className="rounded-lg bg-muted/20 px-3 py-2 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{member.member_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.id === cricketState.striker_member_id ? '🏏 Striker' : member.id === cricketState.non_striker_member_id ? 'Non-striker' : !member.is_playing ? 'Out' : 'Waiting'}
                                  </p>
                                </div>
                                <div className="text-right text-sm">
                                  <p>{stats?.runs_scored ?? 0} ({stats?.balls_faced ?? 0})</p>
                                  <p className="text-xs text-muted-foreground">4s: {stats?.fours ?? 0} · 6s: {stats?.sixes ?? 0}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <h3 className="font-semibold">Bowling Card</h3>
                        <div className="mt-3 space-y-2">
                          {getTeamMembers(cricketState.bowling_team_id ?? '').map((member) => {
                            const stats = getCricketStats(member.id);
                            return (
                              <div key={member.id} className="rounded-lg bg-muted/20 px-3 py-2 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{member.member_name}</p>
                                  <p className="text-xs text-muted-foreground">{member.id === cricketState.bowler_member_id ? '🎳 Bowling' : 'Squad'}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <p>{Math.floor((stats?.overs_bowled_balls ?? 0) / 6)}.{(stats?.overs_bowled_balls ?? 0) % 6} ov</p>
                                  <p className="text-xs text-muted-foreground">{stats?.wickets_taken ?? 0}W · {stats?.runs_conceded ?? 0}R</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ─── Commentary Tab ─── */}
                <TabsContent value="commentary" className="mt-5 space-y-5">
                  {canAddCommentary && (
                    <div className="rounded-xl border p-4">
                      <h3 className="font-semibold mb-3"><MessageSquareText size={16} className="inline mr-2" />Add Commentary</h3>
                      <div className="space-y-3">
                        <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={commentaryForm.team_id} onChange={(e) => setCommentaryForm((c) => ({ ...c, team_id: e.target.value }))}>
                          <option value="">General</option>
                          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <Input placeholder="Over/ball marker" value={commentaryForm.over_marker} onChange={(e) => setCommentaryForm((c) => ({ ...c, over_marker: e.target.value }))} />
                        <Textarea rows={3} placeholder="What's happening on the ground..." value={commentaryForm.commentary} onChange={(e) => setCommentaryForm((c) => ({ ...c, commentary: e.target.value }))} />
                        <Button onClick={() => addCommentary.mutate()} disabled={!commentaryForm.commentary.trim() || addCommentary.isPending}>
                          {addCommentary.isPending ? 'Posting...' : 'Post Commentary'}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {commentary.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No commentary yet.</p>}
                    {commentary.map((c) => (
                      <div key={c.id} className="rounded-lg border bg-background px-4 py-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{getTeamName(c.team_id)}{c.over_marker ? ` · ${c.over_marker}` : ''}</span>
                          <span>{formatIndiaTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm">{c.commentary}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ─── Memories Tab ─── */}
                <TabsContent value="memories" className="mt-5 space-y-5">
                  {canUploadMemories && (
                    <div className="rounded-xl border p-4">
                      <h3 className="font-semibold mb-3"><ImagePlus size={16} className="inline mr-2" />Upload Memory</h3>
                      <p className="text-sm text-muted-foreground mb-3">Share photos from the match!</p>
                      <Textarea rows={2} placeholder="Add a caption..." value={memoryDescription} onChange={(e) => setMemoryDescription(e.target.value)} />
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {memories.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-6">No memories uploaded yet.</p>}
                    {memories.map((m) => (
                      <div key={m.id} className="rounded-lg border overflow-hidden">
                        {m.image_url && <img src={m.image_url} alt={m.description || 'Game memory'} className="h-40 w-full object-cover" />}
                        {m.description && <p className="text-xs p-3 text-muted-foreground">{m.description}</p>}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* ─── Permissions Tab ─── */}
                {canAssignPermissions && (
                  <TabsContent value="permissions" className="mt-5 space-y-5">
                    <div className="rounded-xl border p-4">
                      <h3 className="font-semibold mb-3"><Shield size={16} className="inline mr-2" />Assign Permissions</h3>
                      <p className="text-xs text-muted-foreground mb-3">Grant specific game management roles to village members.</p>
                      <Input placeholder="Search members..." value={permissionSearch} onChange={(e) => setPermissionSearch(e.target.value)} className="mb-3" />
                      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mb-3" value={permissionForm.user_id} onChange={(e) => setPermissionForm((c) => ({ ...c, user_id: e.target.value }))}>
                        <option value="">Select member</option>
                        {filteredPermissionMembers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || m.user_id}</option>)}
                      </select>
                      <div className="flex flex-wrap gap-3 mb-3">
                        {permissionLabels.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={permissionForm[p.key]} onChange={(e) => setPermissionForm((c) => ({ ...c, [p.key]: e.target.checked }))} />
                            {p.label}
                          </label>
                        ))}
                      </div>
                      <Button onClick={() => savePermission.mutate()} disabled={!permissionForm.user_id || savePermission.isPending}>
                        {savePermission.isPending ? 'Saving...' : 'Save Permission'}
                      </Button>
                    </div>

                    {/* Current permissions */}
                    <div className="space-y-2">
                      {permissions.map((p) => {
                        const labels = permissionLabels.filter((l) => p[l.key]).map((l) => l.label);
                        return (
                          <div key={p.id} className="rounded-lg border px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{villageMembers.find((m) => m.user_id === p.user_id)?.full_name || 'User'}</p>
                              <p className="text-xs text-muted-foreground">{labels.join(', ') || 'View only'}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPermissionForm({
                              user_id: p.user_id,
                              can_manage_game: p.can_manage_game,
                              can_manage_teams: p.can_manage_teams,
                              can_update_scores: p.can_update_scores,
                              can_add_commentary: p.can_add_commentary,
                              can_upload_memories: p.can_upload_memories,
                              can_control_timer: p.can_control_timer,
                            })}>Edit</Button>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default GamesPage;
