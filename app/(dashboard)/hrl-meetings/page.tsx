import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { HRLMeetingsClient } from '@/components/meetings/hrl-meetings-client';

export default async function HRLMeetingsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user has HRL role
  const hrlRoles = ['system_admin', 'hrl_ministry', 'hrl_statboard', 'hrl_rep_ministry', 'hrl_rep_statboard'];
  if (!hrlRoles.includes(user.roles.name)) {
    redirect('/unauthorized');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HRL Meetings</h1>
          <p className="text-muted-foreground mt-2">
            View and manage HRL meeting schedules and minutes
          </p>
        </div>
      </div>

      <HRLMeetingsClient user={user} />
    </div>
  );
}
