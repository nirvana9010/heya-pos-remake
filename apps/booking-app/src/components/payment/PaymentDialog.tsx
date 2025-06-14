'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@heya-pos/ui';
import { MockPaymentForm } from './MockPaymentForm';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  onPaymentSuccess: () => void;
}

export function PaymentDialog({
  isOpen,
  onClose,
  amount,
  currency = 'AUD',
  onPaymentSuccess,
}: PaymentDialogProps) {
  const handleSuccess = () => {
    onPaymentSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Complete Your Booking</DialogTitle>
          <DialogDescription>
            Please enter your payment details to confirm your booking.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <MockPaymentForm
            amount={amount}
            currency={currency}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}