import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ScoreRow = {
  id: string;
  team_id: string | null;
  points: number;
  description: string | null;
  score_type: string;
  over_marker: string | null;
  timestamp: string;
};

type TeamRow = {
  id: string;
  name: string;
  color_tag: string | null;
};

interface ScoreTimelineProps {
  scores: ScoreRow[];
  teams: TeamRow[];
  maxItems?: number;
}

const formatTime = (d: string) => {
  try { return format(new Date(d), 'hh:mm a'); } catch { return d; }
};

const ScoreTimeline: React.FC<ScoreTimelineProps> = ({ scores, teams, maxItems = 15 }) => {
  const getTeam = (teamId: string | null) => teams.find(t => t.id === teamId);

  if (scores.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No score events yet. Start scoring to see the timeline!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="font-semibold text-sm mb-3">📊 Score Timeline</h3>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {scores.slice(0, maxItems).map((entry, i) => {
          const team = getTeam(entry.team_id);
          const isWicket = entry.score_type === 'wicket';
          const isBig = entry.points >= 4;
          
          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                isWicket ? 'bg-destructive/10 border border-destructive/20' :
                isBig ? 'bg-primary/5 border border-primary/10' :
                'bg-muted/30'
              )}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full flex-shrink-0',
                    isWicket ? 'bg-destructive' : 'bg-primary/50'
                  )}
                  style={team ? { backgroundColor: team.color_tag ?? undefined } : undefined}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{team?.name ?? 'Match'}</span>
                  {entry.over_marker && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{entry.over_marker}</Badge>
                  )}
                </div>
                {entry.description && (
                  <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                )}
              </div>

              {/* Score badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  isWicket ? 'text-destructive' :
                  entry.points > 0 ? 'text-primary' :
                  'text-muted-foreground'
                )}>
                  {entry.points > 0 ? `+${entry.points}` : entry.points}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreTimeline;
