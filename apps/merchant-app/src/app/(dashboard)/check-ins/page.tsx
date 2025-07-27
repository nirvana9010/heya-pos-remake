'use client';

import dynamic from 'next/dynamic';
import { TablePageLoader } from '@/components/PageLoader';

// Dynamically import the page content
const CheckInsManager = dynamic(
  () => import('./CheckInsManager'),
  { 
    loading: () => <TablePageLoader />
  }
);

// This lightweight wrapper loads instantly
export default function CheckInsPage() {
  return <CheckInsManager />;
}