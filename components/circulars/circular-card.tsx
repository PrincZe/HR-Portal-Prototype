'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Circular {
  id: string;
  title: string;
  circular_number: string;
  type: 'hrl' | 'hrops' | 'psd' | 'psd_minute';
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_at: string;
}

interface CircularCardProps {
  circular: Circular;
  onView: () => void;
  onDownload: () => void;
}

export function CircularCard({ circular, onView, onDownload }: CircularCardProps) {
  const getTypeBadge = (type: string) => {
    const config = {
      hrl: { label: 'HRL', className: 'bg-blue-100 text-blue-800' },
      hrops: { label: 'HR OPS', className: 'bg-green-100 text-green-800' },
      psd: { label: 'PSD', className: 'bg-purple-100 text-purple-800' },
      psd_minute: { label: 'PSD MIN', className: 'bg-purple-100 text-purple-800' },
    };
    const badge = config[type as keyof typeof config] || config.psd;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getAccessLevel = () => {
    if (circular.ministry_only) {
      return 'Ministry Only';
    }
    if (circular.min_role_tier) {
      const tierNames: Record<number, string> = {
        1: 'System Admin',
        2: 'Portal Admin',
        3: 'HRL Ministry',
        4: 'HRL Stat Board',
        5: 'HRL Rep Ministry',
        6: 'HRL Rep',
        7: 'All Users',
      };
      return tierNames[circular.min_role_tier] || 'Restricted';
    }
    return 'All Users';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          {getTypeBadge(circular.type)}
          <span className="text-xs text-muted-foreground">{circular.circular_number}</span>
        </div>
        <CardTitle className="text-lg line-clamp-2">{circular.title}</CardTitle>
        {circular.description && (
          <CardDescription className="line-clamp-2">{circular.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(circular.uploaded_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>{getAccessLevel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{formatFileSize(circular.file_size)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button onClick={onView} variant="default" className="flex-1">
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
        <Button onClick={onDownload} variant="outline" className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
