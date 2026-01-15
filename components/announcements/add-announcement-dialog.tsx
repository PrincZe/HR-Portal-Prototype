'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface AddAnnouncementDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function AddAnnouncementDialog({ open, onClose, onSuccess, userId }: AddAnnouncementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    dismissible: true,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('announcements').insert({
        message: formData.message,
        type: formData.type,
        dismissible: formData.dismissible,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        created_by: userId,
      });

      if (error) throw error;

      toast.success('Announcement created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast.error(error.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Announcement</DialogTitle>
          <DialogDescription>
            Create a banner announcement to display on the homepage
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter announcement message..."
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'info' | 'warning' | 'error') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="warning">Warning (Yellow)</SelectItem>
                  <SelectItem value="error">Error (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="dismissible"
                checked={formData.dismissible}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, dismissible: !!checked })
                }
              />
              <label htmlFor="dismissible" className="text-sm font-medium cursor-pointer">
                Allow users to dismiss
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date & Time (Optional)</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for no expiry</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: !!checked })
              }
            />
            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
              Active (Show on homepage)
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
