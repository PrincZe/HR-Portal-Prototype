import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EnhancedUploadCircularForm } from '@/components/circulars/enhanced-upload-circular-form';

export default async function UploadCircularPage() {
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

  // Check if user has permission to upload (admin or content_editor)
  const isAdmin = user.roles && user.roles.tier <= 2;
  const isContentEditor = user.roles?.name === 'content_editor';

  if (!isAdmin && !isContentEditor) {
    redirect('/unauthorized');
  }

  // Content editors must have at least one assigned topic
  if (isContentEditor && (!user.assigned_topics || user.assigned_topics.length === 0)) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Circular</h1>
        <p className="mt-2 text-gray-600">
          Upload a new circular with all required information and documents
        </p>
      </div>

      <EnhancedUploadCircularForm user={user} />
    </div>
  );
}
