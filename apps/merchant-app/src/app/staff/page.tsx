'use client';

import dynamic from 'next/dynamic';
import { TablePageLoader } from '@/components/PageLoader';

// Dynamically import the page content
const StaffPageContent = dynamic(
  () => import('./StaffPageContent'),
  { 
    loading: () => <TablePageLoader />
  }
);

// This lightweight wrapper loads instantly
export default function StaffPage() {
  return <StaffPageContent />;
}