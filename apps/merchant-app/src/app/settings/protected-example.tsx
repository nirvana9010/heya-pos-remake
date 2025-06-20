"use client";

import { PinProtected } from "@/components/PinProtected";

// Example: Protecting sensitive settings sections
export function ProtectedSettingsSection({ children }: { children: React.ReactNode }) {
  return (
    <PinProtected 
      feature="settings" 
      title="Settings Access Required"
      description="Enter your PIN to modify system settings"
    >
      {children}
    </PinProtected>
  );
}

// Example: Protecting specific settings tabs
export function SecuritySettingsTab() {
  return (
    <PinProtected 
      feature="settings"
      title="Security Settings"
      description="PIN required to access security configuration"
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Security Settings</h2>
        {/* Security settings content */}
      </div>
    </PinProtected>
  );
}

// Example: Protecting staff management
export function StaffManagementSection() {
  return (
    <PinProtected 
      feature="staff"
      title="Staff Management"
      description="PIN required to manage staff accounts"
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        {/* Staff management content */}
      </div>
    </PinProtected>
  );
}

// Example: Protecting discount overrides
export function DiscountOverrideForm() {
  return (
    <PinProtected 
      feature="discounts"
      title="Discount Override"
      description="PIN required to apply special discounts"
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Apply Discount</h2>
        {/* Discount form */}
      </div>
    </PinProtected>
  );
}