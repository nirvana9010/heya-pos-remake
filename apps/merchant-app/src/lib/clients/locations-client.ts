import { BaseApiClient } from './base-client';

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLocationRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface MerchantSettings {
  settings: {
    enableTips: boolean;
    defaultTipPercentages: number[];
  };
}

export class LocationsClient extends BaseApiClient {
  async getLocations(): Promise<Location[]> {
    return this.get('/locations', undefined, 'v1');
  }

  async getLocation(id: string): Promise<Location> {
    return this.get(`/locations/${id}`, undefined, 'v1');
  }

  async updateLocation(id: string, data: UpdateLocationRequest): Promise<Location> {
    return this.patch(`/locations/${id}`, data, undefined, 'v1');
  }

  async updateLocationTimezone(id: string, timezone: string): Promise<Location> {
    return this.patch(`/locations/${id}/timezone`, { timezone }, undefined, 'v1');
  }

  async getMerchantSettings(): Promise<MerchantSettings> {
    try {
      return await this.get('/merchant/settings', undefined, 'v1');
    } catch (error: any) {
      // Return default settings if endpoint doesn't exist
      if (error.status === 404) {
        return {
          settings: {
            enableTips: true,
            defaultTipPercentages: [10, 15, 20]
          }
        };
      }
      throw error;
    }
  }
}