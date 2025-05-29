export interface Package {
  id: string;
  name: string;
  monthlyPrice: number;
  trialDays: number;
  maxLocations: number;
  maxStaff: number;
  maxCustomers: number;
  features: PackageFeature[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageFeature {
  code: string;
  name: string;
  description?: string;
}