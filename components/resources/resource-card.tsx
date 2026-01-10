'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Shield, 
  Trash2,
  FileSpreadsheet,
  FileImage,
  File,
  Presentation,
  FileCode
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  category: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_at: string;
}

interface ResourceCardProps {
  resource: Resource;
  viewMode: 'grid' | 'list';
  onView: () => void;
  onDownload: () => void;
  onDelete?: () => void;
}

export function ResourceCard({ resource, viewMode, onView, onDownload, onDelete }: ResourceCardProps) {
  const getFileIcon = (fileType: string) => {
    const iconClass = "h-5 w-5";
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className={iconClass} />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className={iconClass} />;
      case 'docx':
      case 'doc':
        return <FileText className={iconClass} />;
      case 'pptx':
      case 'ppt':
        return <Presentation className={iconClass} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className={iconClass} />;
      case 'html':
      case 'css':
      case 'js':
        return <FileCode className={iconClass} />;
      default:
        return <File className={iconClass} />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'Templates': 'bg-blue-100 text-blue-800',
      'Guides': 'bg-green-100 text-green-800',
      'Forms': 'bg-purple-100 text-purple-800',
      'Policies': 'bg-orange-100 text-orange-800',
      'Training': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[category] || colors['Other']}>
        {category}
      </Badge>
    );
  };

  const getAccessLevel = () => {
    if (resource.ministry_only) {
      return 'Ministry Only';
    }
    if (resource.min_role_tier) {
      const tierNames: Record<number, string> = {
        1: 'System Admin',
        2: 'Portal Admin',
        3: 'HRL Ministry',
        4: 'HRL Stat Board',
        5: 'HRL Rep Ministry',
        6: 'HRL Rep',
        7: 'All Users',
      };
      return tierNames[resource.min_role_tier] || 'Restricted';
    }
    return 'All Users';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4 p-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
            {getFileIcon(resource.file_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getCategoryBadge(resource.category)}
              <span className="text-xs text-muted-foreground uppercase">{resource.file_type}</span>
            </div>
            <h3 className="font-semibold truncate">{resource.title}</h3>
            {resource.description && (
              <p className="text-sm text-muted-foreground truncate">{resource.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(resource.uploaded_at), { addSuffix: true })}</span>
              <span>{formatFileSize(resource.file_size)}</span>
              <span>{getAccessLevel()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onView} variant="default" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
            <Button onClick={onDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {getFileIcon(resource.file_type)}
            {getCategoryBadge(resource.category)}
          </div>
          <span className="text-xs text-muted-foreground uppercase">{resource.file_type}</span>
        </div>
        <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
        {resource.description && (
          <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(resource.uploaded_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>{getAccessLevel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <File className="h-4 w-4" />
            <span>{formatFileSize(resource.file_size)}</span>
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
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}
