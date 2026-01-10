'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { AGENCIES } from '@/lib/constants/agencies';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUser: User;
  isSystemAdmin: boolean;
}

export function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
  currentUser,
  isSystemAdmin,
}: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role_id: '',
    agency: '',
    status: 'active',
  });

  const roles = [
    { id: 1, name: 'System Administrator', tier: 1, disabled: !isSystemAdmin },
    { id: 2, name: 'Portal Administrator', tier: 2, disabled: !isSystemAdmin },
    { id: 3, name: 'HR Leader (Ministry)', tier: 3, disabled: false },
    { id: 4, name: 'HR Leader (Statutory Board)', tier: 4, disabled: false },
    { id: 5, name: 'HRL Representative (Ministry)', tier: 5, disabled: false },
    { id: 6, name: 'HRL Representative (Stat Board)', tier: 6, disabled: false },
    { id: 7, name: 'HR Officer', tier: 7, disabled: false },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      // First, create the auth user (they'll need to sign in with OTP to activate)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Then create the user profile
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.full_name,
        role_id: parseInt(formData.role_id),
        agency: formData.agency,
        status: formData.status,
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
      });

      if (userError) throw userError;

      // Log the action
      await supabase.from('access_logs').insert({
        user_id: currentUser.id,
        action: 'create_user',
        resource_type: 'user',
        resource_id: authData.user.id,
        metadata: { email: formData.email, role_id: formData.role_id },
      });

      onSuccess();
      setFormData({
        email: '',
        full_name: '',
        role_id: '',
        agency: '',
        status: 'active',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. They will receive an email to set up their login.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@gov.sg"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              placeholder="John Tan"
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
                <SelectValue placeholder="Select role" />
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
                <SelectValue placeholder="Select agency" />
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
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (Direct Assignment)</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Active users can log in immediately. Pending users need approval.
            </p>
          </div>

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
                  Creating...
                </>
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
