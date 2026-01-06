export interface Location {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  suburb: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone: string;
  businessHours: OperatingHours;
  isActive: boolean;
  settings: LocationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingHours {
  [key: string]: DayHours | null; // monday, tuesday, etc.
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string; // HH:mm format
  closeTime?: string; // HH:mm format
  breaks?: TimeSlot[];
}

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface LocationSettings {
  defaultServiceDuration: number;
  slotInterval: number; // 15, 30, 60 minutes
  bufferTime: number; // minutes between appointments
}
