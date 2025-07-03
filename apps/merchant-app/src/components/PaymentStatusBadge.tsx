import React from 'react';
import { Badge } from '@heya-pos/ui';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@heya-pos/ui';

interface PaymentStatusBadgeProps {
  isPaid: boolean;
  amount: number;
  isCancelled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export function PaymentStatusBadge({ 
  isPaid, 
  amount, 
  isCancelled = false,
  size = 'default',
  showIcon = true 
}: PaymentStatusBadgeProps) {
  // Don't show payment status for cancelled bookings
  if (isCancelled) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (isPaid) {
    return (
      <Badge 
        className={cn(
          "bg-green-100 text-green-800 border-green-200",
          sizeClasses[size]
        )}
      >
        <div className="flex items-center gap-1">
          {showIcon && <CheckCircle className={iconSizes[size]} />}
          <span>${amount.toFixed(2)} Paid</span>
        </div>
      </Badge>
    );
  }

  return (
    <Badge 
      className={cn(
        "bg-orange-100 text-orange-800 border-orange-200",
        sizeClasses[size]
      )}
    >
      <div className="flex items-center gap-1">
        {showIcon && <AlertCircle className={iconSizes[size]} />}
        <span>${amount.toFixed(2)} Unpaid</span>
      </div>
    </Badge>
  );
}