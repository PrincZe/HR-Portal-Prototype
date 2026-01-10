import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { UploadResourcesForm } from '@/components/resources/upload-resources-form';

export default async function UploadResourcesPage() {
  const user = await requireRole(['system_admin', 'portal_admin']);
  
  if (!user) {
    redirect('/unauthorized');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Resources</h1>
        <p className="text-muted-foreground mt-2">
          Upload HR resources, templates, forms, and guides
        </p>
      </div>

      <UploadResourcesForm user={user} />
    </div>
  );
}
