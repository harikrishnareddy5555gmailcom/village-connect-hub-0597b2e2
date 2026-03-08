import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Calendar, Plus, X, MapPin, Clock, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

const EventsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('events')
        .select('*, profiles(full_name)')
        .eq('village_id', currentVillage!.id)
        .order('event_date', { ascending: true });
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !eventDate) throw new Error('Title and date are required');
      const dateTime = eventTime ? `${eventDate}T${eventTime}` : `${eventDate}T00:00`;
      const { error } = await (supabase as any).from('events').insert({
        village_id: currentVillage!.id,
        created_by: user!.id,
        title,
        description: description || null,
        event_date: dateTime,
        location_tag: location || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false); setTitle(''); setDescription(''); setEventDate(''); setEventTime(''); setLocation('');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upcoming = events.filter((e: any) => !isPast(new Date(e.event_date)));
  const past = events.filter((e: any) => isPast(new Date(e.event_date)));
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-info/15 rounded-xl flex items-center justify-center">
            <Calendar size={20} className="text-info" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Events / కార్యక్రమాలు</h1>
            <p className="text-xs text-muted-foreground">Village events and gatherings</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" className="btn-primary-gradient" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
            {showForm ? 'Cancel' : 'Add Event'}
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && isAdmin && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Create Event</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Event Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event name..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Date *</Label>
                <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Time</Label>
                <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Location</Label>
              <div className="relative mt-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Venue / Location" className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Event details..." className="mt-1 resize-none" rows={3} />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Create Event
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t} ({t === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">{tab === 'upcoming' ? '📅' : '📂'}</div>
          <p className="font-medium text-foreground">{tab === 'upcoming' ? 'No upcoming events' : 'No past events'}</p>
          <p className="text-sm text-muted-foreground mt-1 telugu">
            {tab === 'upcoming' ? 'రాబోయే కార్యక్రమాలు లేవు' : 'గత కార్యక్రమాలు లేవు'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((ev: any) => {
            const date = new Date(ev.event_date);
            const past = isPast(date);
            return (
              <div key={ev.id} className={cn("vcp-card p-4 flex gap-4", past && "opacity-70")}>
                {/* Date Block */}
                <div className={cn(
                  "w-14 flex-shrink-0 rounded-xl flex flex-col items-center justify-center py-2 text-center",
                  past ? "bg-muted" : "bg-primary/10"
                )}>
                  <span className={cn("text-2xl font-bold leading-none", past ? "text-muted-foreground" : "text-primary")}>
                    {format(date, 'd')}
                  </span>
                  <span className={cn("text-xs font-medium uppercase mt-0.5", past ? "text-muted-foreground" : "text-primary/70")}>
                    {format(date, 'MMM')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{ev.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={11} />{format(date, 'h:mm a')}</span>
                    {ev.location_tag && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location_tag}</span>}
                    {ev.profiles?.full_name && <span className="flex items-center gap-1"><Users size={11} />By {ev.profiles.full_name}</span>}
                  </div>
                  {ev.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ev.description}</p>}
                </div>
                {!past && (
                  <div className="flex-shrink-0">
                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                      Upcoming
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
