"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Edit, Trash2, AlertCircle, Building2, Users, Calendar, DollarSign, MapPin, Globe } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { adminApi, type Merchant } from "@/lib/admin-api";
import { ProtectedRoute } from "@/components/protected-route";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@heya-pos/ui";

function MerchantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const merchantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMerchant();
  }, [merchantId]);

  const loadMerchant = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getMerchant(merchantId);
      setMerchant(data);
    } catch (error) {
      console.error('Failed to load merchant:', error);
      toast({
        title: "Error",
        description: "Failed to load merchant details",
        variant: "destructive",
      });
      router.push('/merchants');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await adminApi.deleteMerchant(merchantId);
      toast({
        title: "Success",
        description: "Merchant deleted successfully",
      });
      router.push('/merchants');
    } catch (error: any) {
      console.error('Failed to delete merchant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete merchant",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/merchants/${merchantId}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {merchant.name}
          </h1>
          <p className="text-muted-foreground mt-1">{merchant.email}</p>
        </div>
        <Badge variant={merchant.isActive ? "default" : "secondary"} className="text-sm">
          {merchant.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchant._count?.staff || 0}</div>
            <p className="text-xs text-muted-foreground">Active staff accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchant._count?.bookings || 0}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchant._count?.services || 0}</div>
            <p className="text-xs text-muted-foreground">Available services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchant._count?.customers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Basic information about the merchant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                  <p className="text-lg">{merchant.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg">{merchant.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-lg">{merchant.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ABN</p>
                  <p className="text-lg">{merchant.abn || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subdomain</p>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <code className="text-lg">{merchant.subdomain}.heya-pos.com</code>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-lg">{new Date(merchant.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking URLs</CardTitle>
              <CardDescription>Customer-facing booking links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Production URL</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  https://bookings.heya-pos.com/{merchant.subdomain}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Development URL</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  http://localhost:3001/{merchant.subdomain}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Current package and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {merchant.subscription ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Package</p>
                      <p className="text-lg font-semibold">{merchant.subscription.package.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="default">{merchant.subscription.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Monthly Price</p>
                      <p className="text-lg">${merchant.subscription.package.monthlyPrice}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expires</p>
                      <p className="text-lg">
                        {merchant.subscription.endDate 
                          ? new Date(merchant.subscription.endDate).toLocaleDateString()
                          : 'No expiry'}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Package Limits</p>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Staff</span>
                        <span>{merchant.subscription.package.maxStaff}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Services</span>
                        <span>{merchant.subscription.package.maxServices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Bookings/Month</span>
                        <span>{merchant.subscription.package.maxBookingsPerMonth}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active subscription</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
              <CardDescription>Business locations for this merchant</CardDescription>
            </CardHeader>
            <CardContent>
              {merchant.locations && merchant.locations.length > 0 ? (
                <div className="space-y-4">
                  {merchant.locations.map((location) => (
                    <div key={location.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-muted-foreground">{location.address}</p>
                      </div>
                      <Badge variant={location.isActive ? "default" : "secondary"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No locations configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the merchant "{merchant.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MerchantDetailPageWrapper() {
  return (
    <ProtectedRoute>
      <MerchantDetailPage />
    </ProtectedRoute>
  );
}