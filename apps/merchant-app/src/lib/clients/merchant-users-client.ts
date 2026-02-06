import { BaseApiClient } from "./base-client";

export type MerchantUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface MerchantUserLocation {
  locationId: string;
  location: {
    id: string;
    name: string;
  };
}

export interface MerchantRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  merchantId: string | null;
}

export interface MerchantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  roleId: string;
  status: MerchantUserStatus;
  role: MerchantRole;
  locations: MerchantUserLocation[];
  invitedAt?: string;
  inviteExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteMerchantUserRequest {
  email: string;
  firstName: string;
  lastName?: string;
  roleId: string;
  locationIds?: string[];
}

export interface InviteMerchantUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  inviteToken?: string;
  inviteExpiresAt: string;
  merchantName: string;
}

export interface CreateMerchantUserRequest {
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
  roleId: string;
  locationIds?: string[];
}

export interface UpdateMerchantUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  status?: MerchantUserStatus;
  locationIds?: string[];
}

export class MerchantUsersClient extends BaseApiClient {
  /**
   * Get all merchant users for the current merchant
   */
  async getMerchantUsers(status?: MerchantUserStatus): Promise<MerchantUser[]> {
    const params = status ? { status } : undefined;
    return this.get("/merchant-users", { params }, "v1");
  }

  /**
   * Get a single merchant user by ID
   */
  async getMerchantUser(id: string): Promise<MerchantUser> {
    return this.get(`/merchant-users/${id}`, undefined, "v1");
  }

  /**
   * Get all available roles for the merchant
   */
  async getMerchantRoles(): Promise<MerchantRole[]> {
    return this.get("/merchant-users/roles", undefined, "v1");
  }

  /**
   * Invite a new team member (legacy - prefer createMerchantUser)
   */
  async inviteMerchantUser(
    data: InviteMerchantUserRequest
  ): Promise<InviteMerchantUserResponse> {
    return this.post("/merchant-users/invite", data, undefined, "v1");
  }

  /**
   * Create a new team member with email and password
   */
  async createMerchantUser(
    data: CreateMerchantUserRequest
  ): Promise<MerchantUser> {
    return this.post("/merchant-users", data, undefined, "v1");
  }

  /**
   * Update a merchant user
   */
  async updateMerchantUser(
    id: string,
    data: UpdateMerchantUserRequest
  ): Promise<MerchantUser> {
    return this.patch(`/merchant-users/${id}`, data, undefined, "v1");
  }

  /**
   * Delete a merchant user
   */
  async deleteMerchantUser(id: string): Promise<{ success: boolean }> {
    return this.delete(`/merchant-users/${id}`, undefined, "v1");
  }

  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
  }): Promise<MerchantRole> {
    return this.post("/merchant-users/roles", data, undefined, "v1");
  }

  /**
   * Update a role
   */
  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
    }
  ): Promise<MerchantRole> {
    return this.patch(`/merchant-users/roles/${id}`, data, undefined, "v1");
  }

  /**
   * Delete a role
   */
  async deleteRole(id: string): Promise<{ success: boolean }> {
    return this.delete(`/merchant-users/roles/${id}`, undefined, "v1");
  }
}
