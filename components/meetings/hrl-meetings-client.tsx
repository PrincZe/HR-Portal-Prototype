'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MeetingCard } from './meeting-card';
import { UploadMeetingDialog } from './upload-meeting-dialog';
import { MeetingDetailsDialog } from './meeting-details-dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
  document_paths: Record<string, string> | null;
}

interface HRLMeetingsClientProps {
  user: User;
}

export function HRLMeetingsClient({ user }: HRLMeetingsClientProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('hrl_meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadDialog(false);
    fetchMeetings();
    toast.success('Meeting document uploaded successfully');
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const isAdmin = user.roles.name === 'system_admin' || user.roles.name === 'portal_admin';

  return (
    <>
      <div className="space-y-6">
        {/* Header Actions */}
        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Meeting Document
            </Button>
          </div>
        )}

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
        ) : meetings.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No meeting documents available yet</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={() => handleMeetingClick(meeting)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <UploadMeetingDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
        user={user}
      />

      {selectedMeeting && (
        <MeetingDetailsDialog
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onOpenChange={(open) => !open && setSelectedMeeting(null)}
          onUpdate={fetchMeetings}
          user={user}
          canManage={isAdmin || selectedMeeting.uploaded_by === user.id}
        />
      )}
    </>
  );
}
