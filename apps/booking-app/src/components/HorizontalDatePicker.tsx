import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow } from 'date-fns';
import { motion } from 'framer-motion';

interface HorizontalDatePickerProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  maxAdvanceDays?: number;
  disabledDates?: (date: Date) => boolean;
  className?: string;
}

export const HorizontalDatePicker: React.FC<HorizontalDatePickerProps> = ({
  selectedDate,
  onSelectDate,
  maxAdvanceDays = 30,
  disabledDates,
  className
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  // Generate dates starting from today
  const today = startOfDay(new Date());
  const dates = Array.from({ length: maxAdvanceDays }, (_, i) => addDays(today, i));
  
  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };
  
  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, []);
  
  // Scroll to selected date on mount or when selected date changes
  useEffect(() => {
    if (selectedDate && scrollContainerRef.current) {
      const selectedIndex = dates.findIndex(date => isSameDay(date, selectedDate));
      if (selectedIndex !== -1) {
        const dateElement = scrollContainerRef.current.children[0]?.children[selectedIndex] as HTMLElement;
        if (dateElement) {
          dateElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }
  }, [selectedDate]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE');
  };
  
  return (
    <div className={cn("relative", className)}>
      {/* Left Arrow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showLeftArrow ? 1 : 0 }}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll('left')}
          className="pointer-events-auto h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
          disabled={!showLeftArrow}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </motion.div>
      
      {/* Date Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide px-12 mx-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-3 py-4 justify-center">
          {dates.map((date) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isDisabled = disabledDates?.(date) ?? false;
            const dateKey = format(date, 'yyyy-MM-dd');
            
            return (
              <motion.button
                key={dateKey}
                whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                onClick={() => !isDisabled && onSelectDate(date)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[80px] h-[100px] rounded-2xl border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
                  isSelected 
                    ? "bg-gradient-to-b from-primary to-secondary text-white border-transparent shadow-lg" 
                    : "bg-card hover:bg-primary/5 border-border hover:border-primary/30",
                  isDisabled && "opacity-40 cursor-not-allowed hover:bg-card hover:border-border",
                  isToday(date) && !isSelected && "border-primary/50 bg-primary/5"
                )}
              >
                <span className={cn(
                  "text-xs font-medium mb-1",
                  isSelected ? "text-white/90" : "text-muted-foreground"
                )}>
                  {getDateLabel(date)}
                </span>
                <span className={cn(
                  "text-2xl font-bold",
                  isSelected ? "text-white" : "text-foreground"
                )}>
                  {format(date, 'd')}
                </span>
                <span className={cn(
                  "text-xs",
                  isSelected ? "text-white/80" : "text-muted-foreground"
                )}>
                  {format(date, 'MMM')}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Right Arrow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showRightArrow ? 1 : 0 }}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll('right')}
          className="pointer-events-auto h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
          disabled={!showRightArrow}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </motion.div>
      
      <style jsx>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};