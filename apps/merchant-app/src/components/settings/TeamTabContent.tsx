"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
} from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { Plus, Edit, Trash2, Users, Shield, Crown } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth, usePermissions } from "@/lib/auth/auth-provider";
import type {
  MerchantUser,
  MerchantRole,
} from "@/lib/clients/merchant-users-client";
import { AddTeamMemberDialog } from "./AddTeamMemberDialog";
import { EditTeamMemberDialog } from "./EditTeamMemberDialog";
import { EditRoleDialog } from "./EditRoleDialog";

// Human-readable permission labels grouped by category
const PERMISSION_LABELS: Record<string, { label: string; category: string }> = {
  // Bookings
  "booking.read": { label: "View Bookings", category: "Bookings" },
  "booking.create": { label: "Create Bookings", category: "Bookings" },
  "booking.update": { label: "Edit Bookings", category: "Bookings" },
  "booking.cancel": { label: "Cancel Bookings", category: "Bookings" },
  "booking.delete": { label: "Delete Bookings", category: "Bookings" },
  // Customers
  "customers.read": { label: "View Customers", category: "Customers" },
  "customers.create": { label: "Add Customers", category: "Customers" },
  "customers.update": { label: "Edit Customers", category: "Customers" },
  "customers.delete": { label: "Delete Customers", category: "Customers" },
  "customers.export": { label: "Export Customers", category: "Customers" },
  "customers.import": { label: "Import Customers", category: "Customers" },
  // Services
  "service.view": { label: "View Services", category: "Services" },
  "service.create": { label: "Add Services", category: "Services" },
  "service.update": { label: "Edit Services", category: "Services" },
  "service.delete": { label: "Delete Services", category: "Services" },
  // Staff
  "staff.view": { label: "View Staff", category: "Staff" },
  "staff.create": { label: "Add Staff", category: "Staff" },
  "staff.update": { label: "Edit Staff", category: "Staff" },
  "staff.delete": { label: "Delete Staff", category: "Staff" },
  // Payments
  "payment.view": { label: "View Payments", category: "Payments" },
  "payment.create": { label: "Create Payments", category: "Payments" },
  "payment.process": { label: "Process Payments", category: "Payments" },
  "payment.refund": { label: "Process Refunds", category: "Payments" },
  // Reports
  "reports.view": { label: "View Reports", category: "Reports" },
  "reports.export": { label: "Export Reports", category: "Reports" },
  // Settings
  "settings.view": { label: "View Settings", category: "Settings" },
  "settings.update": { label: "Edit Settings", category: "Settings" },
  "settings.billing": { label: "Manage Billing", category: "Settings" },
};

// Group permissions by category for display
function groupPermissionsByCategory(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const perm of permissions) {
    const info = PERMISSION_LABELS[perm];
    if (info) {
      if (!grouped[info.category]) {
        grouped[info.category] = [];
      }
      grouped[info.category].push(info.label);
    }
  }

  return grouped;
}

// Get human-readable label for a permission
function getPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission]?.label || permission;
}

interface TeamTabContentProps {
  merchant: {
    id: string;
    name: string;
    email?: string;
    locations?: Array<{ id: string; name: string; isActive: boolean }>;
  } | null;
}

