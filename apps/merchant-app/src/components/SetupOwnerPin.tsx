"use client";

import { useState } from "react";
import { Shield, User, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Alert, AlertDescription } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import "@/lib/api-extensions/pin-api"; // Initialize PIN API extensions

interface SetupOwnerPinProps {
  onComplete: () => void;
  mode: "no-owner" | "no-pin";
}

export function SetupOwnerPin({ onComplete, mode }: SetupOwnerPinProps) {
  const [step, setStep] = useState<"create-owner" | "set-pin">(
    mode === "no-owner" ? "create-owner" : "set-pin"
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Owner creation form
  const [ownerData, setOwnerData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  // PIN form
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create owner-level staff member with required fields
      const response = await apiClient.post("/staff", {
        email: ownerData.email,
        firstName: ownerData.firstName,
        lastName: ownerData.lastName,
        phone: "", // Optional
        pin: "0000", // Temporary PIN, will be updated in next step
        role: "OWNER",
        accessLevel: 10, // Maximum access level
        permissions: ["*"], // Full permissions
        commissionRate: 0,
        calendarColor: "#8B5CF6", // Purple for owner
        locationIds: [] // Empty array for all locations
      });

      if (response.id) {
        // Store owner ID for PIN update
        localStorage.setItem("temp_owner_id", response.id);
        
        toast({
          title: "Owner Created",
          description: "Now set up your security PIN",
        });
        setStep("set-pin");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create owner account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    // Validate PIN
    if (pin.length < 4 || pin.length > 8) {
      setPinError("PIN must be 4-8 digits");
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setPinError("PIN must contain only numbers");
      return;
    }

    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      return;
    }

    setLoading(true);

    try {
      // Get the owner ID we stored
      const ownerId = localStorage.getItem("temp_owner_id");
      
      if (ownerId) {
        // Update the owner's PIN using the staff update endpoint
        await apiClient.put(`/staff/${ownerId}`, { pin });
        
        // Clean up temp storage
        localStorage.removeItem("temp_owner_id");
      }
      
      // Also set it in our mock storage for immediate use
      await (apiClient as any).setPin(pin, "OWNER");

      toast({
        title: "Success",
        description: "Owner PIN has been set successfully",
      });

      // Complete setup
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to set PIN",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === "create-owner") {
    return (
      <div className="container max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[600px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Create Owner Account</CardTitle>
            <CardDescription>
              No owner account exists. Create one to manage security settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOwner} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={ownerData.firstName}
                    onChange={(e) => setOwnerData({ ...ownerData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={ownerData.lastName}
                    onChange={(e) => setOwnerData({ ...ownerData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                  required
                />
              </div>


              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Owner Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get owner name if available
  const ownerName = typeof window !== 'undefined' ? localStorage.getItem("owner_name") : null;

  return (
    <div className="container max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[600px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set Owner PIN</CardTitle>
          <CardDescription>
            {ownerName 
              ? `${ownerName} - Create a secure PIN for accessing sensitive features`
              : "Create a secure PIN for accessing sensitive features"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Create PIN (4-8 digits)</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
                maxLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
                maxLength={8}
                required
              />
            </div>

            {pinError && (
              <Alert variant="destructive">
                <AlertDescription>{pinError}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This PIN will be required to access reports, 
                process refunds, and perform other sensitive operations. Keep it secure 
                and do not share it.
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" disabled={loading || !pin || !confirmPin}>
              {loading ? "Setting PIN..." : "Set Owner PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}