import React from 'react';
import { useTimezone } from '@/contexts/timezone-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';

interface TimeDisplayProps {
  date: Date | string;
  format?: 'time' | 'date' | 'datetime';
  showTimezone?: boolean;
  showUserTime?: boolean;
  className?: string;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  date,
  format = 'time',
  showTimezone = true,
  showUserTime = true,
  className
}) => {
  const { formatInMerchantTz, formatInUserTz, getCurrentTimezoneAbbr, merchantTimezone, userTimezone } = useTimezone();

  const merchantTime = formatInMerchantTz(date, format);
  const userTime = formatInUserTz(date, format);
  const merchantTzAbbr = getCurrentTimezoneAbbr(merchantTimezone);
  const userTzAbbr = getCurrentTimezoneAbbr(userTimezone);

  const displayText = showTimezone ? `${merchantTime} ${merchantTzAbbr}` : merchantTime;
  const isDifferentTimezone = merchantTimezone !== userTimezone;

  if (!showUserTime || !isDifferentTimezone) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('cursor-help border-b border-dotted border-muted-foreground/50', className)}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            Your time: <span className="font-medium">{userTime} {userTzAbbr}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface TimezoneIndicatorProps {
  className?: string;
}

export const TimezoneIndicator: React.FC<TimezoneIndicatorProps> = ({ className }) => {
  const { merchantTimezone, getCurrentTimezoneAbbr } = useTimezone();
  const tzAbbr = getCurrentTimezoneAbbr(merchantTimezone);

  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      All times shown in {tzAbbr}
    </span>
  );
};