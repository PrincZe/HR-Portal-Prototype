'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { User, ContentGroup, PrimaryTopic } from '@/lib/types/database';
import { AGENCIES } from '@/lib/constants/agencies';
import { CONTENT_GROUPS, PRIMARY_TOPICS } from '@/lib/constants/topics';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
  currentUser: User;
  isSystemAdmin: boolean;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  currentUser,
  isSystemAdmin,
}: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    role_id: user.role_id.toString(),
    agency: user.agency || '',
    status: user.status,
    content_group: (user.content_group || '') as ContentGroup | '',
    assigned_topics: (user.assigned_topics || []) as PrimaryTopic[],
  });

  useEffect(() => {
    setFormData({
      full_name: user.full_name || '',
      role_id: user.role_id.toString(),
      agency: user.agency || '',
      status: user.status,
      content_group: (user.content_group || '') as ContentGroup | '',
      assigned_topics: (user.assigned_topics || []) as PrimaryTopic[],
    });
  }, [user]);

  const roles = [
    { id: 1, name: 'System Administrator', disabled: !isSystemAdmin, showContentGroup: false, showTopics: false },
    { id: 2, name: 'Portal Administrator', disabled: !isSystemAdmin, showContentGroup: true, showTopics: false },
    { id: 3, name: 'HR Leader (Ministry)', disabled: false, showContentGroup: true, showTopics: false },
    { id: 4, name: 'HR Leader (Statutory Board)', disabled: false, showContentGroup: true, showTopics: false },
    { id: 5, name: 'HRL Representative (Ministry)', disabled: false, showContentGroup: true, showTopics: false },
    { id: 6, name: 'HRL Representative (Stat Board)', disabled: false, showContentGroup: true, showTopics: false },
    { id: 7, name: 'HR Officer', disabled: false, showContentGroup: true, showTopics: false },
    { id: 8, name: 'Content Editor', disabled: !isSystemAdmin, showContentGroup: false, showTopics: true },
  ];

  // Get the selected role's configuration
  const selectedRole = roles.find(r => r.id.toString() === formData.role_id);
  const showContentGroup = selectedRole?.showContentGroup ?? false;
  const showTopics = selectedRole?.showTopics ?? false;
  const isContentGroupRequired = showContentGroup && formData.role_id !== '2'; // Required for all except Portal Admin

  // Handle topic checkbox toggle
  const handleTopicToggle = (topicValue: PrimaryTopic) => {
    setFormData(prev => ({
      ...prev,
      assigned_topics: prev.assigned_topics.includes(topicValue)
        ? prev.assigned_topics.filter(t => t !== topicValue)
        : [...prev.assigned_topics, topicValue]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for access control fields
    if (isContentGroupRequired && !formData.content_group) {
      toast.error('Content Group is required for this role');
      return;
    }
    if (showTopics && formData.assigned_topics.length === 0) {
      toast.error('At least one topic must be assigned for Content Editors');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const newRoleId = parseInt(formData.role_id);
      const roleChanged = newRoleId !== user.role_id;

      // Update user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          role_id: newRoleId,
          agency: formData.agency,
          status: formData.status,
          content_group: formData.content_group || null,
          assigned_topics: formData.assigned_topics,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Log role change if applicable
      if (roleChanged) {
        await supabase.from('user_role_history').insert({
          user_id: user.id,
          old_role_id: user.role_id,
          new_role_id: newRoleId,
          changed_by: currentUser.id,
          reason: 'Role updated by admin',
        });
      }

      // Log the action
      await supabase.from('access_logs').insert({
        user_id: currentUser.id,
        action: 'update_user',
        resource_type: 'user',
        resource_id: user.id,
        metadata: {
          changes: formData,
          content_group: formData.content_group || null,
          assigned_topics: formData.assigned_topics,
        },
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) => setFormData({ ...formData, role_id: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem
                    key={role.id}
                    value={role.id.toString()}
                    disabled={role.disabled}
                  >
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency">Agency *</Label>
            <Select
              value={formData.agency}
              onValueChange={(value) => setFormData({ ...formData, agency: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {AGENCIES.map((agency) => (
                  <SelectItem key={agency.value} value={agency.value}>
                    {agency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'pending' | 'rejected' | 'disabled' })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Group - for HRL/HRO/Portal Admin roles */}
          {showContentGroup && (
            <div className="space-y-2">
              <Label htmlFor="content_group">
                Content Group {isContentGroupRequired && '*'}
              </Label>
              <Select
                value={formData.content_group}
                onValueChange={(value) => setFormData({ ...formData, content_group: value as ContentGroup })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content group" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines which circulars and content this user can access.
              </p>
            </div>
          )}

          {/* Assigned Topics - for Content Editors */}
          {showTopics && (
            <div className="space-y-2">
              <Label>Assigned Topics *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select topics this Content Editor can manage ({formData.assigned_topics.length} selected)
              </p>
              <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 space-y-2">
                {PRIMARY_TOPICS.map((topic) => (
                  <div key={topic.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-topic-${topic.value}`}
                      checked={formData.assigned_topics.includes(topic.value as PrimaryTopic)}
                      onCheckedChange={() => handleTopicToggle(topic.value as PrimaryTopic)}
                      disabled={loading}
                    />
                    <label
                      htmlFor={`edit-topic-${topic.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {topic.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
