import type { Customer, CustomerStatus, CustomerSource } from "../models";
import type { PaginationParams } from "../common";

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  tags?: string[];
  marketingConsent?: boolean;
  source: CustomerSource;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  status?: CustomerStatus;
}

export interface CustomerSearchParams extends PaginationParams {
  searchTerm?: string;
  status?: CustomerStatus;
  source?: CustomerSource;
  tags?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  minVisits?: number;
  minSpent?: number;
}

export interface CustomerImportRequest {
  data: CreateCustomerRequest[];
  updateExisting?: boolean;
  skipDuplicates?: boolean;
}

export interface CustomerImportResponse {
  imported: number;
  updated: number;
  skipped: number;
  errors: {
    row: number;
    error: string;
  }[];
}
