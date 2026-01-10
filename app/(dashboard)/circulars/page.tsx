import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { CircularsClient } from '@/components/circulars/circulars-client';

export default async function CircularsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Circulars</h1>
        <p className="text-muted-foreground mt-2">
          Browse HRL, HR OPS, and PSD circulars
        </p>
      </div>

      <CircularsClient user={user} />
    </div>
  );
}
