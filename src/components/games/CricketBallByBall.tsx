import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type CricketStateRow = {
  current_over: number;
  current_ball_in_over: number;
  striker_member_id: string | null;
  non_striker_member_id: string | null;
  bowler_member_id: string | null;
  batting_team_id: string | null;
  bowling_team_id: string | null;
};

type MemberRow = {
  id: string;
  member_name: string;
  is_playing: boolean;
};

interface CricketBallByBallProps {
  cricketState: CricketStateRow;
  members: MemberRow[];
  isPending: boolean;
  wicketType: string;
  onWicketTypeChange: (type: string) => void;
  onRecordBall: (params: {
    runs: number;
    isWicket?: boolean;
    isWide?: boolean;
    isNoBall?: boolean;
    wicketType?: string;
    outPlayerId?: string;
  }) => void;
}

const CricketBallByBall: React.FC<CricketBallByBallProps> = ({
  cricketState,
  members,
  isPending,
  wicketType,
  onWicketTypeChange,
  onRecordBall,
}) => {
  const getMemberName = (id: string | null) => members.find(m => m.id === id)?.member_name ?? 'Not set';
  const ready = !!cricketState.striker_member_id && !!cricketState.non_striker_member_id && !!cricketState.bowler_member_id;

  // Balls in this over visualization
  const ballsInOver = cricketState.current_ball_in_over;
  const ballDots = Array.from({ length: 6 }, (_, i) => i < ballsInOver);

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base">🏏 Ball-by-Ball</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm font-mono px-3 py-1">
            {cricketState.current_over}.{cricketState.current_ball_in_over}
          </Badge>
        </div>
      </div>

      {/* Current players */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-background border px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Striker</p>
          <p className="font-bold text-sm truncate">🏏 {getMemberName(cricketState.striker_member_id)}</p>
        </div>
        <div className="rounded-xl bg-background border px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Non-Striker</p>
          <p className="font-medium text-sm truncate">{getMemberName(cricketState.non_striker_member_id)}</p>
        </div>
        <div className="rounded-xl bg-background border px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bowler</p>
          <p className="font-bold text-sm truncate">🎳 {getMemberName(cricketState.bowler_member_id)}</p>
        </div>
      </div>

      {/* Over progress */}
      <div className="flex items-center gap-1.5 mb-4 justify-center">
        {ballDots.map((filled, i) => (
          <div
            key={i}
            className={cn(
              'h-3 w-3 rounded-full transition-all',
              filled ? 'bg-primary scale-110' : 'bg-muted border border-border'
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">Over {cricketState.current_over + 1}</span>
      </div>

      {!ready && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 mb-4">
          <p className="text-sm text-destructive font-medium">
            ⚠️ Set striker, non-striker, and bowler in Cricket Setup before recording balls.
          </p>
        </div>
      )}

      {/* Run buttons - big and touch-friendly */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Button
          variant="outline"
          disabled={isPending || !ready}
          onClick={() => onRecordBall({ runs: 0 })}
          className="h-14 text-lg font-bold"
        >
          <div className="flex flex-col items-center">
            <span className="text-xl">•</span>
            <span className="text-[10px] text-muted-foreground">Dot</span>
          </div>
        </Button>
        {[1, 2, 3].map(r => (
          <Button
            key={r}
            variant="outline"
            disabled={isPending || !ready}
            onClick={() => onRecordBall({ runs: r })}
            className="h-14 text-lg font-bold"
          >
            {r}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Button
          variant="outline"
          disabled={isPending || !ready}
          onClick={() => onRecordBall({ runs: 4 })}
          className="h-14 text-lg font-bold bg-primary/5 ring-1 ring-primary/20 col-span-1"
        >
          <div className="flex flex-col items-center">
            <span>4️⃣</span>
            <span className="text-[10px] text-muted-foreground">Four</span>
          </div>
        </Button>
        <Button
          variant="outline"
          disabled={isPending || !ready}
          onClick={() => onRecordBall({ runs: 6 })}
          className="h-14 text-lg font-bold bg-primary/5 ring-1 ring-primary/20 col-span-1"
        >
          <div className="flex flex-col items-center">
            <span>6️⃣</span>
            <span className="text-[10px] text-muted-foreground">Six</span>
          </div>
        </Button>
        <Button
          variant="outline"
          disabled={isPending || !ready}
          onClick={() => onRecordBall({ runs: 0, isWide: true })}
          className="h-14 text-sm font-medium"
        >
          <div className="flex flex-col items-center">
            <span className="text-base">Wd</span>
            <span className="text-[10px] text-muted-foreground">Wide</span>
          </div>
        </Button>
        <Button
          variant="outline"
          disabled={isPending || !ready}
          onClick={() => onRecordBall({ runs: 0, isNoBall: true })}
          className="h-14 text-sm font-medium"
        >
          <div className="flex flex-col items-center">
            <span className="text-base">Nb</span>
            <span className="text-[10px] text-muted-foreground">No Ball</span>
          </div>
        </Button>
      </div>

      {/* Wicket section */}
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          disabled={isPending || !ready}
          onClick={() => onRecordBall({
            runs: 0,
            isWicket: true,
            wicketType,
            outPlayerId: cricketState.striker_member_id!,
          })}
          className="h-12 flex-1 text-sm font-bold"
        >
          🔴 WICKET
        </Button>
        <select
          className="h-12 rounded-lg border border-input bg-background px-3 text-sm min-w-[120px]"
          value={wicketType}
          onChange={(e) => onWicketTypeChange(e.target.value)}
        >
          <option value="bowled">Bowled</option>
          <option value="caught">Caught</option>
          <option value="lbw">LBW</option>
          <option value="run_out">Run Out</option>
          <option value="stumped">Stumped</option>
          <option value="hit_wicket">Hit Wicket</option>
        </select>
      </div>

      {isPending && (
        <p className="mt-3 text-xs text-center text-muted-foreground animate-pulse">Recording ball...</p>
      )}
    </div>
  );
};

export default CricketBallByBall;
