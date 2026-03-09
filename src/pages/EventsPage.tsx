import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Calendar, Plus, X, MapPin, Clock, Loader2, Users, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { writeAuditLog } from '@/lib/auditLog';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location_tag: string | null;
  created_by: string;
  village_id: string;
  profiles?: { full_name: string } | null;
}

const EventsPage: React.FC = () => {
  const { user, role, profile } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');

  // Edit state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Delete state
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('events')
        .select('*, profiles!events_created_by_profiles_fkey(full_name)')
        .eq('village_id', currentVillage!.id)
        .order('event_date', { ascending: true });
      return (data ?? []) as Event[];
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingEvent || !editTitle.trim() || !editDate) throw new Error('Title and date are required');
      const dateTime = editTime ? `${editDate}T${editTime}` : `${editDate}T00:00`;
      const { error } = await (supabase as any).from('events').update({
        title: editTitle,
        description: editDescription || null,
        event_date: dateTime,
        location_tag: editLocation || null,
      }).eq('id', editingEvent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const ev = events.find(e => e.id === id);
      const { error } = await (supabase as any).from('events').delete().eq('id', id);
      if (error) throw error;
      await writeAuditLog({
        action_type: 'delete',
        entity_type: 'event',
        entity_id: id,
        entity_name: ev?.title,
        performed_by: user!.id,
        performed_by_name: profile?.full_name,
        village_id: currentVillage?.id,
      });
    },
    onSuccess: () => {
      setDeleteEventId(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (ev: Event) => {
    const date = new Date(ev.event_date);
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditDescription(ev.description ?? '');
    setEditDate(format(date, 'yyyy-MM-dd'));
    setEditTime(format(date, 'HH:mm'));
    setEditLocation(ev.location_tag ?? '');
    setShowForm(false);
  };

  const upcoming = events.filter((e) => !isPast(new Date(e.event_date)));
  const past = events.filter((e) => isPast(new Date(e.event_date)));
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
          <Button size="sm" className="btn-primary-gradient" onClick={() => { setShowForm(!showForm); setEditingEvent(null); }}>
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

      {/* Edit Form */}
      {editingEvent && isAdmin && (
        <div className="vcp-card p-5 mb-5 border-2 border-primary/30 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Edit Event</h3>
            <Button size="sm" variant="ghost" onClick={() => setEditingEvent(null)}>
              <X size={14} />
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Event Title *</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Event name..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Date *</Label>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Time</Label>
                <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Location</Label>
              <div className="relative mt-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Venue / Location" className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Event details..." className="mt-1 resize-none" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingEvent(null)}>Cancel</Button>
              <Button className="btn-primary-gradient flex-1" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
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
          {displayed.map((ev) => {
            const date = new Date(ev.event_date);
            const isEvenPast = isPast(date);
            const isBeingEdited = editingEvent?.id === ev.id;
            return (
              <div key={ev.id} className={cn(
                "vcp-card p-4 flex gap-4 transition-all",
                isEvenPast && "opacity-70",
                isBeingEdited && "ring-2 ring-primary/40"
              )}>
                {/* Date Block */}
                <div className={cn(
                  "w-14 flex-shrink-0 rounded-xl flex flex-col items-center justify-center py-2 text-center",
                  isEvenPast ? "bg-muted" : "bg-primary/10"
                )}>
                  <span className={cn("text-2xl font-bold leading-none", isEvenPast ? "text-muted-foreground" : "text-primary")}>
                    {format(date, 'd')}
                  </span>
                  <span className={cn("text-xs font-medium uppercase mt-0.5", isEvenPast ? "text-muted-foreground" : "text-primary/70")}>
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
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {!isEvenPast && (
                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                      Upcoming
                    </span>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(ev)}
                        title="Edit event"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteEventId(ev.id)}
                        title="Delete event"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEventId} onOpenChange={open => !open && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEventId && deleteMutation.mutate(deleteEventId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventsPage;
