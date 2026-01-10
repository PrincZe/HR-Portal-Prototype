import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { UploadCircularForm } from '@/components/circulars/upload-circular-form';

export default async function UploadCircularPage() {
  const user = await requireRole(['system_admin', 'portal_admin']);
  
  if (!user) {
    redirect('/unauthorized');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Circular</h1>
        <p className="text-muted-foreground mt-2">
          Upload a new HRL, HR OPS, or PSD circular
        </p>
      </div>

      <UploadCircularForm user={user} />
    </div>
  );
}