export function TeamTabContent({ merchant }: TeamTabContentProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { can, isOwner: isCurrentUserOwner, isMerchantOwner } = usePermissions();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<MerchantUser | null>(null);
  const [editingRole, setEditingRole] = useState<MerchantRole | null>(null);

  // Fetch team members
  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["merchantUsers"],
    queryFn: () => apiClient.merchantUsers.getMerchantUsers(),
    staleTime: 30_000,
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["merchantRoles"],
    queryFn: () => apiClient.merchantUsers.getMerchantRoles(),
    staleTime: 60_000,
  });

  // Create a combined list that includes the merchant owner
  const allMembers = useMemo(() => {
    const ownerRole = roles.find(
      (role) => role.isSystem && role.permissions.includes("*")
    );

    // Always create a virtual "owner" entry for the merchant/business account
    // This represents the primary business login (MerchantAuth), not a MerchantUser
    const ownerEntry: MerchantUser | null = merchant ? {
      id: "merchant-owner",
      merchantId: merchant.id,
      email: merchant.email || "",
      firstName: merchant.name,
      lastName: "",
      status: "ACTIVE" as const,
      roleId: ownerRole?.id || "",
      role: ownerRole || { id: "", name: "Owner", permissions: ["*"], isSystem: true, description: "Full access", merchantId: null },
      locations: [],
      createdAt: "",
      updatedAt: "",
    } : null;

    // Always prepend owner entry at top
    if (ownerEntry) {
      return [ownerEntry, ...members];
    }

    return members;
  }, [members, roles, merchant]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.merchantUsers.deleteMerchantUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchantUsers"] });
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully.",
      });
    },
    onError: (error: any) => {
      const errorCode = error?.response?.data?.error;
      let message = error?.response?.data?.message || "Failed to remove team member";

      if (errorCode === "LAST_OWNER_DELETE") {
        message = "Cannot delete the last owner. Assign another owner first.";
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Owner detection helpers
  const ownerRole = useMemo(() => {
    return roles.find(
      (role) => role.isSystem && role.permissions.includes("*")
    );
  }, [roles]);

  const activeOwnerCount = useMemo(() => {
    if (!ownerRole) return 0;
    return members.filter(
      (m) => m.roleId === ownerRole.id && m.status === "ACTIVE"
    ).length;
  }, [members, ownerRole]);

  const isLastOwner = useCallback(
    (member: MerchantUser) => {
      if (!ownerRole) return false;
      return member.roleId === ownerRole.id && activeOwnerCount === 1;
    },
    [ownerRole, activeOwnerCount]
  );

  const isSelf = useCallback(
    (member: MerchantUser) => {
      // Virtual owner entry
      if (member.id === "merchant-owner") {
        return isMerchantOwner;
      }
      // Check by merchantUserId if available, otherwise by email
      if (user?.merchantUserId) {
        return member.id === user.merchantUserId;
      }
      return member.email === user?.email;
    },
    [user, isMerchantOwner]
  );

  const isVirtualOwner = useCallback((member: MerchantUser) => {
    return member.id === "merchant-owner";
  }, []);

  const handleDelete = useCallback(
    (member: MerchantUser) => {
      if (isVirtualOwner(member)) {
        toast({
          title: "Cannot delete owner",
          description: "The business owner account cannot be deleted.",
          variant: "destructive",
        });
        return;
      }

      if (isSelf(member)) {
        toast({
          title: "Cannot delete yourself",
          description: "You cannot remove your own account.",
          variant: "destructive",
        });
        return;
      }

      if (isLastOwner(member)) {
        toast({
          title: "Cannot delete last owner",
          description: "Assign another owner before deleting this one.",
          variant: "destructive",
        });
        return;
      }

      if (
        window.confirm(
          `Are you sure you want to remove ${member.firstName} ${member.lastName || ""}?`
        )
      ) {
        deleteMutation.mutate(member.id);
      }
    },
    [isSelf, isLastOwner, isVirtualOwner, deleteMutation, toast]
  );

  const handleInviteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["merchantUsers"] });
    setShowInviteDialog(false);
  }, [queryClient]);

  const handleEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["merchantUsers"] });
    setEditingMember(null);
  }, [queryClient]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">Pending</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLocationDisplay = (member: MerchantUser) => {
    if (!member.locations || member.locations.length === 0) {
      return <span className="text-muted-foreground">All locations</span>;
    }
    const locationNames = member.locations.map((l) => l.location.name);
    if (locationNames.length <= 2) {
      return locationNames.join(", ");
    }
    return `${locationNames.slice(0, 2).join(", ")} +${locationNames.length - 2} more`;
  };

  const locations = useMemo(() => {
    return merchant?.locations?.filter((l) => l.isActive) || [];
  }, [merchant?.locations]);

  if (membersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (membersError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load team members</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["merchantUsers"] })
            }
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage who can access your business account
              </CardDescription>
            </div>
            {can("staff.create") && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {allMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet</p>
              {can("staff.create") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowInviteDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first team member
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {isVirtualOwner(member) && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {member.firstName} {member.lastName || ""}
                        {isSelf(member) && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role?.permissions?.includes("*")
                            ? "default"
                            : "secondary"
                        }
                      >
                        {member.role?.name || "Owner"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getLocationDisplay(member)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isVirtualOwner(member) && can("staff.update") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMember(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {!isVirtualOwner(member) && can("staff.delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(member)}
                            disabled={
                              isSelf(member) ||
                              isLastOwner(member) ||
                              deleteMutation.isPending
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {isVirtualOwner(member) && (
                          <span className="text-xs text-muted-foreground">
                            Primary account
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Roles Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
              <CardDescription>
                Customize what each role can access
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => {
              const groupedPermissions = role.permissions.includes("*")
                ? null
                : groupPermissionsByCategory(role.permissions);

              return (
                <div
                  key={role.id}
                  className="p-4 border rounded-lg bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{role.name}</h4>
                    <div className="flex items-center gap-2">
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                      {can("settings.update") && !role.permissions.includes("*") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRole(role)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    {role.permissions.includes("*") ? (
                      <Badge variant="default" className="text-xs">
                        Full Access
                      </Badge>
                    ) : groupedPermissions ? (
                      Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category}>
                          <span className="text-xs font-medium text-muted-foreground">
                            {category}:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {perms.map((perm) => (
                              <Badge
                                key={perm}
                                variant="secondary"
                                className="text-xs"
                              >
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddTeamMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        roles={roles}
        locations={locations}
        onSuccess={handleInviteSuccess}
      />

      {editingMember && !isVirtualOwner(editingMember) && (
        <EditTeamMemberDialog
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          member={editingMember}
          roles={roles}
          locations={locations}
          isSelf={isSelf(editingMember)}
          isLastOwner={isLastOwner(editingMember)}
          onSuccess={handleEditSuccess}
        />
      )}

      <EditRoleDialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        role={editingRole}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["merchantRoles"] });
          setEditingRole(null);
        }}
      />
    </div>
  );
}
