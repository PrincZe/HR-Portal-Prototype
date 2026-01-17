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
import { SECONDARY_TOPICS } from '@/lib/constants/topics';

interface Resource {
  id: string;
  title: string;
  topic: string;
  category_type: string | null;
  tags: string[] | null;
  file_path: string;
  file_name: string;
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
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension;
  };

  const getFileIcon = (fileName: string) => {
    const iconClass = "h-5 w-5";
    const fileType = getFileType(fileName);
    switch (fileType) {
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

  const getTopicLabel = (topic: string) => {
    const found = SECONDARY_TOPICS.find(t => t.value === topic);
    return found ? found.label : topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getTopicBadge = (topic: string) => {
    return (
      <Badge className="bg-[#17A2B8] text-white">
        {getTopicLabel(topic)}
      </Badge>
    );
  };

  const getCategoryTypeBadge = (categoryType: string | null) => {
    if (!categoryType) return null;

    const colors: Record<string, string> = {
      'Templates': 'bg-blue-100 text-blue-800',
      'Guides': 'bg-green-100 text-green-800',
      'Forms': 'bg-purple-100 text-purple-800',
      'Policies': 'bg-orange-100 text-orange-800',
      'Training': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[categoryType] || colors['Other']}>
        {categoryType}
      </Badge>
    );
  };

  const renderTags = (tags: string[] | null) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}
          >
            {tag}
          </span>
        ))}
      </div>
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
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted shrink-0">
            {getFileIcon(resource.file_name)}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {getTopicBadge(resource.topic)}
              {getCategoryTypeBadge(resource.category_type)}
              <span className="text-xs text-muted-foreground uppercase">{getFileType(resource.file_name)}</span>
            </div>
            <h3 className="font-semibold truncate">{resource.title}</h3>
            {renderTags(resource.tags)}
            {resource.description && (
              <p className="text-sm text-muted-foreground truncate">{resource.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>{formatDistanceToNow(new Date(resource.uploaded_at), { addSuffix: true })}</span>
              <span>{formatFileSize(resource.file_size)}</span>
              <span>{getAccessLevel()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={onView} variant="default" size="sm">
              <Eye className="mr-1 h-4 w-4" />
              View
            </Button>
            <Button onClick={onDownload} variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" />
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
    <Card className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <span className="shrink-0">{getFileIcon(resource.file_name)}</span>
            {getTopicBadge(resource.topic)}
            {getCategoryTypeBadge(resource.category_type)}
          </div>
          <span className="text-xs text-muted-foreground uppercase shrink-0">{getFileType(resource.file_name)}</span>
        </div>
        <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
        {renderTags(resource.tags)}
        {resource.description && (
          <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatDistanceToNow(new Date(resource.uploaded_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" />
            <span className="truncate">{getAccessLevel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatFileSize(resource.file_size)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button onClick={onView} variant="default" size="sm" className="flex-1 min-w-0">
          <Eye className="mr-1 h-4 w-4 shrink-0" />
          <span>View</span>
        </Button>
        <Button onClick={onDownload} variant="outline" size="sm" className="flex-1 min-w-0">
          <Download className="mr-1 h-4 w-4 shrink-0" />
          <span>Download</span>
        </Button>
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
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
