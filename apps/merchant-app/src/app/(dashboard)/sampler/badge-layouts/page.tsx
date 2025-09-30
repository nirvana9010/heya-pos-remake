'use client';

import React from 'react';
import { cn } from '@heya-pos/ui';
import { Heart, Globe2, Check, Shield } from 'lucide-react';

type BadgeLayoutVariant = 'stacked' | 'row' | 'rowWrap' | 'iconOnly' | 'split';

interface MockTileConfig {
  id: string;
  title: string;
  description: string;
  variant: BadgeLayoutVariant;
}

const TILE_VARIANTS: MockTileConfig[] = [
  {
    id: 'stacked',
    title: 'Current – Vertical Stack',
    description: 'Badges sit in a column on the right. Highest vertical cost.',
    variant: 'stacked',
  },
  {
    id: 'row',
    title: 'Horizontal Row',
    description: 'All badges collapse into a single right-aligned row.',
    variant: 'row',
  },
  {
    id: 'rowWrap',
    title: 'Row w/ Wrap',
    description: 'Row layout that allows wrapping on very narrow tiles.',
    variant: 'rowWrap',
  },
  {
    id: 'iconOnly',
    title: 'Icon‑Only',
    description: 'Use icons (heart / globe) only; no text labels.',
    variant: 'iconOnly',
  },
  {
    id: 'split',
    title: 'Split Corners',
    description: 'Source badge bottom-right, status bottom-left, heart top-right.',
    variant: 'split',
  },
];

const TILE_HEIGHTS = [
  { label: 'Short (70px)', height: 70 },
  { label: 'Medium (120px)', height: 120 },
  { label: 'Tall (180px)', height: 180 },
];

const SAMPLE_BOOKING = {
  time: '10:45 AM',
  duration: 45,
  customer: 'Charlotte Nguyen',
  service: 'Balayage & Gloss Refresh',
  staff: 'Liam Harper',
  notes: 'Prefers a warmer tone; mentioned mild scalp sensitivity.',
};

export default function BadgeLayoutsPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Badge Layout Mockups</h1>
        <p className="text-sm text-muted-foreground">
          Each row shows the same badge arrangement rendered on tiles with different heights.
          Use this playground to compare the information density we reclaim with each approach.
        </p>
      </header>

      <div className="grid gap-12">
        {TILE_VARIANTS.map((variant) => (
          <section key={variant.id} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{variant.title}</h2>
              <p className="text-sm text-muted-foreground">{variant.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {TILE_HEIGHTS.map(({ label, height }) => (
                <article key={label} className="flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <MockBookingTile layout={variant.variant} minHeight={height} />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

interface MockBookingTileProps {
  layout: BadgeLayoutVariant;
  minHeight: number;
}

function MockBookingTile({ layout, minHeight }: MockBookingTileProps) {
  const isCompact = minHeight <= 80;

  const mainContent = isCompact ? (
    <div className="space-y-0.5 pr-6">
      <p className="text-xs font-semibold leading-snug text-white truncate">
        {SAMPLE_BOOKING.customer}
      </p>
      <p className="text-[11px] text-white/75 truncate">{SAMPLE_BOOKING.service}</p>
    </div>
  ) : (
    <div className="space-y-1.5 pr-6">
      <time className="text-xs font-medium tracking-wide text-slate-200/80">
        {SAMPLE_BOOKING.time} • {SAMPLE_BOOKING.duration}m
      </time>
      <p className="text-sm font-semibold leading-snug">{SAMPLE_BOOKING.customer}</p>
      <p className="text-xs text-slate-200/80">{SAMPLE_BOOKING.service}</p>
      <p className="text-xs text-slate-200/60">{SAMPLE_BOOKING.staff}</p>
      <p className="text-xs text-slate-200/50 line-clamp-2">{SAMPLE_BOOKING.notes}</p>
    </div>
  );

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900/90 p-3 text-white shadow-sm"
      style={{ minHeight }}
    >
      <div className="flex items-start justify-between gap-2">
        {mainContent}
        <div className="mt-1 flex items-center gap-1 text-xs text-white/70">
          <Shield className="h-3.5 w-3.5" strokeWidth={2.4} />
          <span>PAID</span>
        </div>
      </div>

      <div className="pointer-events-none">
        {renderBadgeCluster(layout, isCompact)}
      </div>

      <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-400" />
      <div className="absolute inset-0 rounded-lg ring-1 ring-white/10" />
    </div>
  );
}

function renderBadgeCluster(layout: BadgeLayoutVariant, compact: boolean) {
  const badges = {
    preferred: (
      <span
        key="preferred"
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-rose-500 text-white shadow',
          compact ? 'h-5 w-5' : 'h-6 w-6'
        )}
      >
        <Heart className="h-3 w-3" strokeWidth={2.2} fill="currentColor" />
      </span>
    ),
    source: (
      <span
        key="source"
        className={cn(
          'inline-flex items-center whitespace-nowrap rounded-full bg-sky-100 text-[10px] font-semibold uppercase tracking-wide text-sky-700 shadow',
          compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
        )}
      >
        <Globe2 className="mr-1 h-3 w-3" />
        Online
      </span>
    ),
    status: (
      <span
        key="status"
        className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950"
      >
        <Check className="mr-1 h-3 w-3" strokeWidth={3} />
        Pending
      </span>
    ),
  };

  switch (layout) {
    case 'stacked':
      return (
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
          {badges.preferred}
          {badges.source}
          {badges.status}
        </div>
      );

    case 'row':
      return (
        <div className="absolute bottom-2 right-2 flex flex-row-reverse items-center gap-1">
          {badges.preferred}
          {badges.source}
          {badges.status}
        </div>
      );

    case 'rowWrap':
      return (
        <div className="absolute bottom-2 right-2 flex max-w-[140px] flex-row-reverse flex-wrap items-center gap-1">
          {badges.preferred}
          {badges.source}
          {badges.status}
        </div>
      );

    case 'iconOnly':
      return (
        <div className="absolute bottom-2 right-2 flex flex-row-reverse items-center gap-1">
          {badges.preferred}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/90 text-white shadow">
            <Globe2 className="h-3 w-3" />
          </span>
        </div>
      );

    case 'split':
    default:
      return (
        <>
          <div className="absolute top-2 right-2">{badges.preferred}</div>
          <div className="absolute bottom-2 right-2">{badges.source}</div>
          <div className="absolute bottom-2 left-2">{badges.status}</div>
        </>
      );
  }
}
