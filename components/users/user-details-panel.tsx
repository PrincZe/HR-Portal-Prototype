'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@/lib/types/database';
import { Edit, CheckCircle, XCircle, Calendar, Mail, Building2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserDetailsPanelProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (user: User) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  currentUser: User;
}

export function UserDetailsPanel({
  user,
  open,
  onOpenChange,
  onEdit,
  onApprove,
  onReject,
  currentUser,
}: UserDetailsPanelProps) {
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; color: string }> = {
      active: { variant: 'default', label: 'Active', color: 'bg-green-100 text-green-800' },
      pending: { variant: 'secondary', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
      rejected: { variant: 'destructive', label: 'Rejected', color: 'bg-red-100 text-red-800' },
      disabled: { variant: 'outline', label: 'Disabled', color: 'bg-gray-100 text-gray-800' },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>View and manage user information</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.full_name || 'Unnamed User'}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            {getStatusBadge(user.status)}
          </div>

          {/* Information */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground">{user.roles.display_name}</p>
                <p className="text-xs text-muted-foreground">Tier {user.roles.tier}</p>
              </div>
            </div>

            {user.agency && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Agency</p>
                  <p className="text-sm text-muted-foreground">{user.agency}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">
                  {user.last_login
                    ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                    : 'Never logged in'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={() => onEdit(user)}
              className="w-full"
              variant="outline"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </Button>

            {user.status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    onApprove(user.id);
                    onOpenChange(false);
                  }}
                  className="w-full"
                  variant="default"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve User
                </Button>
                <Button
                  onClick={() => {
                    onReject(user.id);
                    onOpenChange(false);
                  }}
                  className="w-full"
                  variant="destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject User
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
