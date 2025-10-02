'use client';

import dynamic from 'next/dynamic';
import { PageLoader } from '@/components/PageLoader';
import React from 'react';

// Error boundary to catch and log the specific error
class CalendarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Silently handle errors - no console logging
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-600 rounded-lg m-4">
          <h2 className="text-xl font-semibold mb-4">Calendar Error</h2>
          <p className="mb-4">The calendar encountered an error while loading.</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Error details</summary>
            <pre className="mt-2 text-xs overflow-auto bg-red-100 p-4 rounded">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Import BookingProvider to ensure staff are filtered
import { BookingProvider } from '@/contexts/booking-context';

// Dynamically import the refactored calendar
const CalendarPageContent = dynamic(
  () => import('@/components/calendar/refactored/CalendarPage').then(mod => ({ default: mod.CalendarPage })),
  { 
    loading: () => <PageLoader pageName="Calendar" />
  }
);

// This lightweight wrapper loads instantly
export default function CalendarPage() {
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <CalendarErrorBoundary>
      <BookingProvider>
        {isDev && (
          <div className="bg-red-700 text-white text-center py-2 text-sm font-semibold tracking-wide uppercase">
            Dev Build • API pinned to 100.107.58.75:3000 • Do not use for production data
          </div>
        )}
        <CalendarPageContent />
      </BookingProvider>
    </CalendarErrorBoundary>
  );
}
