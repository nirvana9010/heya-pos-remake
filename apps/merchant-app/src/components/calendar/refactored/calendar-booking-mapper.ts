import { format } from 'date-fns';
import { formatName } from '@heya-pos/utils';
import { mapBookingSource } from '@/lib/booking-source';
import {
  normalizeBooking,
  coerceBookingStatus,
  type Booking as ApiBooking,
  type BookingStatus,
  type BookingServiceSummary,
} from '@/lib/clients/bookings-client';
import type { Booking } from './types';
import type { Customer as ApiCustomer } from '@/lib/clients/customers-client';
import type { Staff as ApiStaff } from '@/lib/clients/staff-client';
import type { Service as ApiService } from '@/lib/clients/services-client';
import type { Customer, Staff, Service } from './types';

const isValidDate = (value: Date | null): value is Date => Boolean(value && !Number.isNaN(value.getTime()));

const ensureDateString = (isoString?: string | null): { date: string; time: string } => {
  if (!isoString) {
    return { date: '', time: '00:00' };
  }

  const parsed = new Date(isoString);
  if (!isValidDate(parsed)) {
    return { date: '', time: '00:00' };
  }

  return {
    date: format(parsed, 'yyyy-MM-dd'),
    time: format(parsed, 'HH:mm'),
  };
};

const mapServicesForCalendar = (services?: BookingServiceSummary[]): BookingServiceSummary[] | undefined => {
  if (!services || services.length === 0) {
    return undefined;
  }

  return services.map(service => ({
    ...service,
    serviceId: service.serviceId ? String(service.serviceId) : service.id ? String(service.id) : service.serviceId,
    duration: service.duration ?? 0,
    price: service.price ?? 0,
    categoryId: service.categoryId ? String(service.categoryId) : undefined,
  }));
};

const baseCalendarBooking = (booking: ApiBooking): Booking => {
  const { date, time } = ensureDateString(booking.startTime);
  const duration = booking.duration ?? booking.services?.reduce((sum, service) => sum + (service.duration ?? 0), 0) ?? 0;
  const sourceInfo = mapBookingSource(booking.source, booking.customerSource ?? null);
  const status: BookingStatus = coerceBookingStatus(booking.status);
  const isPaid = booking.isPaid ?? booking.paidAmount > 0;
  const paymentStatus = booking.paymentStatus ?? (isPaid ? 'paid' : 'unpaid');
  const createdAt = booking.createdAt ?? new Date().toISOString();
  const primaryService = booking.services?.[0];
  const rawServiceId = booking.serviceId ?? primaryService?.serviceId ?? null;
  const serviceId = typeof rawServiceId === 'string' ? rawServiceId : rawServiceId ? String(rawServiceId) : null;
  const serviceName = booking.serviceName ?? primaryService?.serviceName ?? primaryService?.name ?? 'Service';
  const servicePrice = booking.totalAmount ?? booking.price ?? primaryService?.price ?? 0;

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    date: booking.date || date,
    time,
    duration,
    status,
    isLocalOnly: false,
    localOnlyExpiresAt: undefined,
    customerId: typeof booking.customerId === 'string' ? booking.customerId : String(booking.customerId),
    customerName: booking.customerName,
    customerPhone: booking.customerPhone ?? '',
    customerEmail: booking.customerEmail ?? '',
    customerSource: booking.customerSource ?? undefined,
    source: sourceInfo.raw,
    sourceCategory: sourceInfo.category,
    sourceLabel: sourceInfo.label,
    serviceId,
    serviceName,
    servicePrice,
    services: mapServicesForCalendar(booking.services),
    staffId: typeof booking.staffId === 'string' ? booking.staffId : booking.staffId ? String(booking.staffId) : null,
    staffName: booking.staffName,
    notes: booking.notes ?? undefined,
    internalNotes: undefined,
    color: undefined,
    paymentStatus,
    paymentMethod: booking.paymentMethod ?? undefined,
    isPaid,
    paidAmount: booking.paidAmount ?? 0,
    totalAmount: booking.totalAmount ?? booking.price ?? 0,
    customerRequestedStaff: booking.customerRequestedStaff ?? false,
    createdAt,
    updatedAt: booking.updatedAt ?? createdAt,
    completedAt: booking.endTime ?? undefined,
  };
};

export const mapNormalizedBookingToCalendar = (booking: ApiBooking): Booking => baseCalendarBooking(booking);

export const mapRawBookingToCalendar = (raw: unknown): Booking => {
  const normalized = normalizeBooking(raw);
  return mapNormalizedBookingToCalendar(normalized);
};

export const mapCustomerToCalendar = (customer: ApiCustomer): Customer => ({
  id: customer.id,
  name: formatName(customer.firstName ?? undefined, customer.lastName ?? undefined) || 'Customer',
  email: customer.email ?? undefined,
  phone: customer.phone ?? undefined,
  mobile: customer.mobile ?? undefined,
  notes: customer.notes ?? undefined,
  tags: Array.isArray((customer as any).tags) ? (customer as any).tags : undefined,
  lastVisit: (customer as any).lastVisit ?? undefined,
  totalVisits: customer.lifetimeVisits ?? customer.visitCount ?? undefined,
  totalSpent: customer.totalSpent ?? undefined,
});

export const mapServiceToCalendar = (service: ApiService): Service => ({
  id: service.id,
  name: service.name,
  categoryId: service.categoryId ?? service.category?.id ?? '',
  categoryName: service.category?.name ?? 'General',
  categoryColor: (service as any).categoryColor ?? service.category?.color ?? (service as any).categoryColorHex,
  duration: service.duration,
  price: service.price,
  description: service.description ?? undefined,
  color: (service as any).color ?? (service as any).displayColor ?? undefined,
});

const resolveStaffColor = (staff: ApiStaff | Staff): string => {
  const pickColor = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'auto') {
      return undefined;
    }
    const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    return hexMatch.test(trimmed) ? trimmed : undefined;
  };

  const calendarColor =
    pickColor((staff as any).calendarColor) ??
    pickColor((staff as any).preferences?.calendarColor) ??
    pickColor((staff as any).settings?.calendarColor);

  if (calendarColor) {
    return calendarColor;
  }

  const explicitColor = pickColor((staff as any).color);
  if (explicitColor) {
    return explicitColor;
  }

  return '#7C3AED';
};

export const mapStaffToCalendar = (staff: ApiStaff): Staff => {
  const color = resolveStaffColor(staff);

  return {
    id: staff.id,
    name: formatName(staff.firstName ?? undefined, staff.lastName ?? undefined) || staff.firstName || 'Staff',
    email: staff.email,
    role: staff.role,
    accessLevel: (staff as any).accessLevel ?? undefined,
    calendarColor: (staff as any).calendarColor && (staff as any).calendarColor !== 'auto'
      ? (staff as any).calendarColor
      : color,
    status: (staff as any).status ?? undefined,
    color,
    avatar: (staff as any).avatar ?? undefined,
    isActive: staff.isActive,
    firstName: staff.firstName ?? undefined,
    lastName: staff.lastName ?? undefined,
    workingHours: (staff as any).workingHours ?? undefined,
    schedules: (staff as any).schedules ?? undefined,
    scheduleOverrides: (staff as any).scheduleOverrides ?? undefined,
    generatedPin: (staff as any).generatedPin ?? undefined,
    pin: (staff as any).pin ?? undefined,
  };
};
