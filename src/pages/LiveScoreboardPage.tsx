import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Radio, Trophy } from 'lucide-react';
import GameScoreboard from '@/components/games/GameScoreboard';
import ScoreTimeline from '@/components/games/ScoreTimeline';
import PlayerStatsView from '@/components/games/PlayerStatsView';

const formatIndiaDate = (d: string) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; } };
const formatIndiaTime = (d: string) => { try { return format(new Date(d), 'hh:mm a'); } catch { return d; } };

type GameRow = { id: string; title: string; description: string | null; venue: string | null; game_type: string; status: string; overs_limit: number | null; winner_team_id: string | null; village_id: string; festival_date: string | null; };
type TeamRow = { id: string; game_id: string; name: string; color_tag: string | null; score_adjustment: number; wickets: number; overs: number; is_winner: boolean; captain_name: string | null; };
type ScoreRow = { id: string; game_id: string; team_id: string | null; points: number; description: string | null; score_type: string; over_marker: string | null; timestamp: string; };
type CommentaryRow = { id: string; game_id: string; team_id: string | null; commentary: string; over_marker: string | null; created_at: string; };
type MemberRow = { id: string; team_id: string; member_name: string; role: string; jersey_number: string | null; is_playing: boolean; };
type CricketStateRow = { id: string; game_id: string; batting_team_id: string | null; bowling_team_id: string | null; striker_member_id: string | null; non_striker_member_id: string | null; bowler_member_id: string | null; current_over: number; current_ball_in_over: number; };
type CricketStatsRow = { id: string; member_id: string; team_id: string; runs_scored: number; balls_faced: number; fours: number; sixes: number; is_out: boolean; wicket_type: string | null; overs_bowled_balls: number; runs_conceded: number; wickets_taken: number; wides: number; no_balls: number; };
type PlayerActionRow = { id: string; game_id: string; team_id: string; member_id: string; action_type: string; points: number; description: string | null; created_at: string; };

