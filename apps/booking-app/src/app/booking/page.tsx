import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the client component to avoid SSR issues with useSearchParams
const BookingPageClient = dynamic(() => import('./BookingPageClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading booking system...</p>
      </div>
    </div>
  )
});

export default function BookingPage() {
  return (
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
  );
}