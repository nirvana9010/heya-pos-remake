'use client';

import { useMerchant } from '@/contexts/merchant-context';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function MerchantGuard({ children }: { children: React.ReactNode }) {
  const { merchant, loading, error } = useMerchant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            Business Not Found
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            {error || 'The business you are looking for could not be found.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please check the URL and try again, or contact the business directly.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                Development Mode - Test Merchants:
              </p>
              <div className="flex flex-col gap-2">
                <Link 
                  href="/hamilton"
                  className="text-blue-600 hover:underline"
                >
                  Hamilton Beauty (hamilton)
                </Link>
                <Link 
                  href="/wellness-spa"
                  className="text-blue-600 hover:underline"
                >
                  Wellness Spa (wellness-spa)
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}