export interface Customer {
  id: string;
  merchantId: string;
  email?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  mobile?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  address?: string;
  city?: string;
  suburb?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  tags: string[];
  preferredLanguage: string;
  marketingConsent: boolean;
  status: CustomerStatus;
  source: CustomerSource;
  loyaltyPoints: number;
  visitCount: number;
  totalSpent: number;
  // allergies?: string;
  // specialRequirements?: string;
  // referralSource?: string;
  // lastCheckInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED'
}

export enum CustomerSource {
  WALK_IN = 'WALK_IN',
  ONLINE = 'ONLINE',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  MIGRATED = 'MIGRATED',
  OTHER = 'OTHER'
}