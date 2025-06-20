export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  formatted: string;
}

export interface TrendOptions {
  precision?: number;
  formatPrefix?: string;
  formatSuffix?: string;
  showPlus?: boolean;
  treatZeroAsNeutral?: boolean;
}

/**
 * Calculate trend data from current and previous values
 */
export function calculateTrend(
  current: number,
  previous: number,
  options: TrendOptions = {}
): TrendData {
  const {
    precision = 1,
    formatPrefix = '',
    formatSuffix = '%',
    showPlus = true,
    treatZeroAsNeutral = true
  } = options;

  // Handle edge cases
  if (previous === 0 && current === 0) {
    return {
      current,
      previous,
      change: 0,
      changePercent: 0,
      isPositive: true,
      formatted: treatZeroAsNeutral ? '0%' : '+0%'
    };
  }

  // If previous is 0 but current is not, it's a new value (infinite growth)
  if (previous === 0 && current > 0) {
    return {
      current,
      previous,
      change: current,
      changePercent: 100,
      isPositive: true,
      formatted: `${formatPrefix}New${formatSuffix === '%' ? '' : formatSuffix}`
    };
  }

  // If current is 0 but previous is not, it's a complete loss
  if (current === 0 && previous > 0) {
    return {
      current,
      previous,
      change: -previous,
      changePercent: -100,
      isPositive: false,
      formatted: `${formatPrefix}-100${formatSuffix}`
    };
  }

  // Normal calculation
  const change = current - previous;
  const changePercent = (change / previous) * 100;
  const isPositive = change >= 0;

  // Format the display string
  const sign = isPositive && showPlus ? '+' : '';
  const formattedPercent = changePercent.toFixed(precision);
  const formatted = `${formatPrefix}${sign}${formattedPercent}${formatSuffix}`;

  return {
    current,
    previous,
    change,
    changePercent,
    isPositive,
    formatted
  };
}

/**
 * Calculate trend for currency values
 */
export function calculateCurrencyTrend(
  current: number,
  previous: number,
  currencySymbol: string = '$'
): TrendData {
  return calculateTrend(current, previous, {
    formatPrefix: currencySymbol,
    formatSuffix: '',
    precision: 0
  });
}

/**
 * Calculate trend for count values (bookings, customers, etc)
 */
export function calculateCountTrend(
  current: number,
  previous: number
): TrendData {
  return calculateTrend(current, previous, {
    precision: 0
  });
}

/**
 * Format a trend value for display
 */
export function formatTrendDisplay(
  trend: TrendData,
  options: {
    showValue?: boolean;
    valuePrefix?: string;
    valueSuffix?: string;
  } = {}
): string {
  const { showValue = false, valuePrefix = '', valueSuffix = '' } = options;

  if (showValue) {
    return `${valuePrefix}${trend.current}${valueSuffix} (${trend.formatted})`;
  }

  return trend.formatted;
}

/**
 * Get trend color based on the change
 */
export function getTrendColor(
  trend: TrendData,
  invertColors: boolean = false
): string {
  if (trend.changePercent === 0) {
    return 'neutral';
  }

  const isGood = invertColors ? !trend.isPositive : trend.isPositive;
  return isGood ? 'success' : 'danger';
}

/**
 * Get trend icon name based on the change
 */
export function getTrendIcon(trend: TrendData): string {
  if (trend.changePercent === 0) {
    return 'minus';
  }
  return trend.isPositive ? 'trending-up' : 'trending-down';
}