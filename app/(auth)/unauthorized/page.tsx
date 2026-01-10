'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getMessage = () => {
    switch (reason) {
      case 'no_access':
        return {
          title: 'No Access',
          description: 'Your account is not registered in the HR Portal system.',
          details: 'Please contact your agency administrator to request access.',
        };
      case 'rejected':
        return {
          title: 'Access Denied',
          description: 'Your account request has been rejected.',
          details: 'Please contact your agency administrator for more information.',
        };
      case 'disabled':
        return {
          title: 'Account Disabled',
          description: 'Your account has been disabled.',
          details: 'Please contact your agency administrator to restore access.',
        };
      default:
        return {
          title: 'Unauthorized',
          description: 'You do not have permission to access this application.',
          details: 'Please contact your administrator for assistance.',
        };
    }
  };

  const message = getMessage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">{message.title}</CardTitle>
          <CardDescription>{message.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900">
            {message.details}
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Need assistance?</p>
              <p className="text-sm text-muted-foreground">
                Contact your agency's Portal Administrator or email{' '}
                <a href="mailto:support@psd.gov.sg" className="text-primary hover:underline">
                  support@psd.gov.sg
                </a>
              </p>
            </div>
          </div>

          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
