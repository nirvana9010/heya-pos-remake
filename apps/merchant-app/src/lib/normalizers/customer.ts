import type { Customer as ApiCustomer } from '@/lib/clients/customers-client';

export interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  dateOfBirth?: string;
  notes?: string;
  tags: string[];
  address?: string;
  suburb?: string;
  postcode?: string;
  marketingConsent: boolean;
  smsConsent: boolean;
  preferredContactMethod?: string;
  totalSpent: number;
  totalVisits: number;
  loyaltyPoints: number;
  loyaltyVisits: number;
  createdAt: string;
  updatedAt: string;
  topServices: Array<{ name: string; count: number }>;
  nextAppointment?: { date: string; service: string };
  upcomingBookings: number;
  pendingRevenue: number;
  lastVisit?: string;
}

export const mapApiCustomerToRecord = (customer: ApiCustomer): CustomerRecord => {
  const safeFirstName = customer.firstName ?? '';
  const safeLastName = customer.lastName ?? '';

  const tags = Array.isArray((customer as any).tags)
    ? ((customer as any).tags as string[])
    : [];

  const topServicesRaw = Array.isArray((customer as any).topServices)
    ? ((customer as any).topServices as Array<{ name?: string; count?: number }>)
    : [];

  const topServices = topServicesRaw.map(service => ({
    name: service.name ?? 'Service',
    count: Number.isFinite(service.count) ? Number(service.count) : 0,
  }));

  const marketingConsent = Boolean((customer as any).marketingConsent);
  const smsConsent = Boolean((customer as any).smsConsent);

  return {
    id: customer.id,
    firstName: safeFirstName || 'Customer',
    lastName: safeLastName,
    email: customer.email ?? undefined,
    phone: customer.phone ?? undefined,
    mobile: customer.mobile ?? undefined,
    dateOfBirth: (customer as any).dateOfBirth ?? undefined,
    notes: customer.notes ?? undefined,
    tags,
    address: (customer as any).address ?? undefined,
    suburb: (customer as any).suburb ?? undefined,
    postcode: (customer as any).postcode ?? undefined,
    marketingConsent,
    smsConsent,
    preferredContactMethod: (customer as any).preferredContactMethod ?? undefined,
    totalSpent: customer.totalSpent ?? 0,
    totalVisits: customer.lifetimeVisits ?? customer.visitCount ?? 0,
    loyaltyPoints: customer.loyaltyPoints ?? 0,
    loyaltyVisits: customer.loyaltyVisits ?? 0,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    topServices,
    nextAppointment: (customer as any).nextAppointment ?? undefined,
    upcomingBookings: (customer as any).upcomingBookings ?? 0,
    pendingRevenue: (customer as any).pendingRevenue ?? 0,
    lastVisit: (customer as any).lastVisit ?? undefined,
  };
};
