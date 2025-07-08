'use client';

import { Suspense } from 'react';
import CheckInPageClient from './CheckInPageClient';
import { MerchantGuard } from '@/components/merchant-guard';

export default function CheckInPage() {
  return (
    <MerchantGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading check-in system...</p>
          </div>
        </div>
      }>
        <CheckInPageClient />
      </Suspense>
    </MerchantGuard>
  );
}