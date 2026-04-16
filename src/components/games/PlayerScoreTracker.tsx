import React from 'react';
import { Button } from '@/components/ui/button';
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
  game_id: string;
  team_id: string;
  member_id: string;
  action_type: string;
  points: number;
  description: string | null;
  created_at: string;
};

interface PlayerScoreTrackerProps {
  teams: TeamRow[];
  members: MemberRow[];
  playerActions: PlayerAction[];
  gameType: string;
  isPending: boolean;
  canScore: boolean;
  onPlayerAction: (params: {
    teamId: string;
    memberId: string;
    actionType: string;
    points: number;
    description: string;
  }) => void;
}

// Sport-specific action configs
const sportActions: Record<string, Array<{ key: string; label: string; emoji: string; points: number; variant?: 'destructive' }>> = {
  kabaddi: [
    { key: 'raid_point', label: 'Raid', emoji: '🏃', points: 1 },
    { key: 'touch_point', label: 'Touch', emoji: '👋', points: 1 },
    { key: 'tackle', label: 'Tackle', emoji: '🤼', points: 1 },
    { key: 'super_raid', label: 'Super Raid', emoji: '🔥', points: 3 },
    { key: 'super_tackle', label: 'Super Tackle', emoji: '💪', points: 2 },
    { key: 'bonus', label: 'Bonus', emoji: '⭐', points: 1 },
    { key: 'out', label: 'Out', emoji: '❌', points: 0, variant: 'destructive' },
  ],
  cricket: [
    { key: 'runs', label: '1 Run', emoji: '1️⃣', points: 1 },
    { key: 'runs_2', label: '2 Runs', emoji: '2️⃣', points: 2 },
    { key: 'four', label: 'Four', emoji: '4️⃣', points: 4 },
    { key: 'six', label: 'Six', emoji: '6️⃣', points: 6 },
    { key: 'catch', label: 'Catch', emoji: '🙌', points: 0 },
    { key: 'run_out', label: 'Run Out', emoji: '🏃‍♂️', points: 0 },
  ],
  volleyball: [
    { key: 'kill', label: 'Kill', emoji: '💥', points: 1 },
    { key: 'ace', label: 'Ace', emoji: '🎯', points: 1 },
    { key: 'block', label: 'Block', emoji: '🛡️', points: 1 },
    { key: 'dig', label: 'Dig', emoji: '🤲', points: 0 },
    { key: 'assist', label: 'Assist', emoji: '🤝', points: 0 },
    { key: 'error', label: 'Error', emoji: '❌', points: 0, variant: 'destructive' },
  ],
  kho_kho: [
    { key: 'tag_out', label: 'Tag Out', emoji: '🏃', points: 1 },
    { key: 'dodge', label: 'Dodge', emoji: '💨', points: 0 },
    { key: 'point', label: 'Point', emoji: '⭐', points: 1 },
  ],
  tug_of_war: [
    { key: 'round_won', label: 'Round Won', emoji: '🏆', points: 1 },
    { key: 'effort', label: 'Key Effort', emoji: '💪', points: 0 },
  ],
};

const defaultActions = [
  { key: 'point', label: '+1 Point', emoji: '⭐', points: 1 },
  { key: 'assist', label: 'Assist', emoji: '🤝', points: 0 },
  { key: 'foul', label: 'Foul', emoji: '⚠️', points: 0, variant: 'destructive' as const },
];

const PlayerScoreTracker: React.FC<PlayerScoreTrackerProps> = ({
  teams,
  members,
  playerActions,
  gameType,
  isPending,
  canScore,
  onPlayerAction,
}) => {
  const [activeTeamId, setActiveTeamId] = React.useState<string>(teams[0]?.id ?? '');
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeTeamId && teams.length) setActiveTeamId(teams[0].id);
  }, [teams, activeTeamId]);

  const actions = sportActions[gameType] ?? defaultActions;
  const teamMembers = members.filter(m => m.team_id === activeTeamId && m.is_playing !== false);

  // Aggregate stats per player
  const getPlayerStats = (memberId: string) => {
    const acts = playerActions.filter(a => a.member_id === memberId);
    const totalPoints = acts.reduce((sum, a) => sum + a.points, 0);
    const actionCounts: Record<string, number> = {};
    acts.forEach(a => {
      actionCounts[a.action_type] = (actionCounts[a.action_type] ?? 0) + 1;
    });
    return { totalPoints, actionCounts, totalActions: acts.length };
  };

  // Sort players by total points descending
  const sortedMembers = [...teamMembers].sort((a, b) => {
    return getPlayerStats(b.id).totalPoints - getPlayerStats(a.id).totalPoints;
  });

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">👤 Player Stats & Scoring</h3>
        <div className="flex gap-1">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTeamId(t.id); setSelectedPlayerId(null); }}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                activeTeamId === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color_tag ?? '#16a34a' }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Player cards */}
      <div className="space-y-2">
        {sortedMembers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No playing members in this team.</p>
        )}
        {sortedMembers.map(member => {
          const stats = getPlayerStats(member.id);
          const isSelected = selectedPlayerId === member.id;

          return (
            <div key={member.id} className="space-y-0">
              <button
                type="button"
                onClick={() => setSelectedPlayerId(isSelected ? null : member.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-3 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-background hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {member.jersey_number && (
                      <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {member.jersey_number}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{member.member_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums text-primary">{stats.totalPoints}</p>
                    <p className="text-[10px] text-muted-foreground">{stats.totalActions} actions</p>
                  </div>
                </div>

                {/* Mini stat badges */}
                {Object.keys(stats.actionCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(stats.actionCounts).map(([actionKey, count]) => {
                      const actionDef = actions.find(a => a.key === actionKey);
                      return (
                        <Badge key={actionKey} variant="outline" className="text-[10px] py-0 px-1.5">
                          {actionDef?.emoji ?? '•'} {actionDef?.label ?? actionKey}: {count}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* Action buttons when selected */}
              {isSelected && canScore && (
                <div className="px-2 pt-2 pb-1">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {actions.map(action => (
                      <Button
                        key={action.key}
                        variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={isPending}
                        onClick={() => onPlayerAction({
                          teamId: activeTeamId,
                          memberId: member.id,
                          actionType: action.key,
                          points: action.points,
                          description: `${member.member_name}: ${action.label}`,
                        })}
                        className="h-10 flex flex-col items-center justify-center gap-0 text-xs"
                      >
                        <span className="text-sm leading-none">{action.emoji}</span>
                        <span className="text-[9px] leading-none mt-0.5">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isPending && (
        <p className="text-xs text-center text-muted-foreground animate-pulse">Saving...</p>
      )}
    </div>
  );
};

export default PlayerScoreTracker;
