'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  document_paths: Record<string, string> | null;
}

interface MeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
}

export function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getDocumentCount = () => {
    const additionalDocs = meeting.document_paths ? Object.keys(meeting.document_paths).length : 0;
    return 1 + additionalDocs; // Main file + additional documents
  };

  return (
    <Card
      className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-lg line-clamp-2">{meeting.title}</CardTitle>
        {meeting.description && (
          <CardDescription className="line-clamp-2">{meeting.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(meeting.meeting_date), 'EEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{getDocumentCount()} document(s)</span>
          </div>
          <div className="text-xs">
            {formatFileSize(meeting.file_size)}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-1">
        <Button variant="default" size="icon" title="View Details">
          <Eye className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
