"use client";

import React, { useState } from 'react';
import { useTyro } from '../../hooks/useTyro';
import { TyroTransactionResponse, TyroTransactionResult } from '../../types/tyro';
import { Button } from '@heya-pos/ui';
import { CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface TyroPaymentButtonProps {
  amount: number;
  disabled?: boolean;
  onSuccess?: (transaction: TyroTransactionResponse) => void;
  onFailure?: (error: string, transaction?: TyroTransactionResponse) => void;
  onReceipt?: (receipt: any) => void;
  className?: string;
  children?: React.ReactNode;
}

export const TyroPaymentButton: React.FC<TyroPaymentButtonProps> = ({
  amount,
  disabled = false,
  onSuccess,
  onFailure,
  onReceipt,
  className,
  children,
}) => {
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<TyroTransactionResult | null>(null);

  const { purchase, isAvailable, isPaired } = useTyro();

  const handlePayment = () => {
    if (!isAvailable()) {
      onFailure?.('Tyro SDK is not available');
      return;
    }

    if (!isPaired()) {
      onFailure?.('Terminal is not paired. Please pair your terminal first.');
      return;
    }

    setProcessing(true);
    setLastResult(null);

    purchase(amount, {
      transactionCompleteCallback: (response) => {
        setProcessing(false);
        setLastResult(response.result);
        
        if (response.result === TyroTransactionResult.APPROVED) {
          onSuccess?.(response);
        } else {
          const errorMessage = getErrorMessage(response.result);
          onFailure?.(errorMessage, response);
        }
      },
      receiptCallback: (receipt) => {
        console.log('Receipt received:', receipt);
        onReceipt?.(receipt);
      }
    });
  };

  const getErrorMessage = (result: TyroTransactionResult): string => {
    switch (result) {
      case TyroTransactionResult.DECLINED:
        return 'Payment was declined';
      case TyroTransactionResult.CANCELLED:
        return 'Payment was cancelled';
      case TyroTransactionResult.SYSTEM_ERROR:
        return 'System error occurred';
      default:
        return `Payment failed: ${result}`;
    }
  };

  const getButtonContent = () => {
    if (processing) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      );
    }

    if (children) {
      return children;
    }

    return (
      <>
        <CreditCard className="mr-2 h-4 w-4" />
        Pay ${amount.toFixed(2)}
      </>
    );
  };

  const getButtonVariant = () => {
    if (lastResult === TyroTransactionResult.APPROVED) {
      return 'default'; // or a success variant if available
    }
    if (lastResult) {
      return 'destructive';
    }
    return 'default';
  };

  const isDisabled = disabled || processing || !isAvailable() || !isPaired();

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePayment}
        disabled={isDisabled}
        variant={getButtonVariant()}
        className={className}
        size="lg"
      >
        {getButtonContent()}
      </Button>
      
      {/* Status indicators */}
      {!isAvailable() && (
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          Tyro SDK not available
        </div>
      )}
      
      {isAvailable() && !isPaired() && (
        <div className="flex items-center gap-2 text-sm text-orange-600">
          <AlertCircle className="h-4 w-4" />
          Terminal not paired
        </div>
      )}
      
      {lastResult === TyroTransactionResult.APPROVED && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Payment approved
        </div>
      )}
      
      {lastResult && lastResult !== TyroTransactionResult.APPROVED && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {getErrorMessage(lastResult)}
        </div>
      )}
    </div>
  );
};