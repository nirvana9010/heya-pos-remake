import { BaseApiClient } from "./base-client";

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

export interface StaffScheduleOverride {
  staffId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason?: string;
  source?: "MANUAL" | "HOLIDAY";
  holidayName?: string;
}

export class StaffClient extends BaseApiClient {
  async getStaff(): Promise<Staff[]> {
    return this.get("/staff", undefined, "v1");
  }

  async getStaffMember(id: string): Promise<Staff> {
    return this.get(`/staff/${id}`, undefined, "v1");
  }

  async createStaff(data: CreateStaffRequest): Promise<Staff> {
    return this.post("/staff", data, undefined, "v1");
  }

  async updateStaff(id: string, data: UpdateStaffRequest): Promise<Staff> {
    return this.patch(`/staff/${id}`, data, undefined, "v1");
  }

  async deleteStaff(id: string, hardDelete: boolean = false): Promise<void> {
    const url = hardDelete ? `/staff/${id}?hard=true` : `/staff/${id}`;
    return this.delete(url, undefined, "v1");
  }

  async getAllSchedules(): Promise<any> {
    return this.get("/staff/schedules", undefined, "v1");
  }

  async getSchedule(staffId: string): Promise<any> {
    return this.get(`/staff/${staffId}/schedule`, undefined, "v1");
  }

  async updateSchedule(
    staffId: string,
    data: {
      schedules: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }>;
    },
  ): Promise<any> {
    try {
      return await this.post(
        `/staff/${staffId}/schedule`,
        data,
        undefined,
        "v1",
      );
    } catch (error) {
      throw error;
    }
  }

  async getScheduleOverrides(
    staffId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StaffScheduleOverride[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      return await this.get(`/staff/${staffId}/overrides`, params, "v1");
    } catch (error: any) {
      throw error;
    }
  }

  async createOrUpdateScheduleOverride(
    staffId: string,
    data: {
      date: string;
      startTime: string | null;
      endTime: string | null;
      reason?: string;
    },
  ): Promise<StaffScheduleOverride> {
    const result = await this.post(
      `/staff/${staffId}/overrides`,
      data,
      undefined,
      "v1",
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("roster-override-updated", {
          detail: {
            staffId,
            date: data.date,
          },
        }),
      );
    }

    return result;
  }

  async deleteScheduleOverride(staffId: string, date: string): Promise<void> {
    await this.delete(`/staff/${staffId}/overrides/${date}`, undefined, "v1");

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("roster-override-updated", {
          detail: {
            staffId,
            date,
          },
        }),
      );
    }
  }

  /**
   * Create default schedules for a staff member based on business hours
   */
  async createDefaultSchedule(staffId: string): Promise<any> {
    const result = await this.post(
      `/staff/${staffId}/schedule/default`,
      {},
      undefined,
      "v1",
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("roster-schedule-updated", {
          detail: { staffId },
        }),
      );
    }

    return result;
  }
}
