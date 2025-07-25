"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, AlertCircle } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { adminApi, type Merchant, type Package } from "@/lib/admin-api";
import { ProtectedRoute } from "@/components/protected-route";

function EditMerchantPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const merchantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    abn: '',
    packageId: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, [merchantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [merchantData, packagesData] = await Promise.all([
        adminApi.getMerchant(merchantId),
        adminApi.getPackages()
      ]);
      
      setMerchant(merchantData);
      setPackages(packagesData);
      
      // Initialize form with merchant data
      setFormData({
        name: merchantData.name,
        email: merchantData.email,
        phone: merchantData.phone,
        abn: merchantData.abn || '',
        packageId: merchantData.subscription?.package?.id || '',
        isActive: merchantData.isActive,
      });
    } catch (error) {
      console.error('Failed to load merchant:', error);
      toast({
        title: "Error",
        description: "Failed to load merchant data",
        variant: "destructive",
      });
      router.push('/merchants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        abn: formData.abn,
        isActive: formData.isActive,
      };

      // Only include packageId if it's changed
      if (formData.packageId && formData.packageId !== merchant?.subscription?.package?.id) {
        updateData.packageId = formData.packageId;
      }

      await adminApi.updateMerchant(merchantId, updateData);
      
      toast({
        title: "Success!",
        description: "Merchant updated successfully",
      });
      
      router.push('/merchants');
    } catch (error: any) {
      console.error('Failed to update merchant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update merchant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Merchant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/merchants')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Merchants
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Merchant</h1>
        <p className="text-muted-foreground mt-1">Update merchant information and settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update the merchant's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abn">ABN</Label>
                  <Input
                    id="abn"
                    value={formData.abn}
                    onChange={(e) => setFormData(prev => ({ ...prev, abn: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage the merchant's subscription package</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="package">Package</Label>
                <Select
                  value={formData.packageId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, packageId: value }))}
                >
                  <SelectTrigger id="package">
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ${pkg.monthlyPrice}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    value={merchant.subdomain}
                    disabled
                    className="opacity-60"
                  />
                  <span className="text-sm text-muted-foreground">.heya-pos.com</span>
                </div>
                <p className="text-xs text-muted-foreground">Subdomain cannot be changed after creation</p>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Control the merchant's access to the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive merchants cannot access the platform
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Overview of merchant activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Locations</p>
                  <p className="text-2xl font-bold">{merchant._count?.locations || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="text-2xl font-bold">{merchant._count?.staff || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Services</p>
                  <p className="text-2xl font-bold">{merchant._count?.services || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{merchant._count?.customers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/merchants')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function EditMerchantPageWrapper() {
  return (
    <ProtectedRoute>
      <EditMerchantPage />
    </ProtectedRoute>
  );
}