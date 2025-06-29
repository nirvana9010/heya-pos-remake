export interface Staff {
  id: string;
  merchantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  pin: string; // Hashed 4-6 digit PIN
  accessLevel: number; // 1=employee, 2=manager, 3=owner
  calendarColor?: string;
  avatar?: string;
  status: StaffStatus;
  hireDate: Date;
  lastLogin?: Date;
  locations?: StaffLocation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffLocation {
  id: string;
  staffId: string;
  locationId: string;
  isPrimary: boolean;
  createdAt: Date;
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum StaffRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  OWNER = 'OWNER'
}

export interface StaffPermission {
  code: string;
  name: string;
  description: string;
  category: string;
}