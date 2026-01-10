'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string;
  location: string | null;
  meeting_type: 'hrl_ministry' | 'hrl_statboard' | 'hrl_all';
  rsvps?: RSVP[];
  minutes?: MeetingMinute[];
}

interface RSVP {
  id: string;
  user_id: string;
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

interface MeetingDetailsDialogProps {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  user: User;
  userRSVP?: RSVP;
  canManage: boolean;
}

export function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
  onUpdate,
  user,
  userRSVP,
  canManage,
}: MeetingDetailsDialogProps) {
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);

  const getTypeBadge = (type: string) => {
    const config = {
      hrl_ministry: { label: 'Ministry', className: 'bg-blue-100 text-blue-800' },
      hrl_statboard: { label: 'Stat Board', className: 'bg-green-100 text-green-800' },
      hrl_all: { label: 'All HRL', className: 'bg-purple-100 text-purple-800' },
    };
    const badge = config[type as keyof typeof config] || config.hrl_all;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getRSVPsByStatus = () => {
    const attending = meeting.rsvps?.filter(r => r.status === 'attending') || [];
    const maybe = meeting.rsvps?.filter(r => r.status === 'maybe') || [];
    const notAttending = meeting.rsvps?.filter(r => r.status === 'not_attending') || [];
    return { attending, maybe, notAttending };
  };

  const { attending, maybe, notAttending } = getRSVPsByStatus();

  const handleUploadMinutes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted for meeting minutes');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploadingMinutes(true);
    try {
      const supabase = createClient();

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_minutes.${fileExt}`;
      const filePath = `meeting-minutes/${meeting.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-minutes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert record
      const { error: insertError } = await supabase.from('hrl_meeting_minutes').insert({
        meeting_id: meeting.id,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user.id,
      });

      if (insertError) {
        // Clean up uploaded file
        await supabase.storage.from('meeting-minutes').remove([filePath]);
        throw insertError;
      }

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'upload_meeting_minutes',
        resource_type: 'hrl_meeting',
        resource_id: meeting.id,
        metadata: { file_name: file.name },
      });

      toast.success('Meeting minutes uploaded successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error uploading minutes:', error);
      toast.error('Failed to upload meeting minutes');
    } finally {
      setIsUploadingMinutes(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDownloadMinutes = async (minute: MeetingMinute) => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from('meeting-minutes')
        .createSignedUrl(minute.file_path, 60);

      if (error) throw error;

      // Download file
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = minute.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'download_meeting_minutes',
        resource_type: 'hrl_meeting',
        resource_id: meeting.id,
        metadata: { file_name: minute.file_name },
      });

      toast.success('Downloading meeting minutes...');
    } catch (error: any) {
      console.error('Error downloading minutes:', error);
      toast.error('Failed to download meeting minutes');
    }
  };

  const handleDeleteMinutes = async (minute: MeetingMinute) => {
    if (!confirm('Are you sure you want to delete these meeting minutes?')) return;

    try {
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('meeting-minutes')
        .remove([minute.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('hrl_meeting_minutes')
        .delete()
        .eq('id', minute.id);

      if (dbError) throw dbError;

      toast.success('Meeting minutes deleted successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting minutes:', error);
      toast.error('Failed to delete meeting minutes');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{meeting.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {meeting.description || 'No description provided'}
              </DialogDescription>
            </div>
            {getTypeBadge(meeting.meeting_type)}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Meeting Details */}
            <div className="space-y-3">
              <h3 className="font-semibold">Meeting Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(`2000-01-01T${meeting.meeting_time}`), 'h:mm a')}</span>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{meeting.location}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* RSVPs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <h3 className="font-semibold">Responses ({meeting.rsvps?.length || 0})</h3>
              </div>

              {/* Attending */}
              {attending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      Attending ({attending.length})
                    </span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {attending.map((rsvp) => (
                      <div key={rsvp.id} className="text-sm text-muted-foreground">
                        {rsvp.users?.full_name || 'Unknown User'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maybe */}
              {maybe.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-600">
                      Maybe ({maybe.length})
                    </span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {maybe.map((rsvp) => (
                      <div key={rsvp.id} className="text-sm text-muted-foreground">
                        {rsvp.users?.full_name || 'Unknown User'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not Attending */}
              {notAttending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">
                      Not Attending ({notAttending.length})
                    </span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {notAttending.map((rsvp) => (
                      <div key={rsvp.id} className="text-sm text-muted-foreground">
                        {rsvp.users?.full_name || 'Unknown User'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meeting.rsvps?.length === 0 && (
                <p className="text-sm text-muted-foreground">No responses yet</p>
              )}
            </div>

            <Separator />

            {/* Meeting Minutes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h3 className="font-semibold">Meeting Minutes</h3>
                </div>
                {canManage && (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleUploadMinutes}
                      disabled={isUploadingMinutes}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="minutes-upload"
                    />
                    <Button size="sm" disabled={isUploadingMinutes} asChild>
                      <label htmlFor="minutes-upload" className="cursor-pointer">
                        {isUploadingMinutes ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Minutes
                          </>
                        )}
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              {meeting.minutes && meeting.minutes.length > 0 ? (
                <div className="space-y-2">
                  {meeting.minutes.map((minute) => (
                    <div
                      key={minute.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{minute.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {format(new Date(minute.uploaded_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadMinutes(minute)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMinutes(minute)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No meeting minutes uploaded yet</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
