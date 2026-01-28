'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Calendar, FileText, Download, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

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

interface MeetingDetailsDialogProps {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  user: User;
  canManage: boolean;
}

export function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
  onUpdate,
  user,
  canManage,
}: MeetingDetailsDialogProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const handleView = async () => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from('hrl-meetings')
        .createSignedUrl(meeting.file_path, 60);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'view_meeting_document',
        resource_type: 'hrl_meeting',
        resource_id: meeting.id,
        metadata: { file_name: meeting.file_name },
      });
    } catch (error: any) {
      console.error('Error viewing document:', error);
      toast.error('Failed to view document');
    }
  };

  const handleDownload = async () => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from('hrl-meetings')
        .createSignedUrl(meeting.file_path, 60);

      if (error) throw error;

      // Download file
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = meeting.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'download_meeting_document',
        resource_type: 'hrl_meeting',
        resource_id: meeting.id,
        metadata: { file_name: meeting.file_name },
      });

      toast.success('Downloading document...');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting document?')) return;

    try {
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('hrl-meetings')
        .remove([meeting.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('hrl_meetings')
        .delete()
        .eq('id', meeting.id);

      if (dbError) throw dbError;

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'delete_meeting_document',
        resource_type: 'hrl_meeting',
        resource_id: meeting.id,
        metadata: { title: meeting.title, file_name: meeting.file_name },
      });

      toast.success('Meeting document deleted successfully');
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
          {meeting.description && (
            <DialogDescription>{meeting.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Uploaded {format(new Date(meeting.uploaded_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          <Separator />

          {/* Document */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Document</h3>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{meeting.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(meeting.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="icon" variant="outline" onClick={handleView} title="View">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={handleDownload} title="Download">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {canManage && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
