'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { PaymentDialogEnhanced } from './PaymentDialogEnhanced';

interface PaymentDialogPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
  onPaymentComplete?: (order: any) => void;
  enableTips?: boolean;
  defaultTipPercentages?: number[];
  // For Quick Sale - create order on the fly
  selectedServices?: any[];
  customerId?: string;
  draftOrderId?: string | null;
  isWalkIn?: boolean;
  itemAdjustments?: Record<number, number>;
  orderAdjustment?: { amount: number; reason: string };
}

export function PaymentDialogPortal(props: PaymentDialogPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  const portalElement = document.getElementById('modal-portal');
  if (!portalElement) {
    return null;
  }

  return ReactDOM.createPortal(
    <PaymentDialogEnhanced {...props} />,
    portalElement
  );
}