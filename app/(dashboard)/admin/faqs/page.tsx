import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FAQsAdminClient } from '@/components/faqs/faqs-admin-client';

export default async function AdminFAQsPage() {
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

  // Fetch all FAQs (admins can see unpublished ones too)
  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .order('category', { ascending: true })
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage FAQs</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage frequently asked questions
        </p>
      </div>

      <FAQsAdminClient initialFaqs={faqs || []} user={user} />
    </div>
  );
}
