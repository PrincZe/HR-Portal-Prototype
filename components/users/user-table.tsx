'use client';

import { User } from '@/lib/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, XCircle, Edit, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface UserTableProps {
  users: User[];
  loading: boolean;
  onSelectUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  isSystemAdmin: boolean;
}

export function UserTable({
  users,
  loading,
  onSelectUser,
  onEditUser,
  onApproveUser,
  onRejectUser,
  isSystemAdmin,
}: UserTableProps) {
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
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      pending: { variant: 'secondary', label: 'Pending' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      disabled: { variant: 'outline', label: 'Disabled' },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const getRoleBadge = (roleName: string) => {
    if (roleName.includes('admin')) {
      return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
    }
    if (roleName.includes('hrl')) {
      return <Badge className="bg-blue-100 text-blue-800">HRL</Badge>;
    }
    return <Badge variant="secondary">HR Officer</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectUser(user)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getRoleBadge(user.roles.name)}
                  <span className="text-sm text-muted-foreground">
                    {user.roles.display_name}
                  </span>
                </div>
              </TableCell>
              <TableCell>{user.agency || '-'}</TableCell>
              <TableCell>{getStatusBadge(user.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.last_login
                  ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelectUser(user)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditUser(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    {user.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={() => onApproveUser(user.id)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRejectUser(user.id)}>
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />
                          Reject
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
