"use client";

import { useState, useEffect } from "react";
import { Shield, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Alert, AlertDescription } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import { SetupOwnerPin } from "./SetupOwnerPin";
import "@/lib/api-extensions/pin-api"; // Initialize PIN API extensions

interface PinProtectedProps {
  children: React.ReactNode;
  feature: "reports" | "refunds" | "cancellations" | "settings" | "void" | "discounts" | "staff";
  title?: string;
  description?: string;
}

export function PinProtected({ 
  children, 
  feature, 
  title = "PIN Required",
  description = "Enter your PIN to access this feature"
}: PinProtectedProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPin, setRequiresPin] = useState(true);
  const [needsSetup, setNeedsSetup] = useState<"no-owner" | "no-pin" | null>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Check if PIN is required for this feature
  useEffect(() => {
    checkPinRequirement();
  }, [feature]);

  // Remove session storage - PIN required every time
  useEffect(() => {
    // Always require PIN on mount
    setIsUnlocked(false);
    setPin("");
    setAttempts(0);
    setError("");
  }, []);

  const checkPinRequirement = async () => {
    try {
      // First check if owner exists and has PIN
      const ownerStatus = await checkOwnerStatus();
      
      if (ownerStatus.needsSetup) {
        setNeedsSetup(ownerStatus.setupType);
        setIsLoading(false);
        return;
      }
      
      // Then check settings
      const settings = await apiClient.get("/merchant/settings");
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PinProtected] Settings loaded for ${feature}:`, {
          requirePinForReports: settings.requirePinForReports,
          requirePinForRefunds: settings.requirePinForRefunds,
          requirePinForCancellations: settings.requirePinForCancellations
        });
      }
      
      switch (feature) {
        case "reports":
          // Default to true if undefined
          const requiresReportsPin = settings.requirePinForReports === true || settings.requirePinForReports === undefined;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[PinProtected] Reports PIN required: ${requiresReportsPin}`);
          }
          setRequiresPin(requiresReportsPin);
          break;
        case "refunds":
          setRequiresPin(settings.requirePinForRefunds === true || settings.requirePinForRefunds === undefined);
          break;
        case "cancellations":
          setRequiresPin(settings.requirePinForCancellations === true || settings.requirePinForCancellations === undefined);
          break;
        case "settings":
          // Check for settings PIN requirement (add to settings model if needed)
          setRequiresPin(settings.requirePinForSettings === true || settings.requirePinForSettings === undefined);
          break;
        case "void":
          // Check for void transaction PIN requirement
          setRequiresPin(settings.requirePinForVoid === true || settings.requirePinForVoid === undefined);
          break;
        case "discounts":
          // Check for discount override PIN requirement
          setRequiresPin(settings.requirePinForDiscounts === true || settings.requirePinForDiscounts === undefined);
          break;
        case "staff":
          // Check for staff management PIN requirement
          setRequiresPin(settings.requirePinForStaff === true || settings.requirePinForStaff === undefined);
          break;
        default:
          setRequiresPin(true);
      }
    } catch (error) {
      console.error("Failed to load PIN settings:", error);
      // Default to requiring PIN if settings can't be loaded
      setRequiresPin(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkOwnerStatus = async (): Promise<{ needsSetup: boolean; setupType?: "no-owner" | "no-pin" }> => {
    try {
      // Check if owner exists
      const staff = await apiClient.getStaff();
      // Access level 3 = owner (based on Staff interface: 1=employee, 2=manager, 3=owner)
      const owner = staff.find((s: any) => 
        s.role === "OWNER" || 
        s.accessLevel === 3 || 
        s.permissions?.includes("*")
      );
      
      if (!owner) {
        return { needsSetup: true, setupType: "no-owner" };
      }
      
      // Store owner info for later use
      if (owner) {
        localStorage.setItem("owner_name", `${owner.firstName} ${owner.lastName}`);
      }
      
      // Check if owner has PIN set
      const pinStatus = await (apiClient as any).getPinStatus();
      if (!pinStatus.hasPin) {
        return { needsSetup: true, setupType: "no-pin" };
      }
      
      return { needsSetup: false };
    } catch (error) {
      // If we can't check, assume it's set up
      if (process.env.NODE_ENV === 'development') {
        console.log("[PinProtected] Could not check owner status:", error);
      }
      return { needsSetup: false };
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    try {
      // Try to verify PIN with backend - this should check against owner PIN
      const response = await (apiClient as any).verifyPin(pin, feature, "OWNER");

      if (response.valid) {
        setIsUnlocked(true);
        // No session storage - PIN required every time
        
        toast({
          title: "Success",
          description: "PIN verified successfully",
        });
      } else {
        throw new Error("Invalid PIN");
      }
    } catch (error: any) {
      setAttempts(prev => prev + 1);
      
      if (attempts >= 2) {
        setError("Too many failed attempts. Please contact your manager.");
        toast({
          title: "Access Denied",
          description: "Maximum PIN attempts exceeded",
          variant: "destructive",
        });
      } else {
        setError("Invalid PIN. Please try again.");
      }
      
      setPin("");
    }
  };

  // Handler for when owner setup is complete
  const handleSetupComplete = () => {
    setNeedsSetup(null);
    // Re-check requirements after setup
    checkPinRequirement();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
          <p className="text-muted-foreground">Checking security settings...</p>
        </div>
      </div>
    );
  }

  // If needs setup, show setup flow
  if (needsSetup) {
    return <SetupOwnerPin mode={needsSetup} onComplete={handleSetupComplete} />;
  }

  // If PIN not required or already unlocked, show content
  if (!requiresPin || isUnlocked) {
    return <>{children}</>;
  }

  // Show PIN entry form
  return (
    <div className="container max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[600px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Enter PIN</Label>
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
                autoFocus
                disabled={attempts >= 3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!pin || attempts >= 3}
            >
              Verify PIN
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {feature === "reports" && "Enter the owner PIN to access financial reports"}
              {feature === "refunds" && "Enter the owner PIN to process refunds"}
              {feature === "cancellations" && "Enter the owner PIN for late cancellations"}
              {feature === "settings" && "Enter the owner PIN to modify system settings"}
              {feature === "void" && "Enter the owner PIN to void transactions"}
              {feature === "discounts" && "Enter the owner PIN to apply discount overrides"}
              {feature === "staff" && "Enter the owner PIN to manage staff accounts"}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
