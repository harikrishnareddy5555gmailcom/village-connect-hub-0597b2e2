import React from 'react';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TeamRow = {
  id: string;
  name: string;
  color_tag: string | null;
  wickets: number;
  overs: number;
  is_winner: boolean;
  captain_name: string | null;
  score_adjustment: number;
};

type ScoreRow = {
  id: string;
  team_id: string | null;
  points: number;
};

interface GameScoreboardProps {
  teams: TeamRow[];
  scores: ScoreRow[];
  gameType: string;
  oversLimit?: number | null;
  targetScore?: number | null;
  isCompleted: boolean;
  winnerTeamId: string | null;
}

const GameScoreboard: React.FC<GameScoreboardProps> = ({
  teams,
  scores,
  gameType,
  oversLimit,
  targetScore,
  isCompleted,
  winnerTeamId,
}) => {
  const getTeamTotal = (teamId: string) =>
    (teams.find((t) => t.id === teamId)?.score_adjustment ?? 0) +
    scores.filter((s) => s.team_id === teamId).reduce((sum, s) => sum + Number(s.points || 0), 0);

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        No teams added yet
      </div>
    );
  }

  const teamA = teams[0];
  const teamB = teams[1];
  const scoreA = getTeamTotal(teamA.id);
  const scoreB = teamB ? getTeamTotal(teamB.id) : 0;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* VS Header */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-0">
          {/* Team A */}
          <div
            className={cn(
              'relative p-4 sm:p-6 text-center transition-all',
              teamA.is_winner && 'bg-yellow-50/50 dark:bg-yellow-900/10'
            )}
          >
            <div
              className="absolute inset-0 opacity-5"
              style={{ backgroundColor: teamA.color_tag ?? '#16a34a' }}
            />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span
                  className="h-4 w-4 rounded-full ring-2 ring-background shadow-sm"
                  style={{ backgroundColor: teamA.color_tag ?? '#16a34a' }}
                />
                <p className="font-bold text-sm sm:text-base truncate">{teamA.name}</p>
                {teamA.is_winner && <Trophy size={14} className="text-yellow-500 flex-shrink-0" />}
              </div>
              <p className="text-4xl sm:text-6xl font-black tabular-nums tracking-tight">
                {scoreA}
              </p>
              {gameType === 'cricket' && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {teamA.wickets}/{oversLimit ?? '∞'} wkts · {teamA.overs} ov
                </p>
              )}
              {gameType === 'kabaddi' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {teamA.wickets} out
                </p>
              )}
            </div>
          </div>

          {/* Team B */}
          {teamB && (
            <div
              className={cn(
                'relative p-4 sm:p-6 text-center border-l transition-all',
                teamB.is_winner && 'bg-yellow-50/50 dark:bg-yellow-900/10'
              )}
            >
              <div
                className="absolute inset-0 opacity-5"
                style={{ backgroundColor: teamB.color_tag ?? '#dc2626' }}
              />
              <div className="relative">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className="h-4 w-4 rounded-full ring-2 ring-background shadow-sm"
                    style={{ backgroundColor: teamB.color_tag ?? '#dc2626' }}
                  />
                  <p className="font-bold text-sm sm:text-base truncate">{teamB.name}</p>
                  {teamB.is_winner && <Trophy size={14} className="text-yellow-500 flex-shrink-0" />}
                </div>
                <p className="text-4xl sm:text-6xl font-black tabular-nums tracking-tight">
                  {scoreB}
                </p>
                {gameType === 'cricket' && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {teamB.wickets}/{oversLimit ?? '∞'} wkts · {teamB.overs} ov
                  </p>
                )}
                {gameType === 'kabaddi' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {teamB.wickets} out
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* VS badge */}
        {teamB && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="h-10 w-10 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold text-muted-foreground">VS</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t px-4 py-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
        {targetScore && <span>Target: {targetScore}</span>}
        {oversLimit && <span>{oversLimit} overs</span>}
        {isCompleted && winnerTeamId && (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">
            🏆 {teams.find(t => t.id === winnerTeamId)?.name} won!
          </Badge>
        )}
      </div>
    </div>
  );
};

export default GameScoreboard;
