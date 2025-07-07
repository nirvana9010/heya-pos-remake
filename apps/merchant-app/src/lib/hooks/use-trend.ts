import { useMemo } from 'react';
import { calculateTrend, calculateCurrencyTrend, calculateCountTrend, type TrendData, type TrendOptions } from '@heya-pos/utils';

export type TrendType = 'percentage' | 'currency' | 'count';

export interface UseTrendOptions extends TrendOptions {
  type?: TrendType;
  currencySymbol?: string;
}

/**
 * Hook to calculate and format trend data
 */
export function useTrend(
  current: number,
  previous: number,
  options: UseTrendOptions = {}
): TrendData & { displayValue: string; displayChange: string; colorClass: string } {
  const { type = 'percentage', currencySymbol = '$', ...trendOptions } = options;

  const trend = useMemo(() => {
    switch (type) {
      case 'currency':
        return calculateCurrencyTrend(current, previous, currencySymbol);
      case 'count':
        return calculateCountTrend(current, previous);
      default:
        return calculateTrend(current, previous, trendOptions);
    }
  }, [current, previous, type, currencySymbol, trendOptions]);

  const displayValue = useMemo(() => {
    switch (type) {
      case 'currency':
        return `${currencySymbol}${current.toLocaleString()}`;
      case 'count':
        return current.toLocaleString();
      default:
        return current.toString();
    }
  }, [current, type, currencySymbol]);

  const displayChange = trend.formatted;

  const colorClass = useMemo(() => {
    if (trend.changePercent === 0) return 'text-gray-500';
    return trend.isPositive ? 'text-green-600' : 'text-red-600';
  }, [trend]);

  return {
    ...trend,
    displayValue,
    displayChange,
    colorClass
  };
}

/**
 * Hook to calculate multiple trends at once
 */
export function useTrends<T extends Record<string, { current: number; previous: number }>>(
  data: T,
  options: Record<keyof T, UseTrendOptions> = {} as any
): Record<keyof T, ReturnType<typeof useTrend>> {
  return useMemo(() => {
    const results = {} as Record<keyof T, ReturnType<typeof useTrend>>;
    
    for (const key in data) {
      const { current, previous } = data[key];
      const keyOptions = options[key] || {};
      const { type = 'percentage', currencySymbol = '$', ...trendOptions } = keyOptions;
      
      // Calculate trend directly without calling hook
      let trend: TrendData;
      switch (type) {
        case 'currency':
          trend = calculateCurrencyTrend(current, previous, currencySymbol);
          break;
        case 'count':
          trend = calculateCountTrend(current, previous);
          break;
        default:
          trend = calculateTrend(current, previous, trendOptions);
      }
      
      // Calculate display values
      let displayValue: string;
      switch (type) {
        case 'currency':
          displayValue = `${currencySymbol}${current.toLocaleString()}`;
          break;
        case 'count':
          displayValue = current.toLocaleString();
          break;
        default:
          displayValue = current.toString();
      }
      
      const displayChange = trend.formatted;
      const colorClass = trend.changePercent === 0 ? 'text-gray-500' : 
                         trend.isPositive ? 'text-green-600' : 'text-red-600';
      
      results[key] = {
        ...trend,
        displayValue,
        displayChange,
        colorClass
      } as any;
    }
    
    return results;
  }, [data, options]);
}