import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TeamRow = {
  id: string;
  name: string;
  color_tag: string | null;
};

type MemberRow = {
  id: string;
  team_id: string;
  member_name: string;
  role: string;
  jersey_number: string | null;
  is_playing: boolean;
};

type PlayerAction = {
  id: string;
  team_id: string;
  member_id: string;
  action_type: string;
  points: number;
  description: string | null;
};

interface PlayerStatsViewProps {
  teams: TeamRow[];
  members: MemberRow[];
  playerActions: PlayerAction[];
  gameType: string;
}

// Labels for display
const actionLabels: Record<string, Record<string, string>> = {
  kabaddi: { raid_point: 'Raids', touch_point: 'Touches', tackle: 'Tackles', super_raid: 'S.Raids', super_tackle: 'S.Tackles', bonus: 'Bonus', out: 'Outs' },
  volleyball: { kill: 'Kills', ace: 'Aces', block: 'Blocks', dig: 'Digs', assist: 'Assists', error: 'Errors' },
  kho_kho: { tag_out: 'Tag Outs', dodge: 'Dodges', point: 'Points' },
  tug_of_war: { round_won: 'Rounds', effort: 'Key Efforts' },
};

const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({ teams, members, playerActions, gameType }) => {
  const [activeTeamId, setActiveTeamId] = React.useState<string>(teams[0]?.id ?? '');

  React.useEffect(() => {
    if (!activeTeamId && teams.length) setActiveTeamId(teams[0].id);
  }, [teams, activeTeamId]);

  const teamMembers = members.filter(m => m.team_id === activeTeamId);
  const labels = actionLabels[gameType] ?? {};

  const getPlayerStats = (memberId: string) => {
    const acts = playerActions.filter(a => a.member_id === memberId);
    const totalPoints = acts.reduce((sum, a) => sum + a.points, 0);
    const counts: Record<string, number> = {};
    acts.forEach(a => { counts[a.action_type] = (counts[a.action_type] ?? 0) + 1; });
    return { totalPoints, counts };
  };

  const sorted = [...teamMembers].sort((a, b) => getPlayerStats(b.id).totalPoints - getPlayerStats(a.id).totalPoints);

  if (playerActions.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">👤 Player Performance</h3>
        <div className="flex gap-1">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTeamId(t.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                activeTeamId === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color_tag ?? '#16a34a' }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.map((member, i) => {
          const stats = getPlayerStats(member.id);
          if (stats.totalPoints === 0 && Object.keys(stats.counts).length === 0) return null;
          return (
            <div key={member.id} className={cn(
              'flex items-center justify-between rounded-xl px-3 py-2.5',
              i === 0 && stats.totalPoints > 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {member.member_name}
                    {member.jersey_number && <span className="text-xs text-muted-foreground ml-1">#{member.jersey_number}</span>}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(stats.counts).map(([key, count]) => (
                      <span key={key} className="text-[10px] text-muted-foreground">
                        {labels[key] ?? key}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-lg font-black tabular-nums text-primary flex-shrink-0 ml-2">
                {stats.totalPoints}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerStatsView;
