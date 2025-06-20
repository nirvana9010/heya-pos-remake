'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@heya-pos/ui';
import type { TrendData } from '@heya-pos/utils';

export interface TrendBadgeProps {
  trend: TrendData;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  invertColors?: boolean;
  className?: string;
}

export function TrendBadge({
  trend,
  showIcon = true,
  size = 'md',
  invertColors = false,
  className
}: TrendBadgeProps) {
  const isNeutral = trend.changePercent === 0;
  const isGood = invertColors ? !trend.isPositive : trend.isPositive;

  const sizeClasses = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const colorClasses = isNeutral
    ? 'text-gray-500'
    : isGood
    ? 'text-green-600 dark:text-green-500'
    : 'text-red-600 dark:text-red-500';

  const Icon = isNeutral 
    ? Minus 
    : trend.isPositive 
    ? TrendingUp 
    : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        sizeClasses[size],
        colorClasses,
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      <span>{trend.formatted}</span>
    </span>
  );
}