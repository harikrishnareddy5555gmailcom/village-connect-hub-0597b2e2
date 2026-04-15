import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TeamRow = {
  id: string;
  name: string;
  color_tag: string | null;
  wickets: number;
  overs: number;
  score_adjustment: number;
};

interface QuickScorePanelProps {
  teams: TeamRow[];
  gameType: string;
  isPending: boolean;
  onQuickScore: (params: { team: TeamRow; points: number; scoreType: string; description: string; wicketDelta?: number }) => void;
}

const QuickScorePanel: React.FC<QuickScorePanelProps> = ({ teams, gameType, isPending, onQuickScore }) => {
  const [activeTeamId, setActiveTeamId] = React.useState<string>(teams[0]?.id ?? '');
  const activeTeam = teams.find(t => t.id === activeTeamId);

  React.useEffect(() => {
    if (!activeTeamId && teams.length) setActiveTeamId(teams[0].id);
  }, [teams, activeTeamId]);

  if (!activeTeam) return null;

  const configs: Record<string, Array<{ label: string; emoji?: string; points: number; scoreType: string; desc: string; wicketDelta?: number; variant?: 'destructive' | 'outline' | 'default'; size?: 'lg' }>> = {
    cricket: [
      { label: '0', emoji: '•', points: 0, scoreType: 'points', desc: 'Dot ball' },
      { label: '1', points: 1, scoreType: 'points', desc: '1 run' },
      { label: '2', points: 2, scoreType: 'points', desc: '2 runs' },
      { label: '3', points: 3, scoreType: 'points', desc: '3 runs' },
      { label: '4', emoji: '4️⃣', points: 4, scoreType: 'points', desc: 'FOUR!', size: 'lg' },
      { label: '6', emoji: '6️⃣', points: 6, scoreType: 'points', desc: 'SIX!', size: 'lg' },
      { label: 'Wide', emoji: 'Wd', points: 1, scoreType: 'bonus', desc: 'Wide ball' },
      { label: 'No Ball', emoji: 'Nb', points: 1, scoreType: 'bonus', desc: 'No ball' },
      { label: 'Wicket', emoji: 'W', points: 0, scoreType: 'wicket', desc: 'Wicket!', wicketDelta: 1, variant: 'destructive' },
    ],
    kabaddi: [
      { label: 'Touch', emoji: '👋', points: 1, scoreType: 'points', desc: 'Touch point' },
      { label: 'Bonus', emoji: '⭐', points: 1, scoreType: 'bonus', desc: 'Bonus line point' },
      { label: 'Tackle', emoji: '🤼', points: 1, scoreType: 'points', desc: 'Tackle point' },
      { label: 'Super Raid', emoji: '🔥', points: 3, scoreType: 'points', desc: 'Super raid (3+ pts)' },
      { label: 'Super Tackle', emoji: '💪', points: 2, scoreType: 'points', desc: 'Super tackle' },
      { label: 'All Out', emoji: '💥', points: 2, scoreType: 'bonus', desc: 'All out bonus' },
      { label: 'Empty Raid', emoji: '❌', points: 0, scoreType: 'note', desc: 'Empty raid' },
      { label: 'Player Out', points: 0, scoreType: 'wicket', desc: 'Player out', wicketDelta: 1, variant: 'destructive' },
    ],
    volleyball: [
      { label: 'Kill', emoji: '💥', points: 1, scoreType: 'points', desc: 'Kill point' },
      { label: 'Ace', emoji: '🎯', points: 1, scoreType: 'points', desc: 'Service ace' },
      { label: 'Block', emoji: '🛡️', points: 1, scoreType: 'points', desc: 'Block point' },
      { label: 'Error', emoji: '❌', points: 1, scoreType: 'points', desc: 'Opponent error' },
      { label: 'Point', emoji: '+1', points: 1, scoreType: 'points', desc: 'Point scored' },
    ],
    kho_kho: [
      { label: 'Tag Out', emoji: '🏃', points: 1, scoreType: 'points', desc: 'Runner tagged out' },
      { label: 'Point', emoji: '+1', points: 1, scoreType: 'points', desc: 'Point scored' },
      { label: 'Bonus', emoji: '⭐', points: 1, scoreType: 'bonus', desc: 'Bonus point' },
    ],
    tug_of_war: [
      { label: 'Round Won', emoji: '🏆', points: 1, scoreType: 'points', desc: 'Round won', size: 'lg' },
      { label: 'Foul', emoji: '⚠️', points: -1, scoreType: 'note', desc: 'Foul penalty' },
    ],
  };

  const buttons = configs[gameType] ?? [
    { label: '+1', points: 1, scoreType: 'points', desc: '+1 point' },
    { label: '+2', points: 2, scoreType: 'points', desc: '+2 points' },
    { label: '+3', points: 3, scoreType: 'points', desc: '+3 points' },
    { label: '+5', points: 5, scoreType: 'points', desc: '+5 points' },
    { label: '-1', points: -1, scoreType: 'note', desc: 'Penalty -1' },
    { label: 'Foul', points: 0, scoreType: 'note', desc: 'Foul', variant: 'destructive' as const },
  ];

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">⚡ Quick Score</h3>
        <div className="flex gap-1">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTeamId(t.id)}
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

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {buttons.map((btn) => (
          <Button
            key={btn.label}
            variant={btn.variant === 'destructive' ? 'destructive' : 'outline'}
            disabled={isPending}
            onClick={() => onQuickScore({
              team: activeTeam,
              points: btn.points,
              scoreType: btn.scoreType,
              description: btn.desc,
              wicketDelta: btn.wicketDelta,
            })}
            className={cn(
              'h-14 sm:h-12 flex flex-col items-center justify-center gap-0.5 text-xs font-medium',
              btn.size === 'lg' && 'col-span-1 ring-1 ring-primary/20 bg-primary/5'
            )}
          >
            <span className="text-lg leading-none">{btn.emoji ?? btn.label}</span>
            <span className="text-[10px] text-muted-foreground leading-none">{btn.label}</span>
          </Button>
        ))}
      </div>

      {isPending && (
        <p className="mt-2 text-xs text-center text-muted-foreground animate-pulse">Saving...</p>
      )}
    </div>
  );
};

export default QuickScorePanel;
