'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { UserPlus, Search, Download } from 'lucide-react';
import { UserTable } from './user-table';
import { AddUserDialog } from './add-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { UserDetailsPanel } from './user-details-panel';
import { toast } from 'sonner';

interface UserManagementClientProps {
  currentUser: User;
}

export function UserManagementClient({ currentUser }: UserManagementClientProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const isSystemAdmin = currentUser.roles.name === 'system_admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      let query = supabase
        .from('users')
        .select('*, roles(*)')
        .order('created_at', { ascending: false });

      // Portal admins only see users in their agency
      if (!isSystemAdmin) {
        query = query.eq('agency', currentUser.agency);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data as User[]);
    } catch (error: any) {
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(u => u.status === 'pending');
    } else if (activeTab === 'active') {
      filtered = filtered.filter(u => u.status === 'active');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.full_name?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.agency?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleUserAdded = () => {
    fetchUsers();
    setAddDialogOpen(false);
    toast.success('User created successfully');
  };

  const handleUserUpdated = () => {
    fetchUsers();
    setEditDialogOpen(false);
    setUserToEdit(null);
    toast.success('User updated successfully');
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setEditDialogOpen(true);
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({
          status: 'active',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the approval
      await supabase.from('access_logs').insert({
        user_id: currentUser.id,
        action: 'approve_user',
        resource_type: 'user',
        resource_id: userId,
      });

      toast.success('User approved successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to approve user: ' + error.message);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ status: 'rejected' })
        .eq('id', userId);

      if (error) throw error;

      // Log the rejection
      await supabase.from('access_logs').insert({
        user_id: currentUser.id,
        action: 'reject_user',
        resource_type: 'user',
        resource_id: userId,
      });

      toast.success('User rejected');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to reject user: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    // Simple CSV export
    const csv = [
      ['Name', 'Email', 'Role', 'Agency', 'Status', 'Created At'].join(','),
      ...filteredUsers.map(u =>
        [
          u.full_name || '',
          u.email,
          u.roles.display_name,
          u.agency || '',
          u.status,
          new Date(u.created_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Users exported to CSV');
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <>
      <Card className="p-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            <UserTable
              users={filteredUsers}
              loading={loading}
              onSelectUser={setSelectedUser}
              onEditUser={handleEditUser}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              isSystemAdmin={isSystemAdmin}
            />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <UserTable
              users={filteredUsers}
              loading={loading}
              onSelectUser={setSelectedUser}
              onEditUser={handleEditUser}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              isSystemAdmin={isSystemAdmin}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <UserTable
              users={filteredUsers}
              loading={loading}
              onSelectUser={setSelectedUser}
              onEditUser={handleEditUser}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              isSystemAdmin={isSystemAdmin}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Add User Dialog */}
      <AddUserDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleUserAdded}
        currentUser={currentUser}
        isSystemAdmin={isSystemAdmin}
      />

      {/* Edit User Dialog */}
      {userToEdit && (
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={userToEdit}
          onSuccess={handleUserUpdated}
          currentUser={currentUser}
          isSystemAdmin={isSystemAdmin}
        />
      )}

      {/* User Details Panel */}
      {selectedUser && (
        <UserDetailsPanel
          user={selectedUser}
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          onEdit={handleEditUser}
          onApprove={handleApproveUser}
          onReject={handleRejectUser}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
