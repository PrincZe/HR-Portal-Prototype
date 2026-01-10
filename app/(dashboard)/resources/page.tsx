import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ResourcesClient } from '@/components/resources/resources-client';

export default async function ResourcesPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-muted-foreground mt-2">
          Browse and download HR resources, templates, and guides
        </p>
      </div>

      <ResourcesClient user={user} />
    </div>
  );
}
