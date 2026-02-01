"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Spinner,
} from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import type {
  MerchantUser,
  MerchantRole,
  MerchantUserStatus,
  UpdateMerchantUserRequest,
} from "@/lib/clients/merchant-users-client";

interface EditTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MerchantUser;
  roles: MerchantRole[];
  locations: Array<{ id: string; name: string }>;
  isSelf: boolean;
  isLastOwner: boolean;
  onSuccess: () => void;
}

export function EditTeamMemberDialog({
  open,
  onOpenChange,
  member,
  roles,
  locations,
  isSelf,
  isLastOwner,
  onSuccess,
}: EditTeamMemberDialogProps) {
  const { toast } = useToast();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState<MerchantUserStatus>("ACTIVE");
  const [locationAccess, setLocationAccess] = useState<"all" | "specific">(
    "all"
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Reset form when dialog opens or member changes
  useEffect(() => {
    if (open && member) {
      setFirstName(member.firstName);
      setLastName(member.lastName || "");
      setEmail(member.email);
      setRoleId(member.roleId);
      setStatus(member.status);

      // Set location access
      if (member.locations && member.locations.length > 0) {
        setLocationAccess("specific");
        setSelectedLocations(member.locations.map((l) => l.locationId));
      } else {
        setLocationAccess("all");
        setSelectedLocations([]);
      }
    }
  }, [open, member]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMerchantUserRequest }) =>
      apiClient.merchantUsers.updateMerchantUser(id, data),
    onSuccess: () => {
      toast({
        title: "Team member updated",
        description: "Changes have been saved successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const errorCode = error?.response?.data?.error;
      let message = error?.response?.data?.message || "Failed to update team member";

      if (errorCode === "LAST_OWNER_ROLE_CHANGE") {
        message = "Cannot change role of the last owner. Assign another owner first.";
      } else if (errorCode === "LAST_OWNER_STATUS_CHANGE") {
        message = "Cannot deactivate the last owner. Assign another owner first.";
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Calculate what changed
  const changedFields = useMemo(() => {
    const changes: UpdateMerchantUserRequest = {};

    if (firstName.trim() !== member.firstName) {
      changes.firstName = firstName.trim();
    }
    if ((lastName.trim() || null) !== (member.lastName || null)) {
      changes.lastName = lastName.trim() || undefined;
    }
    if (email.trim().toLowerCase() !== member.email) {
      changes.email = email.trim().toLowerCase();
    }
    if (roleId !== member.roleId) {
      changes.roleId = roleId;
    }
    if (status !== member.status) {
      changes.status = status;
    }

    // Check location changes
    const currentLocationIds = member.locations?.map((l) => l.locationId) || [];
    const newLocationIds =
      locationAccess === "specific" ? selectedLocations : [];

    const locationsChanged =
      currentLocationIds.length !== newLocationIds.length ||
      !currentLocationIds.every((id) => newLocationIds.includes(id));

    if (locationsChanged) {
      changes.locationIds = newLocationIds;
    }

    return changes;
  }, [
    firstName,
    lastName,
    email,
    roleId,
    status,
    locationAccess,
    selectedLocations,
    member,
  ]);

  const hasChanges = Object.keys(changedFields).length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      toast({
        title: "No changes",
        description: "No changes have been made.",
      });
      return;
    }

    // Validate
    if (!firstName.trim()) {
      toast({
        title: "First name required",
        description: "Please enter a first name",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (locationAccess === "specific" && selectedLocations.length === 0) {
      toast({
        title: "Location required",
        description: "Please select at least one location",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ id: member.id, data: changedFields });
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  // Check if the current role is an owner role
  const isOwnerRole = useMemo(() => {
    const role = roles.find((r) => r.id === member.roleId);
    return role?.permissions.includes("*") || false;
  }, [roles, member.roleId]);

  // Role select is disabled if user is editing themselves or is the last owner
  const roleDisabled = isSelf || isLastOwner;
  // Status select is disabled if user is the last owner
  const statusDisabled = isLastOwner;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {member.firstName}&apos;s account details
              {isSelf && " (You cannot change your own role)"}
              {isLastOwner && !isSelf && " (Last owner - role and status are protected)"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={roleId}
                onValueChange={setRoleId}
                disabled={updateMutation.isPending || roleDisabled}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.permissions.includes("*") && " (Full Access)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleDisabled && (
                <p className="text-xs text-muted-foreground">
                  {isSelf
                    ? "You cannot change your own role"
                    : "Cannot change the last owner's role"}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MerchantUserStatus)}
                disabled={updateMutation.isPending || statusDisabled}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {statusDisabled && (
                <p className="text-xs text-muted-foreground">
                  Cannot change the last owner's status
                </p>
              )}
            </div>

            {/* Location Access */}
            {locations.length > 1 && (
              <div className="space-y-3">
                <Label>Location Access</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-locationAccess"
                      checked={locationAccess === "all"}
                      onChange={() => setLocationAccess("all")}
                      disabled={updateMutation.isPending}
                      className="h-4 w-4"
                    />
                    <span>All locations</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-locationAccess"
                      checked={locationAccess === "specific"}
                      onChange={() => setLocationAccess("specific")}
                      disabled={updateMutation.isPending}
                      className="h-4 w-4"
                    />
                    <span>Specific locations</span>
                  </label>
                </div>

                {locationAccess === "specific" && (
                  <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                    {locations.map((location) => (
                      <label
                        key={location.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedLocations.includes(location.id)}
                          onCheckedChange={() => toggleLocation(location.id)}
                          disabled={updateMutation.isPending}
                        />
                        <span>{location.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            <Button
              type="submit"
              disabled={updateMutation.isPending || !hasChanges}
            >
              {updateMutation.isPending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
