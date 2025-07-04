"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Clock, CreditCard, Shield, Bell, Users, Database, Globe, Upload, Download, FileText, Check } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { TimezoneUtils } from "@heya-pos/utils";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import { ImportPreviewDialog } from "@/components/services/import-preview-dialog";
import { ColumnMappingDialog } from "@/components/services/column-mapping-dialog";
import { useAuth } from "@/lib/auth/auth-provider";

export default function SettingsPage() {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const queryClient = useQueryClient();
  const [bookingAdvanceHours, setBookingAdvanceHours] = useState("48");
  const [cancellationHours, setCancellationHours] = useState("24");
  const [requirePinForRefunds, setRequirePinForRefunds] = useState(true);
  const [requirePinForCancellations, setRequirePinForCancellations] = useState(true);
  const [requirePinForReports, setRequirePinForReports] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState("Australia/Sydney");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState("30");
  const [enableTips, setEnableTips] = useState(false);
  const [defaultTipPercentages, setDefaultTipPercentages] = useState<number[]>([10, 15, 20]);
  const [allowCustomTipAmount, setAllowCustomTipAmount] = useState(true);
  const [showUnassignedColumn, setShowUnassignedColumn] = useState(true);
  const [allowUnassignedBookings, setAllowUnassignedBookings] = useState(true);
  const [calendarStartHour, setCalendarStartHour] = useState(6);
  const [calendarEndHour, setCalendarEndHour] = useState(23);
  const [priceToDurationRatio, setPriceToDurationRatio] = useState("1.0");
  
  // Merchant profile state
  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAbn, setBusinessAbn] = useState("");
  
  // Business hours state
  const [businessHours, setBusinessHours] = useState<any>({
    monday: { open: "09:00", close: "17:00", isOpen: true },
    tuesday: { open: "09:00", close: "17:00", isOpen: true },
    wednesday: { open: "09:00", close: "17:00", isOpen: true },
    thursday: { open: "09:00", close: "17:00", isOpen: true },
    friday: { open: "09:00", close: "17:00", isOpen: true },
    saturday: { open: "09:00", close: "17:00", isOpen: true },
    sunday: { open: "09:00", close: "17:00", isOpen: false },
  });
  
  // Import states
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [serviceFile, setServiceFile] = useState<File | null>(null);
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [importingServices, setImportingServices] = useState(false);
  const [serviceImportPreview, setServiceImportPreview] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [lastImportResult, setLastImportResult] = useState<{ imported: number; updated: number; skipped: number } | null>(null);

  // Load location data on mount
  useEffect(() => {
    loadMerchantSettings();
    loadLocationData();
    loadMerchantProfile();
  }, []);

  const loadLocationData = async () => {
    try {
      const locations = await apiClient.getLocations();
      if (locations.length > 0) {
        const firstLocation = locations[0];
        setLocationId(firstLocation.id);
        // Location timezone will inherit from merchant if not set
        if (firstLocation.timezone) {
          setSelectedTimezone(firstLocation.timezone);
        }
        // Load business hours
        if (firstLocation.businessHours) {
          const formattedHours: any = {};
          Object.entries(firstLocation.businessHours).forEach(([day, hours]: [string, any]) => {
            if (hours) {
              formattedHours[day] = {
                open: hours.open || hours.openTime || "09:00",
                close: hours.close || hours.closeTime || "17:00",
                isOpen: hours.isOpen !== undefined ? hours.isOpen : true
              };
            } else {
              formattedHours[day] = { open: "09:00", close: "17:00", isOpen: false };
            }
          });
          setBusinessHours(formattedHours);
        }
      }
    } catch (error) {
      console.error("Failed to load location data:", error);
    }
  };

  const loadMerchantSettings = async () => {
    try {
      const response = await apiClient.get("/merchant/settings");
      if (response) {
        setBookingAdvanceHours(response.bookingAdvanceHours?.toString() || "48");
        setCancellationHours(response.cancellationHours?.toString() || "24");
        setRequirePinForRefunds(response.requirePinForRefunds ?? true);
        setRequirePinForCancellations(response.requirePinForCancellations ?? true);
        setRequirePinForReports(response.requirePinForReports ?? true);
        setRequireDeposit(response.requireDeposit ?? false);
        setDepositPercentage(response.depositPercentage?.toString() || "30");
        setEnableTips(response.enableTips ?? false);
        setDefaultTipPercentages(response.defaultTipPercentages || [10, 15, 20]);
        setAllowCustomTipAmount(response.allowCustomTipAmount ?? true);
        setShowUnassignedColumn(response.showUnassignedColumn ?? true);
        setAllowUnassignedBookings(response.allowUnassignedBookings ?? true);
        setCalendarStartHour(response.calendarStartHour ?? 6);
        setCalendarEndHour(response.calendarEndHour ?? 23);
        setPriceToDurationRatio(response.priceToDurationRatio?.toString() || "1.0");
        // Set timezone from merchant settings
        if (response.timezone) {
          setSelectedTimezone(response.timezone);
        }
      }
    } catch (error) {
      console.error("Failed to load merchant settings:", error);
    }
  };

  const loadMerchantProfile = async () => {
    try {
      const profile = await apiClient.getMerchantProfile();
      setMerchantProfile(profile);
      setBusinessName(profile.name || "");
      setBusinessEmail(profile.email || "");
      setBusinessPhone(profile.phone || "");
      setBusinessAbn(profile.abn || "");
    } catch (error) {
      console.error("Failed to load merchant profile:", error);
      // Fallback to auth context merchant data if available
      if (merchant) {
        setBusinessName(merchant.name || "");
        setBusinessEmail(merchant.email || "");
      }
    }
  };

  const handleSaveTimezone = async () => {
    setLoading(true);
    try {
      // Update merchant-level timezone
      await apiClient.put("/merchant/settings", {
        timezone: selectedTimezone,
      });

      // If we have a location, update it too
      if (locationId) {
        await apiClient.updateLocationTimezone(locationId, selectedTimezone);
      }

      toast({
        title: "Success",
        description: "Timezone updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update timezone",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBookingSettings = async () => {
    setLoading(true);
    try {
      await apiClient.put("/merchant/settings", {
        bookingAdvanceHours: parseInt(bookingAdvanceHours),
        cancellationHours: parseInt(cancellationHours),
        requirePinForRefunds,
        requirePinForCancellations,
        requireDeposit,
        depositPercentage: parseInt(depositPercentage),
        timezone: selectedTimezone,
        enableTips,
        defaultTipPercentages,
        allowCustomTipAmount,
        showUnassignedColumn,
        allowUnassignedBookings,
        calendarStartHour,
        calendarEndHour,
        priceToDurationRatio: parseFloat(priceToDurationRatio),
      });
      
      toast({
        title: "Success",
        description: "Booking settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update booking settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Removed BusinessTab component definition to prevent re-rendering issues


  // Removed SecurityTab component definition to prevent re-rendering issues

  // Removed LoyaltyTab component definition to prevent re-rendering issues

  // Removed NotificationsTab component definition to prevent re-rendering issues

  // Import functions
  const handleCustomerImport = async () => {
    if (!customerFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setImportingCustomers(true);
    const formData = new FormData();
    formData.append('file', customerFile);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/v1/customers/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Import successful",
          description: `Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}`,
        });
        setCustomerFile(null);
      } else {
        toast({
          title: "Import failed",
          description: result.message || "Please check your CSV format",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import error",
        description: "Failed to import customers",
        variant: "destructive",
      });
    } finally {
      setImportingCustomers(false);
    }
  };

  const downloadCustomerTemplate = () => {
    const csv = `name,email,mobile,phone,address,notes,tags,loyaltyPoints,vip
"John Smith","john@email.com","+61412345678","0298765432","123 Main St, Sydney","Regular customer","vip,loyal",100,true
"Jane Doe","jane@email.com","+61423456789",,"456 Queen St, Melbourne","New customer","",0,false`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadServiceTemplate = async () => {
    try {
      await apiClient.services.downloadServiceTemplate();
      toast({
        title: "Success",
        description: "Template downloaded successfully",
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleServiceImport = async () => {
    if (!serviceFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setImportingServices(true);
    try {
      // First, get the CSV headers and preview rows for column mapping
      const formData = new FormData();
      formData.append('file', serviceFile);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/v1/services/import/mapping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse CSV file');
      }

      const mappingData = await response.json();
      setCsvHeaders(mappingData.headers);
      setCsvPreviewRows(mappingData.rows);
      setShowMappingDialog(true);
    } catch (error) {
      toast({
        title: "Import error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setImportingServices(false);
    }
  };

  const handleColumnMappingConfirm = async (mappings: Record<string, string>) => {
    setColumnMappings(mappings);
    setShowMappingDialog(false);
    setImportingServices(true);

    try {
      const preview = await apiClient.services.previewServiceImport(serviceFile!, {
        duplicateAction: 'skip',
        createCategories: true,
        skipInvalidRows: false,
      }, mappings);
      
      setServiceImportPreview(preview);
      setShowPreviewDialog(true);
    } catch (error) {
      toast({
        title: "Import error",
        description: error instanceof Error ? error.message : "Failed to preview import",
        variant: "destructive",
      });
    } finally {
      setImportingServices(false);
    }
  };

  const executeServiceImport = async () => {
    if (!serviceImportPreview) return;

    setImportingServices(true);
    try {
      const result = await apiClient.services.executeServiceImport(
        serviceImportPreview.rows,
        {
          duplicateAction: 'skip',
          createCategories: true,
          skipInvalidRows: false,
        }
      );

      toast({
        title: "✅ Import successful!",
        description: `Successfully imported ${result.imported} services${result.updated > 0 ? `, updated ${result.updated}` : ''}${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`,
        duration: 5000, // Show for 5 seconds
      });

      // Invalidate services cache so the Services page shows the new data
      queryClient.invalidateQueries({ queryKey: ['services'] });

      // Reset state
      setServiceFile(null);
      setServiceImportPreview(null);
      setShowPreviewDialog(false);
      
      // Store the result for display
      setLastImportResult(result);
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import services",
        variant: "destructive",
      });
    } finally {
      setImportingServices(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business preferences and configuration</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Manage your business details and location settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input 
                    id="business-name" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN</Label>
                  <Input 
                    id="abn" 
                    value={businessAbn} 
                    onChange={(e) => setBusinessAbn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Business Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={businessEmail} 
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Business Phone</Label>
                  <Input 
                    id="phone" 
                    value={businessPhone} 
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Location Settings
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TimezoneUtils.getAustralianTimezones().map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      All bookings and appointments will be displayed in this timezone
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select defaultValue="AUD">
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                        <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Hours</h3>
                <div className="grid gap-3">
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                    <div key={day} className="flex items-center justify-between">
                      <Label className="w-24 capitalize">{day}</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="time" 
                          value={businessHours[day]?.open || "09:00"} 
                          onChange={(e) => setBusinessHours({
                            ...businessHours,
                            [day]: { ...businessHours[day], open: e.target.value }
                          })}
                          className="w-32" 
                          disabled={!businessHours[day]?.isOpen}
                        />
                        <span>to</span>
                        <Input 
                          type="time" 
                          value={businessHours[day]?.close || "17:00"}
                          onChange={(e) => setBusinessHours({
                            ...businessHours,
                            [day]: { ...businessHours[day], close: e.target.value }
                          })}
                          className="w-32" 
                          disabled={!businessHours[day]?.isOpen}
                        />
                        <Switch 
                          checked={businessHours[day]?.isOpen || false}
                          onCheckedChange={(checked) => setBusinessHours({
                            ...businessHours,
                            [day]: { ...businessHours[day], isOpen: checked }
                          })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={async () => {
                  setLoading(true);
                  try {
                    // Update merchant profile
                    await apiClient.put("/merchant/profile", {
                      name: businessName,
                      email: businessEmail,
                      phone: businessPhone,
                      abn: businessAbn,
                    });
                    
                    // Update timezone
                    await handleSaveTimezone();
                    
                    // Update business hours if we have a location
                    if (locationId) {
                      await apiClient.updateLocation(locationId, {
                        businessHours: businessHours
                      });
                    }
                    
                    toast({
                      title: "Success",
                      description: "Business information updated successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update business information",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Booking Settings
              </CardTitle>
              <CardDescription>Configure booking rules and policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="advance-booking">Advance Booking (Hours)</Label>
                  <Select value={bookingAdvanceHours} onValueChange={setBookingAdvanceHours}>
                    <SelectTrigger id="advance-booking">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How far in advance customers can book
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation">Cancellation Notice (Hours)</Label>
                  <Select value={cancellationHours} onValueChange={setCancellationHours}>
                    <SelectTrigger id="cancellation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Minimum notice required for cancellations
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Online Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      Customers can book appointments through your website
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-confirm Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically confirm new bookings without manual approval
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Buffer Time Between Appointments</Label>
                    <p className="text-sm text-muted-foreground">
                      Add automatic buffer time between bookings
                    </p>
                  </div>
                  <Select defaultValue="15">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Unassigned Column</Label>
                    <p className="text-sm text-muted-foreground">
                      Display an "Unassigned" column in the calendar for bookings without a specific staff member
                    </p>
                  </div>
                  <Switch 
                    checked={showUnassignedColumn} 
                    onCheckedChange={setShowUnassignedColumn}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Unassigned Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      When customers choose "Any Available" staff: ON = Creates unassigned bookings for manual assignment later, OFF = Automatically assigns the next available staff member
                    </p>
                  </div>
                  <Switch 
                    checked={allowUnassignedBookings} 
                    onCheckedChange={setAllowUnassignedBookings}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-base font-medium">Calendar Display Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the hours displayed on your calendar view (default: 6 AM - 11 PM)
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm">
                    <div className="space-y-2">
                      <Label htmlFor="calendar-start">Start Hour</Label>
                      <Select value={calendarStartHour.toString()} onValueChange={(value) => setCalendarStartHour(parseInt(value))}>
                        <SelectTrigger id="calendar-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calendar-end">End Hour</Label>
                      <Select value={calendarEndHour.toString()} onValueChange={(value) => setCalendarEndHour(parseInt(value))}>
                        <SelectTrigger id="calendar-end">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()} disabled={i <= calendarStartHour}>
                              {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Deposit</Label>
                      <p className="text-sm text-muted-foreground">
                        Require customers to pay a deposit when booking
                      </p>
                    </div>
                    <Switch 
                      checked={requireDeposit} 
                      onCheckedChange={setRequireDeposit}
                    />
                  </div>

                  {requireDeposit && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="deposit-percentage">Deposit Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="deposit-percentage"
                          type="number"
                          min="1"
                          max="100"
                          value={depositPercentage}
                          onChange={(e) => setDepositPercentage(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Percentage of total booking amount required as deposit
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Tips</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to add tips during payment (disabled by default in Australia)
                      </p>
                    </div>
                    <Switch 
                      checked={enableTips} 
                      onCheckedChange={setEnableTips}
                    />
                  </div>

                  {enableTips && (
                    <div className="space-y-4 ml-6">
                      <div className="space-y-2">
                        <Label>Default Tip Percentages</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={defaultTipPercentages.join(', ')}
                            onChange={(e) => {
                              const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                              setDefaultTipPercentages(values);
                            }}
                            placeholder="10, 15, 20"
                            className="w-48"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Comma-separated tip percentage options
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow Custom Tip Amount</Label>
                          <p className="text-sm text-muted-foreground">
                            Let customers enter a custom tip amount
                          </p>
                        </div>
                        <Switch 
                          checked={allowCustomTipAmount} 
                          onCheckedChange={setAllowCustomTipAmount}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBookingSettings} disabled={loading}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  PIN Security
                </CardTitle>
                <CardDescription>Configure PIN requirements for sensitive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Refunds</Label>
                    <p className="text-sm text-muted-foreground">
                      Manager PIN required to process refunds
                    </p>
                  </div>
                  <Switch checked={requirePinForRefunds} onCheckedChange={setRequirePinForRefunds} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Cancellations</Label>
                    <p className="text-sm text-muted-foreground">
                      Staff PIN required to cancel bookings
                    </p>
                  </div>
                  <Switch checked={requirePinForCancellations} onCheckedChange={setRequirePinForCancellations} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Manager PIN required to access reports
                    </p>
                  </div>
                  <Switch 
                    checked={requirePinForReports} 
                    onCheckedChange={(checked) => {
                      setRequirePinForReports(checked);
                      // Note: This is now enforced! The Reports page will require PIN when enabled
                      apiClient.put("/merchant/settings", { requirePinForReports: checked })
                        .then(() => {
                          toast({
                            title: "Success",
                            description: checked ? "PIN required for reports" : "PIN disabled for reports",
                          });
                        })
                        .catch(err => {
                          console.error("Failed to update PIN setting:", err);
                          toast({
                            title: "Error",
                            description: "Failed to update PIN setting",
                            variant: "destructive",
                          });
                        });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Levels</CardTitle>
                <CardDescription>Define permissions for different staff roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Employee</h4>
                      <Badge variant="secondary">Level 1</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Can view their own bookings, process payments, manage customers
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Manager</h4>
                      <Badge variant="secondary">Level 2</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All employee permissions plus: view reports, manage staff schedules, process refunds
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Owner</h4>
                      <Badge variant="secondary">Level 3</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Full access to all features including settings, staff management, and financial data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure how you and your customers receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Booking Confirmations</Label>
                      <p className="text-sm text-muted-foreground">
                        Send confirmation when booking is created
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send reminder 24 hours before appointment
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Loyalty Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify about points earned and rewards
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Staff Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Bookings</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when new booking is made
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cancellations</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when booking is cancelled
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Summary</Label>
                      <p className="text-sm text-muted-foreground">
                        Send daily booking summary email
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={async () => {
                  setLoading(true);
                  try {
                    await apiClient.put("/merchant/settings", {
                      emailNotifications,
                      smsNotifications,
                    });
                    toast({
                      title: "Success",
                      description: "Notification settings updated successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update notification settings",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <div className="space-y-6">
            {/* Customer Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Import Customers
                </CardTitle>
                <CardDescription>
                  Bulk import customers from a CSV file. Download the template to see the required format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <Label htmlFor="customer-file" className="cursor-pointer text-primary hover:underline">
                        Choose CSV file
                      </Label>
                      <Input
                        id="customer-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setCustomerFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    {customerFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {customerFile.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={downloadCustomerTemplate}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                    <Button
                      onClick={handleCustomerImport}
                      disabled={!customerFile || importingCustomers}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {importingCustomers ? "Importing..." : "Import Customers"}
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV Format Instructions
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Required fields: name</li>
                    <li>• Optional fields: email, mobile, phone, address, notes, tags, loyaltyPoints, vip</li>
                    <li>• Use comma-separated values for tags (e.g., "vip,loyal")</li>
                    <li>• Set vip to "true" or "false"</li>
                    <li>• Duplicate customers (same email/mobile) will be updated</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Service Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Import Services
                </CardTitle>
                <CardDescription>
                  Bulk import services from a CSV file. Download the template to see the required format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lastImportResult && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Last import completed successfully!
                      </p>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Imported {lastImportResult.imported} new services
                      {lastImportResult.updated > 0 && `, updated ${lastImportResult.updated}`}
                      {lastImportResult.skipped > 0 && `, skipped ${lastImportResult.skipped}`}
                    </p>
                  </div>
                )}
                <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <Label htmlFor="service-file" className="cursor-pointer text-primary hover:underline">
                        Choose CSV file
                      </Label>
                      <Input
                        id="service-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    {serviceFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {serviceFile.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={downloadServiceTemplate}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                    <Button
                      onClick={handleServiceImport}
                      disabled={!serviceFile || importingServices}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {importingServices ? "Processing..." : "Import Services"}
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV Format Instructions
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Required fields: Service Name, Price</li>
                    <li>• Optional fields: Category, Description, Duration, Active Status</li>
                    <li>• Duration can be left empty if price-to-duration ratio is set</li>
                    <li>• Duration formats: 60, 90, 1h, 1.5h, 1h30m, "90 min"</li>
                    <li>• Categories will be created automatically if they don't exist</li>
                    <li>• Set active to "true" or "false" (default: true)</li>
                    <li>• Duplicate services will be skipped by default</li>
                    <li>• Tax, deposit, and booking rules use your merchant settings</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: After upload, you'll map your CSV columns to the correct fields
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Auto Duration Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Auto Duration Settings
                </CardTitle>
                <CardDescription>
                  Configure automatic duration calculation for services when importing without duration values
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price-duration-ratio">Price to Duration Ratio</Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-sm text-muted-foreground">$1 =</span>
                      <Input
                        id="price-duration-ratio"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={priceToDurationRatio}
                        onChange={(e) => setPriceToDurationRatio(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When importing services without duration, the system will automatically calculate duration based on price. 
                      For example, with a ratio of 1.0, a $60 service will be set to 60 minutes.
                    </p>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <h4 className="font-medium">Examples with current ratio ({priceToDurationRatio}):</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• $30 service → {Math.round(30 * parseFloat(priceToDurationRatio))} minutes</li>
                      <li>• $60 service → {Math.round(60 * parseFloat(priceToDurationRatio))} minutes</li>
                      <li>• $90 service → {Math.round(90 * parseFloat(priceToDurationRatio))} minutes</li>
                      <li>• $120 service → {Math.round(120 * parseFloat(priceToDurationRatio))} minutes</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={async () => {
                    setLoading(true);
                    try {
                      await apiClient.put("/merchant/settings", {
                        priceToDurationRatio: parseFloat(priceToDurationRatio),
                      });
                      toast({
                        title: "Success",
                        description: "Auto duration settings updated successfully",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to update settings",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Import Preview Dialog */}
      <ImportPreviewDialog
        open={showPreviewDialog}
        onClose={() => {
          setShowPreviewDialog(false);
          setServiceImportPreview(null);
        }}
        preview={serviceImportPreview}
        onConfirm={executeServiceImport}
        importing={importingServices}
      />

      {/* Column Mapping Dialog */}
      <ColumnMappingDialog
        open={showMappingDialog}
        onClose={() => {
          setShowMappingDialog(false);
          setServiceFile(null);
        }}
        csvHeaders={csvHeaders}
        csvPreviewRows={csvPreviewRows}
        onConfirm={handleColumnMappingConfirm}
      />
    </div>
  );
}