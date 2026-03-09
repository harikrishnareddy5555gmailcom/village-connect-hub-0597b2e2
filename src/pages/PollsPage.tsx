import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isPast } from 'date-fns';
import {
  BarChart2, Plus, Trash2, CheckCircle, Clock, Users, X, Loader2, VoteIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Poll {
  id: string;
  question: string;
  options: { text: string }[];
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
  created_by: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

interface PollVote {
  poll_id: string;
  user_id: string;
  option_index: number;
}

const PollsPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const qc = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endsAt, setEndsAt] = useState('');

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['polls', currentVillage?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('polls')
        .select('*, profiles!polls_created_by_fkey(full_name, avatar_url)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Poll[];
    },
    enabled: !!currentVillage?.id,
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ['my-votes', currentVillage?.id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('poll_votes')
        .select('poll_id, option_index')
        .eq('user_id', user!.id);
      return (data ?? []) as PollVote[];
    },
    enabled: !!user?.id,
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ['all-votes', currentVillage?.id],
    queryFn: async () => {
      const pollIds = polls.map(p => p.id);
      if (!pollIds.length) return [];
      const { data } = await (supabase as any)
        .from('poll_votes')
        .select('poll_id, option_index, user_id')
        .in('poll_id', pollIds);
      return (data ?? []) as PollVote[];
    },
    enabled: polls.length > 0,
  });

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter(o => o.trim());
      if (!question.trim()) throw new Error('Question is required');
      if (validOptions.length < 2) throw new Error('At least 2 options required');
      const { error } = await supabase.from('polls' as any).insert({
        village_id: currentVillage!.id,
        created_by: user!.id,
        question: question.trim(),
        options: validOptions.map(text => ({ text: text.trim() })),
        is_active: true,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] });
      toast.success('Poll created!');
      setShowCreate(false);
      setQuestion('');
      setOptions(['', '']);
      setEndsAt('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const { error } = await supabase.from('poll_votes' as any).insert({
        poll_id: pollId,
        user_id: user!.id,
        option_index: optionIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-votes'] });
      qc.invalidateQueries({ queryKey: ['all-votes'] });
      toast.success('Vote recorded! ✅');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('polls' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['polls'] }); toast.success('Poll deleted'); },
  });

  const getVotesForPoll = (pollId: string) => allVotes.filter(v => v.poll_id === pollId);
  const getMyVote = (pollId: string) => myVotes.find(v => v.poll_id === pollId);
  const getPollClosed = (poll: Poll) => !poll.is_active || (poll.ends_at ? isPast(new Date(poll.ends_at)) : false);

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VoteIcon size={24} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Polls & Voting</h1>
            <p className="text-muted-foreground text-sm">Village decisions & community opinions / గ్రామ అభిప్రాయాలు</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" className="btn-primary-gradient" onClick={() => setShowCreate(true)}>
            <Plus size={14} className="mr-1.5" />Create Poll
          </Button>
        )}
      </div>

      {/* Create Poll Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Question <span className="text-destructive">*</span></Label>
              <Input
                placeholder="What do you want to ask?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Options (min 2) <span className="text-destructive">*</span></Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => setOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                  />
                  {options.length > 2 && (
                    <button onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive/80">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button
                  onClick={() => setOptions(prev => [...prev, ''])}
                  className="text-sm text-primary hover:underline"
                >+ Add option</button>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">End Date/Time <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="btn-primary-gradient" onClick={() => createPollMutation.mutate()} disabled={createPollMutation.isPending}>
              {createPollMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Polls List */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="vcp-card h-32 animate-pulse" />)
      ) : polls.length === 0 ? (
        <div className="vcp-card p-12 text-center">
          <BarChart2 size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No polls yet.</p>
          {isAdmin && <p className="text-muted-foreground/60 text-xs mt-1">Create a poll to get village opinions!</p>}
        </div>
      ) : (
        polls.map(poll => {
          const pollVotes = getVotesForPoll(poll.id);
          const myVote = getMyVote(poll.id);
          const totalVotes = pollVotes.length;
          const isClosed = getPollClosed(poll);
          const hasVoted = !!myVote;

          return (
            <div key={poll.id} className={cn("vcp-card p-5", isClosed && "opacity-80")}>
              {/* Poll Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 flex-1">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={poll.profiles?.avatar_url ?? ''} />
                    <AvatarFallback className="bg-primary/15 text-primary font-bold text-xs">
                      {poll.profiles?.full_name?.charAt(0) ?? 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {poll.profiles?.full_name} · {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isClosed
                    ? <Badge variant="secondary" className="text-xs">Closed</Badge>
                    : <Badge className="text-xs bg-success/15 text-success border-success/30">Active</Badge>
                  }
                  {isAdmin && (
                    <button onClick={() => deleteMutation.mutate(poll.id)} className="text-muted-foreground hover:text-destructive p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Question */}
              <h3 className="font-semibold text-foreground mb-3">{poll.question}</h3>

              {/* Options */}
              <div className="space-y-2">
                {(poll.options as { text: string }[]).map((opt, i) => {
                  const votes = pollVotes.filter(v => v.option_index === i).length;
                  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isMyChoice = myVote?.option_index === i;
                  const showResults = hasVoted || isClosed;

                  return (
                    <button
                      key={i}
                      onClick={() => !hasVoted && !isClosed && voteMutation.mutate({ pollId: poll.id, optionIndex: i })}
                      disabled={hasVoted || isClosed || voteMutation.isPending}
                      className={cn(
                        "w-full text-left rounded-xl overflow-hidden relative transition-all",
                        !hasVoted && !isClosed
                          ? "hover:border-primary cursor-pointer border border-border"
                          : "cursor-default border border-transparent",
                        isMyChoice && "ring-2 ring-primary ring-offset-1",
                      )}
                    >
                      {showResults && (
                        <div
                          className={cn("absolute inset-0 rounded-xl transition-all", isMyChoice ? "bg-primary/15" : "bg-muted/50")}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <div className="relative flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {isMyChoice && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                          <span className="text-sm font-medium text-foreground">{opt.text}</span>
                        </div>
                        {showResults && (
                          <span className="text-xs text-muted-foreground font-medium">{pct}% · {votes}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users size={12} />{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                {poll.ends_at && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {isClosed ? 'Ended' : `Ends ${formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}`}
                  </span>
                )}
                {!hasVoted && !isClosed && (
                  <span className="ml-auto text-primary font-medium">Tap to vote</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default PollsPage;
