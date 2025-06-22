'use client';

import dynamic from 'next/dynamic';
import { TablePageLoader } from '@/components/PageLoader';
import { ErrorBoundary } from '@/components/error-boundary';

// Dynamically import the page content
const StaffPageContent = dynamic(
  () => import('./StaffPageContent'),
  { 
    loading: () => <TablePageLoader />
  }
);

// This lightweight wrapper loads instantly
export default function StaffPage() {
  return (
    <ErrorBoundary>
      <StaffPageContent />
    </ErrorBoundary>
  );
}