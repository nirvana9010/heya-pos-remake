'use client';

import dynamic from 'next/dynamic';
import { TablePageLoader } from '@/components/PageLoader';
import { ErrorBoundary } from '@/components/error-boundary';

// Dynamically import the page content
const ServicesPageContent = dynamic(
  () => import('./ServicesPageContent'),
  { 
    loading: () => <TablePageLoader />
  }
);

// This lightweight wrapper loads instantly
export default function ServicesPage() {
  return (
    <ErrorBoundary>
      <ServicesPageContent />
    </ErrorBoundary>
  );
}