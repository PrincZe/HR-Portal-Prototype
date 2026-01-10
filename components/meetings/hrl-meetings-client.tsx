'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar as CalendarIcon, List } from 'lucide-react';
import { MeetingCard } from './meeting-card';
import { CreateMeetingDialog } from './create-meeting-dialog';
import { MeetingDetailsDialog } from './meeting-details-dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string;
  location: string | null;
  meeting_type: 'hrl_ministry' | 'hrl_statboard' | 'hrl_all';
  created_by: string;
  created_at: string;
  rsvps?: RSVP[];
  minutes?: MeetingMinute[];
}

interface RSVP {
  id: string;
  user_id: string;
  meeting_id: string;
  status: 'attending' | 'not_attending' | 'maybe';
  users?: {
    full_name: string;
    email: string;
  };
}

interface MeetingMinute {
  id: string;
  meeting_id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface HRLMeetingsClientProps {
  user: User;
}

export function HRLMeetingsClient({ user }: HRLMeetingsClientProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch meetings with RSVPs and minutes
      const { data, error } = await supabase
        .from('hrl_meetings')
        .select(`
          *,
          rsvps:hrl_meeting_rsvps(
            id,
            user_id,
            status,
            users:user_id(full_name, email)
          ),
          minutes:hrl_meeting_minutes(*)
        `)
        .order('meeting_date', { ascending: true })
        .order('meeting_time', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    fetchMeetings();
    toast.success('Meeting created successfully');
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleRSVP = async (meetingId: string, status: 'attending' | 'not_attending' | 'maybe') => {
    try {
      const supabase = createClient();

      // Check if user already has an RSVP
      const { data: existingRSVP } = await supabase
        .from('hrl_meeting_rsvps')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (existingRSVP) {
        // Update existing RSVP
        const { error } = await supabase
          .from('hrl_meeting_rsvps')
          .update({ status })
          .eq('id', existingRSVP.id);

        if (error) throw error;
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from('hrl_meeting_rsvps')
          .insert({
            meeting_id: meetingId,
            user_id: user.id,
            status,
          });

        if (error) throw error;
      }

      toast.success('RSVP updated successfully');
      fetchMeetings();
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const getUserRSVP = (meeting: Meeting) => {
    return meeting.rsvps?.find(rsvp => rsvp.user_id === user.id);
  };

  const canManageMeeting = (meeting: Meeting) => {
    return user.roles.name === 'system_admin' || meeting.created_by === user.id;
  };

  // Filter meetings based on user's role
  const filteredMeetings = meetings.filter(meeting => {
    if (user.roles.name === 'system_admin') return true;
    if (meeting.meeting_type === 'hrl_all') return true;
    if (meeting.meeting_type === 'hrl_ministry' && 
        (user.roles.name === 'hrl_ministry' || user.roles.name === 'hrl_rep_ministry')) return true;
    if (meeting.meeting_type === 'hrl_statboard' && 
        (user.roles.name === 'hrl_statboard' || user.roles.name === 'hrl_rep_statboard')) return true;
    return false;
  });

  // Separate upcoming and past meetings
  const now = new Date();
  const upcomingMeetings = filteredMeetings.filter(m => new Date(`${m.meeting_date}T${m.meeting_time}`) >= now);
  const pastMeetings = filteredMeetings.filter(m => new Date(`${m.meeting_date}T${m.meeting_time}`) < now);

  // Calendar view helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMeetingsForDay = (day: Date) => {
    return filteredMeetings.filter(m => isSameDay(new Date(m.meeting_date), day));
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              <List className="mr-2 h-4 w-4" />
              List View
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendar View
            </Button>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Meeting
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingMeetings.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastMeetings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingMeetings.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No upcoming meetings</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      userRSVP={getUserRSVP(meeting)}
                      canManage={canManageMeeting(meeting)}
                      onRSVP={handleRSVP}
                      onClick={() => handleMeetingClick(meeting)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastMeetings.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No past meetings</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      userRSVP={getUserRSVP(meeting)}
                      canManage={canManageMeeting(meeting)}
                      onRSVP={handleRSVP}
                      onClick={() => handleMeetingClick(meeting)}
                      isPast
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                Previous
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                variant="outline"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                Next
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm p-2">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}

              {/* Days of the month */}
              {daysInMonth.map(day => {
                const dayMeetings = getMeetingsForDay(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] p-2 border rounded-lg ${
                      isCurrentDay ? 'bg-primary/5 border-primary' : ''
                    } ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayMeetings.slice(0, 2).map(meeting => (
                        <div
                          key={meeting.id}
                          onClick={() => handleMeetingClick(meeting)}
                          className="text-xs p-1 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 truncate"
                        >
                          {format(new Date(`2000-01-01T${meeting.meeting_time}`), 'HH:mm')} {meeting.title}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayMeetings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CreateMeetingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
        user={user}
      />

      {selectedMeeting && (
        <MeetingDetailsDialog
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onOpenChange={(open) => !open && setSelectedMeeting(null)}
          onUpdate={fetchMeetings}
          user={user}
          userRSVP={getUserRSVP(selectedMeeting)}
          canManage={canManageMeeting(selectedMeeting)}
        />
      )}
    </>
  );
}
