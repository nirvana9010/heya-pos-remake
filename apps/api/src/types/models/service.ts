export interface Service {
  id: string;
  merchantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number;
  currency: string;
  taxRate: number;
  isActive: boolean;
  requiresDeposit: boolean;
  depositAmount?: number;
  maxAdvanceBooking: number; // days
  minAdvanceBooking: number; // hours
  displayOrder: number;
  category?: string;
  categoryModel?: ServiceCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceCategory {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
