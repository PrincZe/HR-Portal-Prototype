'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AddAnnouncementDialog } from './add-announcement-dialog';
import { EditAnnouncementDialog } from './edit-announcement-dialog';

interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  dismissible: boolean;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[];
  user: User;
}

export function AnnouncementsClient({ initialAnnouncements, user }: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshAnnouncements = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAnnouncements(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Announcement deleted successfully');
      await refreshAnnouncements();
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast.error(error.message || 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const isActive = (announcement: Announcement) => {
    if (!announcement.is_active) return false;
    const now = new Date();
    const start = new Date(announcement.start_date);
    const end = announcement.end_date ? new Date(announcement.end_date) : null;
    return start <= now && (!end || end >= now);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {announcements.length} announcement(s) total
        </p>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No announcements yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first announcement to display on the homepage
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getIcon(announcement.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getTypeColor(announcement.type) as any}>
                          {announcement.type.toUpperCase()}
                        </Badge>
                        {isActive(announcement) ? (
                          <Badge variant="success" className="bg-green-100 text-green-800">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="secondary">INACTIVE</Badge>
                        )}
                        {announcement.dismissible && (
                          <Badge variant="outline">Dismissible</Badge>
                        )}
                      </div>
                      <p className="text-sm">{announcement.message}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Start: {new Date(announcement.start_date).toLocaleString()}</p>
                        {announcement.end_date && (
                          <p>End: {new Date(announcement.end_date).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAnnouncement(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement.id)}
                      disabled={deletingId === announcement.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {showAddDialog && (
        <AddAnnouncementDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            refreshAnnouncements();
            setShowAddDialog(false);
          }}
          userId={user.id}
        />
      )}

      {editingAnnouncement && (
        <EditAnnouncementDialog
          open={!!editingAnnouncement}
          announcement={editingAnnouncement}
          onClose={() => setEditingAnnouncement(null)}
          onSuccess={() => {
            refreshAnnouncements();
            setEditingAnnouncement(null);
          }}
        />
      )}
    </>
  );
}
