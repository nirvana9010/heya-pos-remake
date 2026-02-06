"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { MerchantRole } from "@/lib/clients/merchant-users-client";

// All available permissions grouped by category
const PERMISSION_GROUPS: Record<string, { permission: string; label: string }[]> = {
  Bookings: [
    { permission: "booking.view", label: "View Bookings" },
    { permission: "booking.create", label: "Create Bookings" },
    { permission: "booking.update", label: "Edit Bookings" },
    { permission: "booking.cancel", label: "Cancel Bookings" },
    { permission: "booking.delete", label: "Delete Bookings" },
  ],
  Customers: [
    { permission: "customer.view", label: "View Customers" },
    { permission: "customer.create", label: "Add Customers" },
    { permission: "customer.update", label: "Edit Customers" },
    { permission: "customer.delete", label: "Delete Customers" },
  ],
  Services: [
    { permission: "service.view", label: "View Services" },
    { permission: "service.create", label: "Add Services" },
    { permission: "service.update", label: "Edit Services" },
    { permission: "service.delete", label: "Delete Services" },
  ],
  Staff: [
    { permission: "staff.view", label: "View Staff" },
    { permission: "staff.create", label: "Add Staff" },
    { permission: "staff.update", label: "Edit Staff" },
    { permission: "staff.delete", label: "Delete Staff" },
  ],
  Payments: [
    { permission: "payment.view", label: "View Payments" },
    { permission: "payment.process", label: "Process Payments" },
    { permission: "payment.refund", label: "Process Refunds" },
  ],
  Reports: [
    { permission: "report.view", label: "View Reports" },
    { permission: "report.export", label: "Export Reports" },
  ],
  Settings: [
    { permission: "settings.view", label: "View Settings" },
    { permission: "settings.update", label: "Edit Settings" },
  ],
};

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: MerchantRole | null;
  onSuccess?: () => void;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: EditRoleDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Reset form when role changes
  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || "");
      setSelectedPermissions(new Set(role.permissions));
    }
  }, [role]);

  const isOwnerRole = useMemo(() => {
    return role?.permissions.includes("*") || role?.name === "Owner";
  }, [role]);

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string; permissions?: string[] }) =>
      apiClient.merchantUsers.updateRole(role!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantRoles"] });
      toast({
        title: "Role updated",
        description: `${name} role has been updated successfully.`,
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const handlePermissionToggle = (permission: string) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setSelectedPermissions(newPermissions);
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = PERMISSION_GROUPS[category].map((p) => p.permission);
    const allSelected = categoryPermissions.every((p) => selectedPermissions.has(p));

    const newPermissions = new Set(selectedPermissions);
    if (allSelected) {
      categoryPermissions.forEach((p) => newPermissions.delete(p));
    } else {
      categoryPermissions.forEach((p) => newPermissions.add(p));
    }
    setSelectedPermissions(newPermissions);
  };

  const isCategoryFullySelected = (category: string) => {
    return PERMISSION_GROUPS[category].every((p) => selectedPermissions.has(p.permission));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const perms = PERMISSION_GROUPS[category];
    const selectedCount = perms.filter((p) => selectedPermissions.has(p.permission)).length;
    return selectedCount > 0 && selectedCount < perms.length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: Array.from(selectedPermissions),
    });
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
          <DialogDescription>
            {isOwnerRole
              ? "The Owner role has full access and cannot be modified."
              : "Customize the permissions for this role."}
          </DialogDescription>
        </DialogHeader>

        {isOwnerRole ? (
          <div className="py-6 text-center text-muted-foreground">
            <p>The Owner role automatically has full access to all features.</p>
            <p className="mt-2">This role cannot be edited or restricted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Senior Staff"
                disabled={role.isSystem}
              />
              {role.isSystem && (
                <p className="text-xs text-muted-foreground">
                  System role names cannot be changed.
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description (optional)</Label>
              <Input
                id="roleDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this role"
              />
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(PERMISSION_GROUPS).map(([category, permissions]) => (
                  <div key={category} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={isCategoryFullySelected(category)}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement).dataset.state = isCategoryPartiallySelected(category)
                              ? "indeterminate"
                              : isCategoryFullySelected(category)
                              ? "checked"
                              : "unchecked";
                          }
                        }}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="font-medium cursor-pointer"
                      >
                        {category}
                      </Label>
                    </div>
                    <div className="ml-6 space-y-2">
                      {permissions.map(({ permission, label }) => (
                        <div key={permission} className="flex items-center gap-2">
                          <Checkbox
                            id={permission}
                            checked={selectedPermissions.has(permission)}
                            onCheckedChange={() => handlePermissionToggle(permission)}
                          />
                          <Label
                            htmlFor={permission}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
