import type { LucideIcon } from 'lucide-react';
import { ClipboardList, DoorOpen, Globe2 } from 'lucide-react';

import { mapBookingSource } from '@/lib/booking-source';
import type { BookingSourceCategory, BookingSourceInfo } from '@/lib/booking-source';

export interface BookingSourcePresentation extends BookingSourceInfo {
  icon: LucideIcon;
  badgeClassName: string;
  iconClassName: string;
  indicatorWrapperClassName: string;
}

const CATEGORY_ICONS: Record<BookingSourceCategory, LucideIcon> = {
  online: Globe2,
  'walk-in': DoorOpen,
  manual: ClipboardList,
  unknown: ClipboardList,
};

const CATEGORY_STYLE_CLASSES: Record<BookingSourceCategory, { badge: string; icon: string; indicator: string }> = {
  online: {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800',
    icon: 'text-sky-600 dark:text-sky-300',
    indicator: 'bg-white text-sky-600 ring-1 ring-sky-200/80 shadow-sm dark:bg-sky-950/70 dark:ring-sky-800/70'
  },
  'walk-in': {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-300',
    indicator: 'bg-white text-amber-600 ring-1 ring-amber-200/80 shadow-sm dark:bg-amber-950/60 dark:ring-amber-800/70'
  },
  manual: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700',
    icon: 'text-slate-600 dark:text-slate-300',
    indicator: 'bg-white text-slate-600 ring-1 ring-slate-200/80 shadow-sm dark:bg-slate-900/70 dark:ring-slate-700/70'
  },
  unknown: {
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700',
    icon: 'text-gray-500 dark:text-gray-300',
    indicator: 'bg-white text-gray-500 ring-1 ring-gray-200/80 shadow-sm dark:bg-gray-900/70 dark:ring-gray-800/70'
  },
};

export function getBookingSourcePresentation(rawSource?: string | null, customerSource?: string | null): BookingSourcePresentation {
  const info = mapBookingSource(rawSource, customerSource);
  const meta = CATEGORY_STYLE_CLASSES[info.category];

  return {
    ...info,
    icon: CATEGORY_ICONS[info.category],
    badgeClassName: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.badge}`,
    iconClassName: meta.icon,
    indicatorWrapperClassName: `inline-flex h-6 w-6 items-center justify-center rounded-full ${meta.indicator}`,
  };
}

export { mapBookingSource };
