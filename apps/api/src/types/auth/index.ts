export type AuthUserType = 'merchant' | 'merchant_user' | 'staff';

export interface AuthUser {
  id: string;
  merchantId: string;
  staffId?: string;
  merchantUserId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  locationId?: string;
  locations: string[];
  type?: AuthUserType;
}

export interface MerchantUserPayload {
  sub: string; // MerchantUser.id
  merchantId: string;
  merchantUserId: string;
  type: 'merchant_user';
  roleId: string;
  permissions: string[];
  locationIds: string[];
}

export interface AuthSession {
  user: AuthUser;
  merchantId: string;
  locationId?: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  merchant?: any; // Full merchant object with locations
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PinAuthRequest {
  pin: string;
  locationId: string;
}

export interface PinAuthResponse {
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}
