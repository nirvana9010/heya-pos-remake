'use client';

import { Suspense } from 'react';
import BookingPageClient from './BookingPageClient';
import { MerchantGuard } from '@/components/merchant-guard';

export default function BookingPage() {
  return (
    <MerchantGuard>
      <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading booking system...</p>
        </div>
      </div>
    }>
      <BookingPageClient />
      </Suspense>
    </MerchantGuard>
  );
}