'use client';

import * as React from 'react';
import { cn } from '@heya-pos/ui';

import type { Booking, Service } from './types';

export interface ServiceLookup {
  byId: Map<string, Service>;
  byName: Map<string, Service>;
  categoryColors: Map<string, string>;
  categoryColorsByName: Map<string, string>;
  serviceColors: Map<string, string>;
}

export const DEFAULT_SERVICE_COLOR = '#94A3B8'; // slate-400

const generateDeterministicColor = (seed: string): string => {
  if (!seed) {
    return DEFAULT_SERVICE_COLOR;
  }

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

const normalizeColor = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (['auto', 'automatic', 'inherit', 'default', 'none'].includes(lowered)) {
    return null;
  }

  return trimmed;
};

const pickNormalizedColor = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = normalizeColor(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const safeServiceId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value !== null && value !== undefined) {
    const stringified = String(value).trim();
    return stringified.length > 0 ? stringified : undefined;
  }

  return undefined;
};

const safeCategoryId = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (value !== null && value !== undefined) {
    const stringified = String(value).trim();
    return stringified.length > 0 ? stringified : undefined;
  }

  return undefined;
};

const toCategoryNameKey = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
};

const deriveServiceItems = (
  booking: Booking,
  lookup: ServiceLookup,
): Array<{ key: string; name: string; color: string }> => {
  const items: Array<{ key: string; name: string; color: string }> = [];

  const mapFromServiceRecord = (
    key: string,
    name: string,
    serviceRecord?: Service,
    explicitColor?: string | null,
    fallbackCategoryId?: string,
    fallbackCategoryNameKey?: string,
  ) => {
    const categoryId = safeCategoryId(fallbackCategoryId ?? serviceRecord?.categoryId);
    const categoryNameKey =
      fallbackCategoryNameKey ??
      toCategoryNameKey(serviceRecord?.categoryName);

    const lookupColorById = categoryId ? lookup.categoryColors.get(categoryId) : null;
    const lookupColorByName = categoryNameKey
      ? lookup.categoryColorsByName.get(categoryNameKey)
      : null;
    const lookupColorByService = serviceRecord?.id
      ? lookup.serviceColors.get(serviceRecord.id)
      : undefined;

    const color = pickNormalizedColor(
      explicitColor,
      serviceRecord?.categoryColor,
      serviceRecord?.color,
      lookupColorByService,
      lookupColorById,
      lookupColorByName,
    );

    const resolvedColor =
      color ??
      (serviceRecord?.id ? generateDeterministicColor(serviceRecord.id) : undefined) ??
      generateDeterministicColor(name || key);

    items.push({ key, name, color: resolvedColor });
  };

  if (Array.isArray(booking.services) && booking.services.length > 0) {
    booking.services.forEach((service, index) => {
      const serviceId = safeServiceId((service as any)?.serviceId ?? (service as any)?.id);
      const matched = serviceId ? lookup.byId.get(serviceId) : undefined;
      const matchedByName = matched || (typeof (service as any)?.name === 'string'
        ? lookup.byName.get((service as any).name.toLowerCase())
        : undefined);

      const rawCategoryId =
        (service as any)?.categoryId ??
        matchedByName?.categoryId ??
        matched?.categoryId;
      const categoryId = safeCategoryId(rawCategoryId);

      const name =
        (service as any)?.name ??
        (service as any)?.serviceName ??
        (service as any)?.service?.name ??
        matchedByName?.name ??
        booking.serviceName ??
        'Service';

      const categoryNameKey = toCategoryNameKey(
        (service as any)?.categoryName ??
        (service as any)?.category?.name ??
        (service as any)?.service?.category?.name ??
        matchedByName?.categoryName ??
        matched?.categoryName,
      );

      const categoryColor = pickNormalizedColor(
        (service as any)?.categoryColor,
        (service as any)?.category?.color,
        (service as any)?.service?.category?.color,
        categoryId ? lookup.categoryColors.get(categoryId) : null,
        categoryNameKey ? lookup.categoryColorsByName.get(categoryNameKey) : null,
      );

      const key = serviceId ?? `${booking.id}-service-${index}`;
      mapFromServiceRecord(
        key,
        name,
        matchedByName ?? matched,
        categoryColor,
        categoryId,
        categoryNameKey,
      );
    });

    if (items.length > 0) {
      return items;
    }
  }

  const serviceName = booking.serviceName?.trim();
  if (serviceName) {
    const parts = serviceName.split(/\s*\+\s*/).map(part => part.trim()).filter(Boolean);

    if (parts.length > 1) {
      parts.forEach((name, index) => {
        const matched = lookup.byName.get(name.toLowerCase());
        const key = matched?.id ?? `${booking.id}-service-name-${index}`;
        mapFromServiceRecord(
          key,
          name,
          matched,
          undefined,
          matched?.categoryId,
          matched?.categoryName ? toCategoryNameKey(matched.categoryName) : undefined,
        );
      });

      if (items.length > 0) {
        return items;
      }
    }

    const matched =
      (booking.serviceId && lookup.byId.get(booking.serviceId)) ||
      lookup.byName.get(serviceName.toLowerCase());
    const categoryId = safeCategoryId(matched?.categoryId);
    const categoryNameKey = toCategoryNameKey(matched?.categoryName);
    const fallbackColor = pickNormalizedColor(
      matched?.categoryColor,
      matched?.color,
      categoryId ? lookup.categoryColors.get(categoryId) : null,
      categoryNameKey ? lookup.categoryColorsByName.get(categoryNameKey) : null,
    );
    const key = booking.serviceId || matched?.id || `${booking.id}-primary-service`;
    mapFromServiceRecord(
      key,
      serviceName,
      matched,
      fallbackColor,
      categoryId,
      categoryNameKey,
    );
    return items;
  }

  mapFromServiceRecord(`${booking.id}-fallback`, 'Service');
  return items;
};

