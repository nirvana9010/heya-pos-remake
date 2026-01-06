import type { Service, ServiceCategory } from "../models";
import type { PaginationParams } from "../common";

export interface CreateServiceRequest {
  name: string;
  categoryId?: string;
  description?: string;
  duration: number;
  price: number;
  taxRate?: number;
  requiresDeposit?: boolean;
  depositAmount?: number;
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
  sortOrder?: number;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  isActive?: boolean;
}

export interface ServiceSearchParams extends PaginationParams {
  categoryId?: string;
  isActive?: boolean;
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface CreateServiceCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateServiceCategoryRequest
  extends Partial<CreateServiceCategoryRequest> {
  isActive?: boolean;
}

export interface ServiceImportRequest {
  data: {
    name: string;
    category?: string;
    duration: number;
    price: number;
    description?: string;
  }[];
  createCategories?: boolean;
}
