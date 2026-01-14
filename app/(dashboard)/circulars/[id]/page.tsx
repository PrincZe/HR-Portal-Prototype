import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { getCircularAnnexUrls } from '@/lib/storage/access-control';
import { CircularTypeBadge } from '@/components/ui/circular-type-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { AnnexesSidebar } from '@/components/circulars/annexes-sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

interface CircularDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CircularDetailPage({ params }: CircularDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const supabase = await createClient();

  // Fetch circular (RLS will filter based on user access)
  const { data: circular, error } = await supabase
    .from('circulars')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !circular) {
    notFound();
  }

  // Get signed URLs for annexes
  const annexes = await getCircularAnnexUrls(id);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get main document signed URL
  const { data: mainDocData } = await supabase.storage
    .from('circulars')
    .createSignedUrl(circular.file_path, 3600);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-[#17A2B8]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/circulars" className="hover:text-[#17A2B8]">
            Circulars
          </Link>
          <span className="mx-2">/</span>
          <span>Circular Detail</span>
        </nav>

        {/* Back Link */}
        <Link
          href="/circulars"
          className="inline-flex items-center gap-2 text-[#17A2B8] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          back to previous page
        </Link>

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Circular Type Badge */}
            <div className="mb-4">
              <CircularTypeBadge type={circular.type} />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold mb-4 text-gray-900">
              {circular.title}
            </h1>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm mb-6 flex-wrap">
              {circular.sb_compliance && (
                <>
                  <span className="font-semibold">
                    SB Compliance:{' '}
                    <span className="font-normal capitalize">
                      {circular.sb_compliance.replace(/_/g, ' ')}
                    </span>
                  </span>
                  <span className="text-gray-400">|</span>
                </>
              )}
              {circular.status && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>
                  <StatusBadge status={circular.status} />
                </div>
              )}
              {circular.applicable_for && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="font-semibold">
                    Applicable:{' '}
                    <span className="font-normal capitalize">
                      {circular.applicable_for === 'civil_service_and_sb'
                        ? 'Civil Service & SB'
                        : 'Civil Service Only'}
                    </span>
                  </span>
                </>
              )}
            </div>

            {/* Circular Number */}
            <p className="font-semibold mb-2 text-gray-900">
              {circular.type === 'psd' && 'PMO (PSD) '}
              CIRCULAR NO. {circular.circular_number.toUpperCase()}
            </p>

            {/* Issue Date */}
            {circular.issue_date && (
              <p className="text-gray-700 mb-6">
                {formatDate(circular.issue_date)}
              </p>
            )}

            {/* Topics */}
            {(circular.primary_topic || circular.secondary_topic) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {circular.primary_topic && (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                    Primary: {circular.primary_topic.replace(/_/g, ' ')}
                  </span>
                )}
                {circular.secondary_topic && (
                  <span className="inline-block px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-md border">
                    Secondary: {circular.secondary_topic.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            )}

            {/* Description/Content */}
            {circular.description && (
              <div className="prose max-w-none mb-6">
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">
                    Description
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {circular.description}
                  </p>
                </div>
              </div>
            )}

            {/* Main Document Download */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Main Document
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border inline-flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {circular.file_name}
                  </p>
                  {circular.file_size && (
                    <p className="text-sm text-gray-600">
                      {(circular.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
                {mainDocData?.signedUrl && (
                  <div className="flex gap-2">
                    <Button
                      asChild
                      className="bg-[#17A2B8] hover:bg-[#138496]"
                    >
                      <a
                        href={mainDocData.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Document
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                    >
                      <a
                        href={mainDocData.signedUrl}
                        download
                      >
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Related Circulars */}
            {circular.related_circulars &&
              Array.isArray(circular.related_circulars) &&
              circular.related_circulars.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Related Circulars
                  </h3>
                  <ul className="space-y-2">
                    {circular.related_circulars.map(
                      (related: any, index: number) => (
                        <li key={index}>
                          <a
                            href={related.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#17A2B8] hover:underline"
                          >
                            {related.title}
                          </a>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>

          {/* Annexes Sidebar - Yellow Box */}
          {annexes.length > 0 && <AnnexesSidebar annexes={annexes} />}
        </div>

        {/* Print Button - Fixed Position */}
        <div className="fixed top-4 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="shadow-md bg-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print This Page
          </Button>
        </div>
      </div>
    </div>
  );
}
