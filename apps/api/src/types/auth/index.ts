export interface AuthUser {
  id: string;
  merchantId: string;
  staffId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  locationId?: string;
  locations: string[];
}

export interface AuthSession {
  user: AuthUser;
  merchantId: string;
  locationId?: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
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