export interface BookingServiceLabelsProps {
  booking: Booking;
  lookup: ServiceLookup;
  className?: string;
  textClassName?: string;
  dotClassName?: string;
}

export const BookingServiceLabels: React.FC<BookingServiceLabelsProps> = ({
  booking,
  lookup,
  className,
  textClassName,
  dotClassName = 'h-2.5 w-2.5',
}) => {
  const serviceItems = React.useMemo(() => deriveServiceItems(booking, lookup), [booking, lookup]);

  if (serviceItems.length === 0) {
    return null;
  }

  if (serviceItems.length === 1) {
    const [item] = serviceItems;
    return (
      <div className={cn('flex min-w-0 items-center gap-1', className)}>
        <span
          className={cn('flex-shrink-0 rounded-full', dotClassName)}
          style={{ backgroundColor: item.color }}
          aria-hidden="true"
        />
        <span className={cn('truncate', textClassName)} title={item.name}>
          {item.name}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      {serviceItems.map(item => (
        <div key={item.key} className="flex min-w-0 items-center gap-1">
          <span
            className={cn('flex-shrink-0 rounded-full', dotClassName)}
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className={cn('truncate', textClassName)} title={item.name}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export const createServiceLookup = (services: Service[]): ServiceLookup => {
  const byId = new Map<string, Service>();
  const byName = new Map<string, Service>();
  const categoryColors = new Map<string, string>();
  const categoryColorsByName = new Map<string, string>();
  const serviceColors = new Map<string, string>();

  services.forEach(service => {
    if (service.id) {
      byId.set(service.id, service);
    }
    if (service.name) {
      const key = service.name.trim().toLowerCase();
      if (key) {
        byName.set(key, service);
      }
    }
    const normalizedColor = normalizeColor(service.categoryColor ?? service.color);
    const normalizedServiceColor = normalizeColor(service.color ?? service.categoryColor);
    if (service.categoryId && normalizedColor) {
      categoryColors.set(service.categoryId, normalizedColor);
    }
    if (service.categoryName) {
      const nameKey = toCategoryNameKey(service.categoryName);
      if (nameKey && normalizedColor) {
        categoryColorsByName.set(nameKey, normalizedColor);
      }
    }
    if (service.id && normalizedServiceColor) {
      serviceColors.set(service.id, normalizedServiceColor);
    }
  });

  return { byId, byName, categoryColors, categoryColorsByName, serviceColors };
};
