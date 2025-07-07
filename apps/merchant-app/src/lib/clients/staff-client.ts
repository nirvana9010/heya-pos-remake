import { BaseApiClient } from './base-client';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}

export class StaffClient extends BaseApiClient {
  async getStaff(): Promise<Staff[]> {
    return this.get('/staff', undefined, 'v1');
  }

  async getStaffMember(id: string): Promise<Staff> {
    return this.get(`/staff/${id}`, undefined, 'v1');
  }

  async createStaff(data: CreateStaffRequest): Promise<Staff> {
    return this.post('/staff', data, undefined, 'v1');
  }

  async updateStaff(id: string, data: UpdateStaffRequest): Promise<Staff> {
    return this.patch(`/staff/${id}`, data, undefined, 'v1');
  }

  async deleteStaff(id: string): Promise<void> {
    return this.delete(`/staff/${id}`, undefined, 'v1');
  }

  async getAllSchedules(): Promise<any> {
    return this.get('/staff/schedules', undefined, 'v1');
  }

  async getSchedule(staffId: string): Promise<any> {
    return this.get(`/staff/${staffId}/schedule`, undefined, 'v1');
  }

  async updateSchedule(staffId: string, data: { schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }): Promise<any> {
    console.log('[StaffClient] updateSchedule called for staff:', staffId, 'with data:', data);
    try {
      const response = await this.post(`/staff/${staffId}/schedule`, data, undefined, 'v1');
      console.log('[StaffClient] updateSchedule response:', response);
      return response;
    } catch (error) {
      console.error('[StaffClient] updateSchedule error:', error);
      throw error;
    }
  }
}