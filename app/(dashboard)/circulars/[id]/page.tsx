import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { getCircularAnnexUrls } from '@/lib/storage/access-control';
import { CircularTypeBadge } from '@/components/ui/circular-type-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { AnnexesSidebar } from '@/components/circulars/annexes-sidebar';
import { CircularDetailClient } from '@/components/circulars/circular-detail-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText, Edit } from 'lucide-react';
import { isAdmin } from '@/lib/roles';

interface CircularDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CircularDetailPage({ params }: CircularDetailPageProps) {
  try {
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
      console.error('Error fetching circular:', error);
      notFound();
    }

    // Get signed URLs for annexes (with error handling)
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
              {(circular.type === 'psd' || circular.type === 'psd_minute') && 'PMO (PSD) '}
              {circular.type === 'psd_minute' ? 'CIRCULAR MINUTE' : 'CIRCULAR'} NO. {circular.circular_number.toUpperCase()}
            </p>

            {/* Issue Date */}
            {circular.issue_date && (
              <p className="text-gray-700 mb-6">
                {formatDate(circular.issue_date)}
              </p>
            )}

            {/* Topic */}
            {circular.primary_topic && (
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                  Topic: {circular.primary_topic.replace(/_/g, ' ')}
                </span>
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

            {/* Main Document */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Main Document
                </h3>
                <div className="flex gap-2">
                  {/* Edit Button - Only for Admins */}
                  {isAdmin(user.roles.name) && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <Link href={`/circulars/${id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                  )}
                  
                  {mainDocData?.signedUrl && (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a
                          href={mainDocData.signedUrl}
                          download
                        >
                          Download PDF
                        </a>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="bg-[#17A2B8] hover:bg-[#138496]"
                      >
                        <a
                          href={mainDocData.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in New Tab
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* PDF Viewer */}
              {mainDocData?.signedUrl && circular.file_name?.toLowerCase().endsWith('.pdf') ? (
                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <iframe
                    src={mainDocData.signedUrl}
                    className="w-full h-[800px]"
                    title={circular.title}
                  />
                </div>
              ) : mainDocData?.signedUrl ? (
                <div className="bg-gray-50 p-8 rounded-lg border text-center">
                  <p className="text-gray-700 mb-4">
                    This file type cannot be previewed. Please download to view.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <FileText className="h-12 w-12 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{circular.file_name}</p>
                      {circular.file_size && (
                        <p className="text-sm text-gray-600">
                          {(circular.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
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

        {/* Print Button - Client Component */}
        <CircularDetailClient />
      </div>
    </div>
    );
  } catch (error) {
    console.error('Error rendering circular detail page:', error);
    notFound();
  }
}
