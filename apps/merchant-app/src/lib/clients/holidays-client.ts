import { BaseApiClient } from './base-client';
import type { MerchantHoliday, AustralianState } from '@heya-pos/types';

export interface HolidaysResponse {
  holidays: MerchantHoliday[];
  selectedState: AustralianState | null;
  year: number;
}

export interface CreateCustomHolidayRequest {
  name: string;
  date: string;
}

export interface UpdateHolidayRequest {
  isDayOff?: boolean;
  name?: string;
  date?: string;
}

export class HolidaysClient extends BaseApiClient {
  async list(): Promise<HolidaysResponse> {
    return this.get('/merchant/holidays', undefined, 'v1');
  }

  async syncState(state: AustralianState, year?: number): Promise<HolidaysResponse> {
    return this.put('/merchant/holidays/state', { state, year }, undefined, 'v1');
  }

  async createCustom(data: CreateCustomHolidayRequest): Promise<MerchantHoliday> {
    return this.post('/merchant/holidays', data, undefined, 'v1');
  }

  async update(holidayId: string, data: UpdateHolidayRequest): Promise<MerchantHoliday> {
    return this.patch(`/merchant/holidays/${holidayId}`, data, undefined, 'v1');
  }

  async delete(holidayId: string): Promise<void> {
    await super.delete(`/merchant/holidays/${holidayId}`, undefined, 'v1');
  }
}
