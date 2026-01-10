import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { UserManagementClient } from '@/components/users/user-management-client';

export default async function AccountManagementPage() {
  // Only system admins and portal admins can access
  const user = await requireRole(['system_admin', 'portal_admin']);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      <UserManagementClient currentUser={user} />
    </div>
  );
}
