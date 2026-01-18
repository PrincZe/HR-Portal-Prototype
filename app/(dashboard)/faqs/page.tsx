import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FAQsClient } from '@/components/faqs/faqs-client';

export default async function FAQsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch published FAQs
  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .eq('is_published', true)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  // Get unique categories
  const categories = [...new Set(
    (faqs || [])
      .map(faq => faq.category)
      .filter((category): category is string => category !== null)
  )];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-2">
          Find answers to common questions about HR policies and procedures
        </p>
      </div>

      <FAQsClient faqs={faqs || []} categories={categories} />
    </div>
  );
}
