'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { PaymentDialogEnhanced } from './PaymentDialogEnhanced';

interface PaymentDialogPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
  bookingId?: string; // For post-booking payment
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
    console.log('[PaymentDialogPortal] Not mounted yet');
    return null;
  }

  const portalElement = document.getElementById('modal-portal');
  if (!portalElement) {
    console.error('[PaymentDialogPortal] No modal-portal element found!');
    return null;
  }

  console.log('[PaymentDialogPortal] Rendering with props:', {
    open: props.open,
    hasOrder: !!props.order,
    orderId: props.order?.id,
    orderState: props.order?.state
  });

  return ReactDOM.createPortal(
    <PaymentDialogEnhanced {...props} />,
    portalElement
  );
}