const LiveScoreboardPage: React.FC = () => {
  const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);

  // Fetch all villages to show names
  const villagesQuery = useQuery({
    queryKey: ['public-villages'],
    queryFn: async () => {
      const { data } = await supabase.from('villages').select('id, name').eq('is_active', true);
      return data ?? [];
    },
  });

  // Fetch ongoing and recent games across all villages
  const gamesQuery = useQuery({
    queryKey: ['public-games'],
    queryFn: async () => {
      const { data } = await supabase.from('games').select('*').in('status', ['ongoing', 'completed']).order('updated_at', { ascending: false }).limit(20);
      return (data ?? []) as unknown as GameRow[];
    },
    refetchInterval: 10000,
  });

  const games = gamesQuery.data ?? [];
  const selectedGame = games.find(g => g.id === selectedGameId) ?? null;

  React.useEffect(() => {
    if (!selectedGameId && games.length) {
      const live = games.find(g => g.status === 'ongoing');
      setSelectedGameId(live?.id ?? games[0]?.id ?? null);
    }
  }, [games, selectedGameId]);

  const teamsQuery = useQuery({
    queryKey: ['public-teams', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data } = await supabase.from('game_teams').select('*').eq('game_id', selectedGameId!).order('created_at');
      return (data ?? []) as unknown as TeamRow[];
    },
    refetchInterval: 5000,
  });

  const scoresQuery = useQuery({
    queryKey: ['public-scores', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data } = await supabase.from('scores').select('*').eq('game_id', selectedGameId!).order('timestamp', { ascending: false });
      return (data ?? []) as unknown as ScoreRow[];
    },
    refetchInterval: 5000,
  });

  const commentaryQuery = useQuery({
    queryKey: ['public-commentary', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data } = await supabase.from('game_commentary').select('*').eq('game_id', selectedGameId!).order('created_at', { ascending: false }).limit(30);
      return (data ?? []) as unknown as CommentaryRow[];
    },
    refetchInterval: 5000,
  });

  const membersQuery = useQuery({
    queryKey: ['public-members', selectedGameId],
    enabled: !!selectedGameId,
    queryFn: async () => {
      const { data } = await supabase.from('game_team_members').select('*').eq('game_id', selectedGameId!).order('created_at');
      return (data ?? []) as unknown as MemberRow[];
    },
    refetchInterval: 10000,
  });

  const cricketStateQuery = useQuery({
    queryKey: ['public-cricket-state', selectedGameId],
    enabled: !!selectedGameId && selectedGame?.game_type === 'cricket',
    queryFn: async () => {
      const { data } = await supabase.from('game_cricket_states').select('*').eq('game_id', selectedGameId!).maybeSingle();
      return (data ?? null) as unknown as CricketStateRow | null;
    },
    refetchInterval: 5000,
  });

  const cricketStatsQuery = useQuery({
    queryKey: ['public-cricket-stats', selectedGameId],
    enabled: !!selectedGameId && selectedGame?.game_type === 'cricket',
    queryFn: async () => {
      const { data } = await supabase.from('game_cricket_player_stats').select('*').eq('game_id', selectedGameId!);
      return (data ?? []) as unknown as CricketStatsRow[];
    },
    refetchInterval: 5000,
  });

  const teams = teamsQuery.data ?? [];
  const scores = scoresQuery.data ?? [];
  const commentary = commentaryQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const cricketState = cricketStateQuery.data ?? null;
  const cricketStats = cricketStatsQuery.data ?? [];
  const villages = villagesQuery.data ?? [];

  const getTeamTotal = (teamId: string) =>
    (teams.find(t => t.id === teamId)?.score_adjustment ?? 0) +
    scores.filter(s => s.team_id === teamId).reduce((sum, s) => sum + Number(s.points || 0), 0);

  const getTeamMembers = (teamId: string) => members.filter(m => m.team_id === teamId);
  const getStats = (memberId: string) => cricketStats.find(s => s.member_id === memberId);
  const getVillageName = (villageId: string) => villages.find(v => v.id === villageId)?.name ?? '';

  // Realtime subscriptions
  React.useEffect(() => {
    if (!selectedGameId) return;
    const channel = supabase
      .channel(`public-live-${selectedGameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `game_id=eq.${selectedGameId}` }, () => {})
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_commentary', filter: `game_id=eq.${selectedGameId}` }, () => {})
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_teams', filter: `game_id=eq.${selectedGameId}` }, () => {})
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_cricket_states', filter: `game_id=eq.${selectedGameId}` }, () => {})
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_cricket_player_stats', filter: `game_id=eq.${selectedGameId}` }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGameId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🏏 Live Scoreboard</h1>
            <p className="text-xs text-muted-foreground">Watch village matches live — no login needed</p>
          </div>
          {selectedGame?.status === 'ongoing' && (
            <Badge className="bg-destructive/15 text-destructive border-destructive/20 animate-pulse">
              <Radio size={10} className="mr-1" /> LIVE
            </Badge>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Game selector */}
        {games.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {games.map(g => (
              <button key={g.id} onClick={() => setSelectedGameId(g.id)}
                className={cn('rounded-lg border px-3 py-2 text-sm transition-all', selectedGameId === g.id ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:bg-muted/50')}>
                {g.status === 'ongoing' && <Radio size={10} className="inline mr-1 text-destructive animate-pulse" />}
                {g.title}
                {getVillageName(g.village_id) && <span className="text-xs text-muted-foreground ml-1">· {getVillageName(g.village_id)}</span>}
              </button>
            ))}
          </div>
        )}

        {!selectedGame && (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            {gamesQuery.isLoading ? 'Loading matches...' : 'No live or recent matches right now.'}
          </div>
        )}

        {selectedGame && (
          <>
            {/* Match info */}
            <div className="text-center">
              <h2 className="text-2xl font-bold">{selectedGame.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedGame.game_type.replace('_', ' ')} {selectedGame.venue ? `· ${selectedGame.venue}` : ''} {selectedGame.festival_date ? `· ${formatIndiaDate(selectedGame.festival_date)}` : ''}
              </p>
              {selectedGame.overs_limit && <p className="text-xs text-muted-foreground">{selectedGame.overs_limit} overs match</p>}
            </div>

            {/* Winner banner */}
            {selectedGame.status === 'completed' && selectedGame.winner_team_id && (
              <div className="rounded-xl border border-yellow-300/30 bg-yellow-50 dark:bg-yellow-900/10 p-4 text-center">
                <Trophy className="inline mr-2 text-yellow-500" size={18} />
                <span className="font-semibold">Winner: {teams.find(t => t.id === selectedGame.winner_team_id)?.name ?? 'TBD'}</span>
              </div>
            )}

            {/* Scoreboard */}
            <GameScoreboard
              teams={teams}
              scores={scores}
              gameType={selectedGame.game_type}
              oversLimit={selectedGame.overs_limit}
              targetScore={null}
              isCompleted={selectedGame.status === 'completed'}
              winnerTeamId={selectedGame.winner_team_id}
            />

            {/* Cricket state info */}
            {selectedGame.game_type === 'cricket' && cricketState && (
              <div className="rounded-xl border p-4">
                <div className="flex flex-wrap gap-4 justify-center text-sm">
                  <span>Over: <strong>{cricketState.current_over}.{cricketState.current_ball_in_over}</strong></span>
                  {cricketState.striker_member_id && (
                    <span>🏏 {members.find(m => m.id === cricketState.striker_member_id)?.member_name ?? 'Striker'} *</span>
                  )}
                  {cricketState.non_striker_member_id && (
                    <span>{members.find(m => m.id === cricketState.non_striker_member_id)?.member_name ?? 'Non-striker'}</span>
                  )}
                  {cricketState.bowler_member_id && (
                    <span>🎳 {members.find(m => m.id === cricketState.bowler_member_id)?.member_name ?? 'Bowler'}</span>
                  )}
                </div>
              </div>
            )}

            {/* Cricket Batting & Bowling cards */}
            {selectedGame.game_type === 'cricket' && cricketState && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold mb-3">Batting</h3>
                  <div className="space-y-1.5">
                    {getTeamMembers(cricketState.batting_team_id ?? '').map(m => {
                      const s = getStats(m.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{m.member_name}</span>
                            {m.id === cricketState.striker_member_id && <span className="text-xs text-primary ml-1">*</span>}
                            {s?.is_out && <span className="text-xs text-destructive ml-1">({s.wicket_type})</span>}
                          </div>
                          <span className="tabular-nums">{s?.runs_scored ?? 0} ({s?.balls_faced ?? 0})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold mb-3">Bowling</h3>
                  <div className="space-y-1.5">
                    {getTeamMembers(cricketState.bowling_team_id ?? '').filter(m => {
                      const s = getStats(m.id);
                      return (s?.overs_bowled_balls ?? 0) > 0 || m.id === cricketState.bowler_member_id;
                    }).map(m => {
                      const s = getStats(m.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{m.member_name}</span>
                            {m.id === cricketState.bowler_member_id && <span className="text-xs text-primary ml-1">🎳</span>}
                          </div>
                          <span className="tabular-nums text-xs">
                            {Math.floor((s?.overs_bowled_balls ?? 0) / 6)}.{(s?.overs_bowled_balls ?? 0) % 6} ov · {s?.wickets_taken ?? 0}W · {s?.runs_conceded ?? 0}R
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Commentary feed */}
            <div className="rounded-xl border p-4">
              <h3 className="font-semibold mb-3">📢 Live Commentary</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {commentary.length === 0 && <p className="text-sm text-muted-foreground">No commentary yet.</p>}
                {commentary.map(c => (
                  <div key={c.id} className="rounded-lg bg-muted/20 px-3 py-2">
                    <div className="flex items-center justify-between">
                      {c.over_marker && <Badge variant="outline" className="text-[10px]">{c.over_marker}</Badge>}
                      <span className="text-xs text-muted-foreground">{formatIndiaTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm mt-1">{c.commentary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Timeline */}
            <ScoreTimeline scores={scores} teams={teams} />

            {/* Teams list */}
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map(team => (
                <div key={team.id} className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color_tag ?? '#16a34a' }} />
                    <h3 className="font-semibold">{team.name}</h3>
                  </div>
                  <div className="space-y-1">
                    {getTeamMembers(team.id).map(m => (
                      <div key={m.id} className={cn('rounded px-2 py-1 text-sm', m.is_playing === false ? 'opacity-50 line-through' : '')}>
                        {m.member_name} <span className="text-xs text-muted-foreground">{m.role}{m.jersey_number ? ` #${m.jersey_number}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveScoreboardPage;
