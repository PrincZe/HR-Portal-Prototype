'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function CircularDetailClient() {
  return (
    <div className="fixed top-4 right-4 z-50">
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
  );
}
