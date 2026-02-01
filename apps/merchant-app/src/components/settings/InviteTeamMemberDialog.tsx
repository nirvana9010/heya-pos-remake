"use client";

import { useState, useEffect } from "react";
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
  MerchantRole,
  InviteMerchantUserRequest,
} from "@/lib/clients/merchant-users-client";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: MerchantRole[];
  locations: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  roles,
  locations,
  onSuccess,
}: InviteTeamMemberDialogProps) {
  const { toast } = useToast();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [locationAccess, setLocationAccess] = useState<"all" | "specific">(
    "all"
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRoleId("");
      setLocationAccess("all");
      setSelectedLocations([]);
    }
  }, [open]);

  // Set default role when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && !roleId) {
      // Default to first non-owner role, or first role if all are owners
      const defaultRole =
        roles.find((r) => !r.permissions.includes("*")) || roles[0];
      if (defaultRole) {
        setRoleId(defaultRole.id);
      }
    }
  }, [roles, roleId]);

  const inviteMutation = useMutation({
    mutationFn: (data: InviteMerchantUserRequest) =>
      apiClient.merchantUsers.inviteMerchantUser(data),
    onSuccess: (result) => {
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${result.email}`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to send invitation";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    if (!roleId) {
      toast({
        title: "Role required",
        description: "Please select a role",
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

    const data: InviteMerchantUserRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim().toLowerCase(),
      roleId,
      // Only send locationIds if specific locations are selected
      locationIds: locationAccess === "specific" ? selectedLocations : undefined,
    };

    inviteMutation.mutate(data);
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to a new team member. They will receive an
              email with instructions to set up their account.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  disabled={inviteMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  disabled={inviteMutation.isPending}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                disabled={inviteMutation.isPending}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={roleId}
                onValueChange={setRoleId}
                disabled={inviteMutation.isPending}
              >
                <SelectTrigger id="role">
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
            </div>

            {/* Location Access */}
            {locations.length > 1 && (
              <div className="space-y-3">
                <Label>Location Access</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationAccess"
                      checked={locationAccess === "all"}
                      onChange={() => setLocationAccess("all")}
                      disabled={inviteMutation.isPending}
                      className="h-4 w-4"
                    />
                    <span>All locations</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationAccess"
                      checked={locationAccess === "specific"}
                      onChange={() => setLocationAccess("specific")}
                      disabled={inviteMutation.isPending}
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
                          disabled={inviteMutation.isPending}
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
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
