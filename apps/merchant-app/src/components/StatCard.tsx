'use client';

import { Card } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { LucideIcon } from 'lucide-react';
import { TrendBadge } from './TrendBadge';
import { useTrend, type UseTrendOptions } from '@/lib/hooks/use-trend';

export interface StatCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trendOptions?: UseTrendOptions;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  previousValue,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  trendOptions = {},
  loading = false,
  className,
  onClick
}: StatCardProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const trend = useTrend(
    numericValue,
    previousValue || 0,
    previousValue !== undefined ? trendOptions : undefined
  );

  const displayValue = typeof value === 'string' ? value : trend.displayValue;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div
              className={cn(
                'rounded-lg p-2',
                iconBgColor
              )}
            >
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
          )}
          {previousValue !== undefined && !loading && (
            <TrendBadge trend={trend} size="sm" />
          )}
        </div>

        <div className="space-y-1">
          {loading ? (
            <>
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {displayValue}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {title}
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}