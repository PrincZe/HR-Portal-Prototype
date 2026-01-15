import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AnnouncementsClient } from '@/components/announcements/announcements-client';

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user profile with role
  const { data: user } = await supabase
    .from('users')
    .select('*, roles(*)')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    redirect('/login');
  }

  // Check if user has admin role (tier 1 or 2)
  if (!user.roles || user.roles.tier > 2) {
    redirect('/unauthorized');
  }

  // Fetch all announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Announcements</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage banner announcements for the homepage
        </p>
      </div>

      <AnnouncementsClient initialAnnouncements={announcements || []} user={user} />
    </div>
  );
}
