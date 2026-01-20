import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditCircularForm } from '@/components/circulars/edit-circular-form';

interface EditCircularPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCircularPage({ params }: EditCircularPageProps) {
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

  // Fetch the circular to edit first (need to check access)
  const { id } = await params;
  const { data: circular, error } = await supabase
    .from('circulars')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !circular) {
    console.error('Error fetching circular:', error);
    notFound();
  }

  // Check if user has permission to edit
  const isAdmin = user.roles && user.roles.tier <= 2;
  const isContentEditor = user.roles?.name === 'content_editor';

  // Content Editors can only edit circulars in their assigned topics
  const hasTopicAccess = isContentEditor &&
    circular.primary_topic &&
    user.assigned_topics?.includes(circular.primary_topic);

  if (!isAdmin && !hasTopicAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Circular</h1>
        <p className="mt-2 text-gray-600">
          Update circular information and change status
        </p>
      </div>

      <EditCircularForm user={user} circular={circular} />
    </div>
  );
}
