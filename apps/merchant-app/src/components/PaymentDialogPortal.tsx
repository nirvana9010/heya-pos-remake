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
  customer?: any; // Customer object for loyalty redemption
  draftOrderId?: string | null;
  isWalkIn?: boolean;
  itemAdjustments?: Record<number, number>;
  orderAdjustment?: { amount: number; reason: string };
  loyaltyDiscount?: { amount: number; description: string };
}

export function PaymentDialogPortal(props: PaymentDialogPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Log props to understand what's being passed
  useEffect(() => {
    if (props.open) {
      console.log('[PaymentDialogPortal] Props when open:', {
        open: props.open,
        hasOrder: !!props.order,
        orderId: props.order?.id,
        orderState: props.order?.state,
        bookingId: props.bookingId,
        selectedServices: props.selectedServices?.length
      });
    }
  }, [props.open, props.order]);

  if (!mounted) {
    return null;
  }

  const portalElement = document.getElementById('modal-portal');
  if (!portalElement) {
    console.error('[PaymentDialogPortal] modal-portal element not found!');
    return null;
  }

  return ReactDOM.createPortal(
    <PaymentDialogEnhanced {...props} />,
    portalElement
  );
}