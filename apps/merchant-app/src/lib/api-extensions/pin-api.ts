import { apiClient } from "../api-client";

// Store owner PIN in memory for demo (in production, this would be in database)
// Default to Sarah Johnson's seeded PIN
let ownerPin: string | null = "1234";

// Extend API client with PIN methods
export function initializePinApi() {
  // Check PIN status
  apiClient.getPinStatus = async function() {
    try {
      return await this.get("/auth/pin-status");
    } catch (error: any) {
      // Mock implementation - handle missing endpoint
      if (error?.response?.status === 404 || error?.code === 'ERR_BAD_REQUEST' || !error?.response) {
        // Sarah Johnson has PIN from seed data
        return { hasPin: true };
      }
      // Log the actual error for debugging
      console.log("[getPinStatus] Error details:", {
        status: error?.response?.status,
        message: error?.message,
        code: error?.code
      });
      throw error;
    }
  };

  // Set PIN
  apiClient.setPin = async function(pin: string, role: string = "OWNER") {
    try {
      return await this.post("/auth/set-pin", { pin, role });
    } catch (error: any) {
      // Mock implementation
      if (error.response?.status === 404) {
        if (role === "OWNER") {
          ownerPin = pin;
          return { success: true };
        }
        throw new Error("Only owner PIN is supported in demo mode");
      }
      throw error;
    }
  };

  // Verify PIN
  apiClient.verifyPin = async function(pin: string, feature: string, role: string = "OWNER") {
    try {
      return await this.post("/auth/verify-pin", { pin, feature, role });
    } catch (error: any) {
      // Mock implementation
      if (error.response?.status === 404) {
        if (role === "OWNER" && ownerPin) {
          return { valid: pin === ownerPin };
        }
        // If no owner PIN set, accept any 4-8 digit PIN for first setup
        if (!ownerPin && pin.length >= 4 && pin.length <= 8 && /^\d+$/.test(pin)) {
          ownerPin = pin;
          return { valid: true };
        }
        return { valid: false };
      }
      throw error;
    }
  };

  // Check if owner exists
  apiClient.checkOwnerExists = async function() {
    try {
      const staff = await this.getStaff();
      // Access level 3 = owner (based on Staff interface)
      return staff.some((s: any) => 
        s.role === "OWNER" || 
        s.accessLevel === 3 || 
        s.permissions?.includes("*")
      );
    } catch (error) {
      // Assume owner exists if we can't check
      return true;
    }
  };
}

// Initialize on import
initializePinApi();