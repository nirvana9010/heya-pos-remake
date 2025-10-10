"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Clock, CreditCard, Shield, Bell, Users, Database, Globe, Upload, Download, FileText, Check, Copy, ExternalLink } from "lucide-react";
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
import { resolveApiBaseUrl } from "@/lib/clients/base-client";
import { ImportPreviewDialog } from "@/components/services/import-preview-dialog";
import { ColumnMappingDialog } from "@/components/services/column-mapping-dialog";
import { CustomerColumnMappingDialog } from "@/components/customers/customer-column-mapping-dialog";
import { CustomerImportPreviewDialog } from "@/components/customers/customer-import-preview-dialog";
import { useAuth } from "@/lib/auth/auth-provider";
import { TyroPairingDialog } from "@/components/tyro/TyroPairingDialog";
import { TyroStatusIndicator } from "@/components/tyro/TyroStatusIndicator";
import { useTyro } from "@/hooks/useTyro";
import type { CustomerImportPreview } from "@/lib/clients/customers-client";
import { customerKeys } from "@/lib/query/hooks/use-customers";

export default function SettingsPage() {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { clearPairing, isPaired } = useTyro();
  const queryClient = useQueryClient();
  // Initialize with merchant settings if available to prevent flicker
  const merchantSettings = merchant?.settings || {};
  
  const [bookingAdvanceHours, setBookingAdvanceHours] = useState(merchantSettings.bookingAdvanceHours?.toString() || "48");
  const [cancellationHours, setCancellationHours] = useState(merchantSettings.cancellationHours?.toString() || "24");
  const [minimumBookingNotice, setMinimumBookingNotice] = useState(merchantSettings.minimumBookingNotice?.toString() || "0");
  const [requirePinForRefunds, setRequirePinForRefunds] = useState(merchantSettings.requirePinForRefunds ?? true);
  const [requirePinForCancellations, setRequirePinForCancellations] = useState(merchantSettings.requirePinForCancellations ?? true);
  const [requirePinForReports, setRequirePinForReports] = useState(merchantSettings.requirePinForReports ?? true);
  const [requirePinForStaff, setRequirePinForStaff] = useState(merchantSettings.requirePinForStaff ?? true);
  const [selectedTimezone, setSelectedTimezone] = useState(merchantSettings.timezone || "Australia/Sydney");
  // Notification settings - initialize from merchant settings to prevent flicker
  const [bookingConfirmationEmail, setBookingConfirmationEmail] = useState(merchantSettings.bookingConfirmationEmail !== false);
  const [bookingConfirmationSms, setBookingConfirmationSms] = useState(merchantSettings.bookingConfirmationSms !== false);
  const [appointmentReminder24hEmail, setAppointmentReminder24hEmail] = useState(merchantSettings.appointmentReminder24hEmail !== false);
  const [appointmentReminder24hSms, setAppointmentReminder24hSms] = useState(merchantSettings.appointmentReminder24hSms !== false);
  const [appointmentReminder2hEmail, setAppointmentReminder2hEmail] = useState(merchantSettings.appointmentReminder2hEmail !== false);
  const [appointmentReminder2hSms, setAppointmentReminder2hSms] = useState(merchantSettings.appointmentReminder2hSms !== false);
  const [newBookingNotification, setNewBookingNotification] = useState(merchantSettings.newBookingNotification !== false);
  const [newBookingNotificationEmail, setNewBookingNotificationEmail] = useState(merchantSettings.newBookingNotificationEmail !== false);
  const [newBookingNotificationSms, setNewBookingNotificationSms] = useState(merchantSettings.newBookingNotificationSms !== false);
  const [cancellationNotification, setCancellationNotification] = useState(merchantSettings.cancellationNotification !== false);
  const [cancellationNotificationEmail, setCancellationNotificationEmail] = useState(merchantSettings.cancellationNotificationEmail !== false);
  const [cancellationNotificationSms, setCancellationNotificationSms] = useState(merchantSettings.cancellationNotificationSms !== false);
  const [loading, setLoading] = useState(false);
  const [requireDeposit, setRequireDeposit] = useState(merchantSettings.requireDeposit ?? false);
  const [depositPercentage, setDepositPercentage] = useState(merchantSettings.depositPercentage?.toString() || "30");
  const [enableTips, setEnableTips] = useState(merchantSettings.enableTips ?? false);
  const [defaultTipPercentages, setDefaultTipPercentages] = useState<number[]>(merchantSettings.defaultTipPercentages || [10, 15, 20]);
  const [allowCustomTipAmount, setAllowCustomTipAmount] = useState(merchantSettings.allowCustomTipAmount ?? true);
  const [showUnassignedColumn, setShowUnassignedColumn] = useState(merchantSettings.showUnassignedColumn ?? true);
  const [allowUnassignedBookings, setAllowUnassignedBookings] = useState(merchantSettings.allowUnassignedBookings ?? true);
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(merchantSettings.autoConfirmBookings ?? true);
  const [calendarStartHour, setCalendarStartHour] = useState(merchantSettings.calendarStartHour ?? 6);
  const [calendarEndHour, setCalendarEndHour] = useState(merchantSettings.calendarEndHour ?? 23);
  const [showOnlyRosteredStaffDefault, setShowOnlyRosteredStaffDefault] = useState(merchantSettings.showOnlyRosteredStaffDefault ?? true);
  const [includeUnscheduledStaff, setIncludeUnscheduledStaff] = useState(merchantSettings.includeUnscheduledStaff ?? false);
  const [priceToDurationRatio, setPriceToDurationRatio] = useState(merchantSettings.priceToDurationRatio?.toString() || "1.0");
  const [tyroEnabled, setTyroEnabled] = useState(merchantSettings.tyroEnabled ?? false);
  const [tyroTerminalId, setTyroTerminalId] = useState(merchantSettings.tyroTerminalId ?? '');
  const [tyroMerchantId, setTyroMerchantId] = useState((merchantSettings.tyroMerchantId ?? process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID) || '');
  const [showTyroPairingDialog, setShowTyroPairingDialog] = useState(false);
  
  // Merchant profile state
  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAbn, setBusinessAbn] = useState("");
  const [merchantSubdomain, setMerchantSubdomain] = useState("");
  
  // Business hours state - initialize from merchant settings if available
  const defaultHours = {
    monday: { open: "09:00", close: "17:00", isOpen: true },
    tuesday: { open: "09:00", close: "17:00", isOpen: true },
    wednesday: { open: "09:00", close: "17:00", isOpen: true },
    thursday: { open: "09:00", close: "17:00", isOpen: true },
    friday: { open: "09:00", close: "17:00", isOpen: true },
    saturday: { open: "09:00", close: "17:00", isOpen: true },
    sunday: { open: "09:00", close: "17:00", isOpen: false },
  };
  
  const [businessHours, setBusinessHours] = useState<any>(() => {
    if (merchantSettings.businessHours) {
      const formattedHours: any = {};
      Object.entries(merchantSettings.businessHours).forEach(([day, hours]: [string, any]) => {
        if (hours) {
          formattedHours[day] = {
            open: hours.open || "09:00",
            close: hours.close || "17:00",
            isOpen: hours.isOpen !== undefined ? hours.isOpen : true
          };
        } else {
          formattedHours[day] = defaultHours[day as keyof typeof defaultHours] || { open: "09:00", close: "17:00", isOpen: false };
        }
      });
      return { ...defaultHours, ...formattedHours };
    }
    return defaultHours;
  });
  
  // Import states
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [customerDuplicateAction, setCustomerDuplicateAction] = useState<'skip' | 'update'>('update');
  const [customerSkipInvalidRows, setCustomerSkipInvalidRows] = useState(true);
  const [customerCsvHeaders, setCustomerCsvHeaders] = useState<string[]>([]);
  const [customerCsvPreviewRows, setCustomerCsvPreviewRows] = useState<string[][]>([]);
  const [customerColumnMappings, setCustomerColumnMappings] = useState<Record<string, string> | null>(null);
  const [showCustomerMappingDialog, setShowCustomerMappingDialog] = useState(false);
  const [customerImportPreview, setCustomerImportPreview] = useState<CustomerImportPreview | null>(null);
  const [showCustomerPreviewDialog, setShowCustomerPreviewDialog] = useState(false);
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

  // Load data on mount
  useEffect(() => {
    loadMerchantSettings();
    loadMerchantProfile();
  }, []);


  const loadMerchantSettings = async () => {
    try {
      const response = await apiClient.get("/merchant/settings");
      if (response) {
        setBookingAdvanceHours(response.bookingAdvanceHours?.toString() || "48");
        setCancellationHours(response.cancellationHours?.toString() || "24");
        setMinimumBookingNotice(response.minimumBookingNotice?.toString() || "0");
        setRequirePinForRefunds(response.requirePinForRefunds ?? true);
        setRequirePinForCancellations(response.requirePinForCancellations ?? true);
        setRequirePinForReports(response.requirePinForReports ?? true);
        setRequirePinForStaff(response.requirePinForStaff ?? true);
        setRequireDeposit(response.requireDeposit ?? false);
        setDepositPercentage(response.depositPercentage?.toString() || "30");
        setEnableTips(response.enableTips ?? false);
        setDefaultTipPercentages(response.defaultTipPercentages || [10, 15, 20]);
        setAllowCustomTipAmount(response.allowCustomTipAmount ?? true);
        setShowUnassignedColumn(response.showUnassignedColumn ?? true);
        setAllowUnassignedBookings(response.allowUnassignedBookings ?? true);
        setAutoConfirmBookings(response.autoConfirmBookings ?? true);
        setCalendarStartHour(response.calendarStartHour ?? 6);
        setCalendarEndHour(response.calendarEndHour ?? 23);
        setShowOnlyRosteredStaffDefault(response.showOnlyRosteredStaffDefault ?? true);
        setIncludeUnscheduledStaff(response.includeUnscheduledStaff ?? false);
        setPriceToDurationRatio(response.priceToDurationRatio?.toString() || "1.0");
        setTyroEnabled(response.tyroEnabled ?? false);
        // Set timezone from merchant settings
        if (response.timezone) {
          setSelectedTimezone(response.timezone);
        }
        // Load notification settings
        setBookingConfirmationEmail(response.bookingConfirmationEmail !== false);
        setBookingConfirmationSms(response.bookingConfirmationSms !== false);
        setAppointmentReminder24hEmail(response.appointmentReminder24hEmail !== false);
        setAppointmentReminder24hSms(response.appointmentReminder24hSms !== false);
        setAppointmentReminder2hEmail(response.appointmentReminder2hEmail !== false);
        setAppointmentReminder2hSms(response.appointmentReminder2hSms !== false);
        setNewBookingNotification(response.newBookingNotification !== false);
        setNewBookingNotificationEmail(response.newBookingNotificationEmail !== false);
        setNewBookingNotificationSms(response.newBookingNotificationSms !== false);
        setCancellationNotification(response.cancellationNotification !== false);
        setCancellationNotificationEmail(response.cancellationNotificationEmail !== false);
        setCancellationNotificationSms(response.cancellationNotificationSms !== false);
        // Load business hours from merchant settings
        if (response.businessHours) {
          const formattedHours: any = {};
          Object.entries(response.businessHours).forEach(([day, hours]: [string, any]) => {
            if (hours) {
              formattedHours[day] = {
                open: hours.open || "09:00",
                close: hours.close || "17:00",
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
      setMerchantSubdomain(profile.subdomain || "");
    } catch (error) {
      console.error("Failed to load merchant profile:", error);
      // Fallback to auth context merchant data if available
      if (merchant) {
        setBusinessName(merchant.name || "");
        setBusinessEmail(merchant.email || "");
        setMerchantSubdomain(merchant.subdomain || "");
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
      const updatedSettings = {
        bookingAdvanceHours: parseInt(bookingAdvanceHours),
        cancellationHours: parseInt(cancellationHours),
        minimumBookingNotice: parseInt(minimumBookingNotice),
        requirePinForRefunds,
        requirePinForCancellations,
        requirePinForReports,
        requirePinForStaff,
        // requireDeposit, // Hidden - not functional
        // depositPercentage: parseInt(depositPercentage), // Hidden - not functional
        timezone: selectedTimezone,
        // enableTips, // Hidden - not functional
        // defaultTipPercentages, // Hidden - not functional
        // allowCustomTipAmount, // Hidden - not functional
        showUnassignedColumn,
        allowUnassignedBookings,
        autoConfirmBookings,
        calendarStartHour,
        calendarEndHour,
        showOnlyRosteredStaffDefault,
        includeUnscheduledStaff,
        priceToDurationRatio: parseFloat(priceToDurationRatio),
        tyroEnabled,
        tyroTerminalId,
        tyroMerchantId,
      };
      
      await apiClient.put("/merchant/settings", updatedSettings);
      
      // Update merchant data in localStorage to reflect the changes immediately
      const storedMerchant = localStorage.getItem('merchant');
      if (storedMerchant) {
        try {
          const merchantData = JSON.parse(storedMerchant);
          merchantData.settings = {
            ...merchantData.settings,
            ...updatedSettings
          };
          localStorage.setItem('merchant', JSON.stringify(merchantData));
          
          // Dispatch a custom event for same-tab updates
          window.dispatchEvent(new CustomEvent('merchantSettingsUpdated', { 
            detail: { settings: merchantData.settings } 
          }));
          
          // Also update the auth context if it has a refresh function
          if (merchant && typeof window !== 'undefined') {
            // Trigger a re-render by updating query cache
            queryClient.invalidateQueries({ queryKey: ['merchant'] });
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
          }
        } catch (e) {
          console.error('Failed to update local merchant data:', e);
        }
      }
      
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

  const handleSaveSecuritySettings = async () => {
    setLoading(true);
    try {
      await apiClient.put("/merchant/settings", {
        requirePinForRefunds,
        requirePinForCancellations,
        requirePinForReports,
        requirePinForStaff,
      });

      toast({
        title: "Success",
        description: "Security settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update security settings",
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
    setCustomerImportPreview(null);
    setCustomerColumnMappings(null);
    setShowCustomerPreviewDialog(false);

    try {
      const formData = new FormData();
      formData.append('file', customerFile);

      const API_BASE_URL = resolveApiBaseUrl();
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/v1/customers/import/mapping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to parse CSV file');
      }

      const mappingData = await response.json();
      setCustomerCsvHeaders(mappingData.headers || []);
      setCustomerCsvPreviewRows(mappingData.rows || []);
      setShowCustomerMappingDialog(true);
    } catch (error) {
      toast({
        title: "Import error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setImportingCustomers(false);
    }
  };

  const previewCustomerImport = async (mappings: Record<string, string>) => {
    if (!customerFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file before previewing",
        variant: "destructive",
      });
      return;
    }

    setImportingCustomers(true);
    try {
      const preview = await apiClient.customers.previewCustomerImport(
        customerFile,
        {
          duplicateAction: customerDuplicateAction,
          skipInvalidRows: customerSkipInvalidRows,
        },
        mappings,
      );

      setCustomerImportPreview(preview);
      setShowCustomerPreviewDialog(true);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unable to preview customer import",
        variant: "destructive",
      });
      if (!customerImportPreview) {
        setShowCustomerMappingDialog(true);
      }
    } finally {
      setImportingCustomers(false);
    }
  };

  const handleCustomerMappingConfirm = async (mappings: Record<string, string>) => {
    if (!customerFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setCustomerColumnMappings(mappings);
    setShowCustomerMappingDialog(false);
    await previewCustomerImport(mappings);
  };

  const refreshCustomerPreview = async () => {
    if (!customerColumnMappings) {
      toast({
        title: "Mapping required",
        description: "Map your CSV columns before refreshing the preview",
        variant: "destructive",
      });
      return;
    }

    await previewCustomerImport(customerColumnMappings);
  };

  const executeCustomerImport = async () => {
    if (!customerImportPreview) {
      toast({
        title: "No preview available",
        description: "Preview the CSV file before importing",
        variant: "destructive",
      });
      return;
    }

    setImportingCustomers(true);

    try {
      const result = await apiClient.customers.executeCustomerImport(
        customerImportPreview.rows,
        {
          duplicateAction: customerDuplicateAction,
          skipInvalidRows: customerSkipInvalidRows,
        },
      );

      toast({
        title: "Import complete",
        description: `Imported ${result.imported}, Updated ${result.updated}, Skipped ${result.skipped}.`,
      });

      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });

      setCustomerFile(null);
      setCustomerImportPreview(null);
      setShowCustomerPreviewDialog(false);
      setCustomerCsvHeaders([]);
      setCustomerCsvPreviewRows([]);
      setCustomerColumnMappings(null);
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unable to import customers",
        variant: "destructive",
      });
    } finally {
      setImportingCustomers(false);
    }
  };

  const downloadCustomerTemplate = () => {
    const csv = `First Name,Last Name,Full Name,Email,Mobile Number,Phone,Accepts Marketing,Accepts SMS Marketing,Date of Birth,Referral Source,Note
"Anna","Smith",,"anna@example.com","+61 412 345 678",,"Yes","Yes","1992-05-10","Website","Prefers morning appointments"
"Ben","Brown",,,"0412 000 000","02 9123 4567","No","No",,"Walk-In",""`;
    
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

      const API_BASE_URL = resolveApiBaseUrl();
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
          duplicateAction: 'create_new',
          createCategories: true,
          skipInvalidRows: false,
        }
      );

      toast({
        title: "✅ Import successful!",
        description: `Successfully imported ${result.imported} services${result.updated > 0 ? `, updated ${result.updated}` : ''}${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`,
        duration: 5000, // Show for 5 seconds
      });

      // Invalidate services and categories cache so the Services page shows the new data
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services', 'categories'] });

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
              <CardDescription>View your business details and manage location settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Booking App - Main URL - MOVED TO TOP */}
              <div className="space-y-2 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Label className="text-base font-semibold">🌟 Customer Booking App</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={(() => {
                      const isLocal = window.location.hostname === 'localhost';
                      const baseUrl = isLocal ? 'http://localhost:3001' : 'https://visit.heyapos.com';
                      return merchantSubdomain ? 
                        `${baseUrl}/${merchantSubdomain}/booking` :
                        `${baseUrl}/booking`;
                    })()} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const isLocal = window.location.hostname === 'localhost';
                      const baseUrl = isLocal ? 'http://localhost:3001' : 'https://visit.heyapos.com';
                      const url = merchantSubdomain ? 
                        `${baseUrl}/${merchantSubdomain}/booking` :
                        `${baseUrl}/booking`;
                      navigator.clipboard.writeText(url);
                      toast({
                        title: "Copied!",
                        description: "Booking app URL copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const isLocal = window.location.hostname === 'localhost';
                      const baseUrl = isLocal ? 'http://localhost:3001' : 'https://visit.heyapos.com';
                      const url = merchantSubdomain ? 
                        `${baseUrl}/${merchantSubdomain}/booking` :
                        `${baseUrl}/booking`;
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm font-medium text-primary">
                  Share this link with customers to allow them to book appointments online 24/7
                </p>
              </div>

              <Separator />

              {/* Business Info - Read-only with link to Profile */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Basic Information</h3>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs"
                    asChild
                  >
                    <Link href="/profile">Edit in Profile →</Link>
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Business Name</Label>
                    <p className="text-sm font-medium">{businessName || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ABN</Label>
                    <p className="text-sm font-medium">{businessAbn || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Business Email</Label>
                    <p className="text-sm font-medium">{businessEmail || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Business Phone</Label>
                    <p className="text-sm font-medium">{businessPhone || 'Not set'}</p>
                  </div>
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
                  {/* Currency setting hidden - not currently functional
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
                  */}
                </div>
                
                {/* Customer Check-in URL */}
                <div className="space-y-2 mt-4">
                  <Label>Customer Check-in URL</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={(() => {
                        const isLocal = window.location.hostname === 'localhost';
                        const baseUrl = isLocal ? 'http://localhost:3001' : 'https://visit.heyapos.com';
                        return merchantSubdomain ? 
                          `${baseUrl}/${merchantSubdomain}/checkin` :
                          `${baseUrl}/checkin`;
                      })()} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const isLocal = window.location.hostname === 'localhost';
                        const baseUrl = isLocal ? 'http://localhost:3001' : 'https://visit.heyapos.com';
                        const url = merchantSubdomain ? 
                          `${baseUrl}/${merchantSubdomain}/checkin` :
                          `${baseUrl}/checkin`;
                        navigator.clipboard.writeText(url);
                        toast({
                          title: "Copied!",
                          description: "Check-in URL copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const isLocal = window.location.hostname === 'localhost';
                        const baseUrl = isLocal ? 'http://localhost:3001' : 'https://visit.heyapos.com';
                        const url = merchantSubdomain ? 
                          `${baseUrl}/${merchantSubdomain}/checkin` :
                          `${baseUrl}/checkin`;
                        window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Display this URL on tablets for customer self check-in at your location
                  </p>
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
                    // Only update timezone and business hours in merchant settings
                    // Business info is now managed in Profile page
                    console.log('Saving business hours:', businessHours);
                    const settingsResponse = await apiClient.updateMerchantSettings({
                      timezone: selectedTimezone,
                      businessHours: businessHours
                    });
                    console.log('Settings save response:', settingsResponse);
                    
                    toast({
                      title: "Success",
                      description: "Location settings updated successfully",
                    });
                  } catch (error: any) {
                    console.error('Settings save error:', error);
                    console.error('Error response:', error.response?.data);
                    toast({
                      title: "Error",
                      description: error.response?.data?.message || "Failed to update location settings",
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
                      <SelectItem value="336">2 weeks</SelectItem>
                      <SelectItem value="720">1 month</SelectItem>
                      <SelectItem value="2160">3 months</SelectItem>
                      <SelectItem value="4320">6 months</SelectItem>
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
                <div className="space-y-2">
                  <Label htmlFor="minimum-notice">Minimum Booking Notice</Label>
                  <Select value={minimumBookingNotice} onValueChange={setMinimumBookingNotice}>
                    <SelectTrigger id="minimum-notice">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No restriction</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Minimum advance notice required for bookings
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
                  <Switch 
                    checked={autoConfirmBookings} 
                    onCheckedChange={setAutoConfirmBookings}
                  />
                </div>
                {/* Buffer Time setting hidden - not currently functional
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
                */}
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
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Only Rostered Staff by Default</Label>
                      <p className="text-sm text-muted-foreground">
                        When opening the calendar, show only staff members who are scheduled to work that day
                      </p>
                    </div>
                    <Switch 
                      checked={showOnlyRosteredStaffDefault} 
                      onCheckedChange={setShowOnlyRosteredStaffDefault}
                    />
                  </div>
                  
                  {showOnlyRosteredStaffDefault && (
                    <>
                      <Separator className="my-4" />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Include Staff Without Schedules</Label>
                          <p className="text-sm text-muted-foreground">
                            When roster filter is on, still show staff members who don't have weekly schedules defined
                          </p>
                        </div>
                        <Switch 
                          checked={includeUnscheduledStaff} 
                          onCheckedChange={setIncludeUnscheduledStaff}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Settings</h3>
                
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Payment settings are managed through your payment provider configuration.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tyro Payment Terminal</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable Tyro payment terminal integration for card payments
                        </p>
                      </div>
                      <Switch 
                        checked={tyroEnabled} 
                        onCheckedChange={setTyroEnabled}
                      />
                    </div>
                    
                    {tyroEnabled && (
                      <div className="space-y-4 ml-6 border-l-2 border-gray-200 pl-4">
                        <div className="space-y-2">
                          <Label htmlFor="tyro-merchant-id">Merchant ID</Label>
                          <Input
                            id="tyro-merchant-id"
                            type="text"
                            value={tyroMerchantId}
                            onChange={(e) => setTyroMerchantId(e.target.value)}
                            placeholder="Enter your Tyro Merchant ID"
                          />
                          <p className="text-sm text-muted-foreground">
                            Your Tyro merchant identifier
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="tyro-terminal-id">Terminal ID</Label>
                          <div className="flex gap-2">
                            <Input
                              id="tyro-terminal-id"
                              type="text"
                              value={tyroTerminalId}
                              onChange={(e) => setTyroTerminalId(e.target.value)}
                              placeholder="Enter Terminal ID"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowTyroPairingDialog(true)}
                            >
                              Pair Terminal
                            </Button>
                            {isPaired() && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  clearPairing();
                                  setTyroTerminalId('');
                                  toast({
                                    title: "Terminal unpaired",
                                    description: "The terminal has been unpaired successfully",
                                  });
                                }}
                              >
                                Unpair
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Terminal ID for your Tyro EFTPOS device
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TyroStatusIndicator />
                        </div>
                      </div>
                    )}
                  </div>
                {/* Require Deposit setting hidden - not currently functional
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
                */}

                  <Separator />

                  {/* Enable Tips setting hidden - not currently functional
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
                  */}
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
                  <Switch checked={requirePinForReports} onCheckedChange={setRequirePinForReports} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Staff Creation</Label>
                    <p className="text-sm text-muted-foreground">
                      Make PIN mandatory when creating new staff members. 
                      {requirePinForStaff ? " PIN must be set during staff creation." : " If disabled, a random PIN will be auto-generated."}
                    </p>
                  </div>
                  <Switch checked={requirePinForStaff} onCheckedChange={setRequirePinForStaff} />
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
            
            <div className="flex justify-end">
              <Button onClick={handleSaveSecuritySettings} disabled={loading}>
                Save Changes
              </Button>
            </div>
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
                      <Switch 
                        checked={bookingConfirmationEmail} 
                        onCheckedChange={setBookingConfirmationEmail} 
                      />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch 
                        checked={bookingConfirmationSms} 
                        onCheckedChange={setBookingConfirmationSms}
                      />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>24-Hour Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send reminder 24 hours before appointment
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={appointmentReminder24hEmail} 
                        onCheckedChange={setAppointmentReminder24hEmail} 
                      />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch 
                        checked={appointmentReminder24hSms} 
                        onCheckedChange={setAppointmentReminder24hSms}
                      />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>2-Hour Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Send reminder 2 hours before appointment
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={appointmentReminder2hEmail} 
                        onCheckedChange={setAppointmentReminder2hEmail} 
                      />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch 
                        checked={appointmentReminder2hSms} 
                        onCheckedChange={setAppointmentReminder2hSms}
                      />
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
                        Alert when new booking is made from booking app
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={newBookingNotification} 
                        onCheckedChange={setNewBookingNotification} 
                      />
                      <span className="text-sm text-muted-foreground">Panel</span>
                      <Switch 
                        checked={newBookingNotificationEmail} 
                        onCheckedChange={setNewBookingNotificationEmail} 
                      />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch 
                        checked={newBookingNotificationSms} 
                        onCheckedChange={setNewBookingNotificationSms}
                      />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cancellations</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when booking is cancelled from booking app
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={cancellationNotification} 
                        onCheckedChange={setCancellationNotification} 
                      />
                      <span className="text-sm text-muted-foreground">Panel</span>
                      <Switch 
                        checked={cancellationNotificationEmail} 
                        onCheckedChange={setCancellationNotificationEmail} 
                      />
                      <span className="text-sm text-muted-foreground">Email</span>
                      <Switch 
                        checked={cancellationNotificationSms} 
                        onCheckedChange={setCancellationNotificationSms}
                      />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={async () => {
                  setLoading(true);
                  try {
                    await apiClient.put("/merchant/settings", {
                      bookingConfirmationEmail,
                      bookingConfirmationSms,
                      appointmentReminder24hEmail,
                      appointmentReminder24hSms,
                      appointmentReminder2hEmail,
                      appointmentReminder2hSms,
                      newBookingNotification,
                      newBookingNotificationEmail,
                      newBookingNotificationSms,
                      cancellationNotification,
                      cancellationNotificationEmail,
                      cancellationNotificationSms
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Duplicate handling</Label>
                    <Select
                      value={customerDuplicateAction}
                      onValueChange={(value) => setCustomerDuplicateAction(value as 'skip' | 'update')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select how to handle duplicates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update existing customers</SelectItem>
                        <SelectItem value="skip">Skip duplicate rows</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose whether rows that match an existing email or mobile should update that customer or be skipped.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Skip invalid rows</Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={customerSkipInvalidRows}
                        onCheckedChange={setCustomerSkipInvalidRows}
                      />
                      <span className="text-sm text-muted-foreground">
                        {customerSkipInvalidRows
                          ? 'Rows with validation errors are ignored.'
                          : 'Validation errors stop the import so you can fix them.'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV Format Instructions
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Required column: First Name (Last Name optional)</li>
                    <li>• Optional columns include Email, Mobile Number, Phone, Date of Birth, Gender, Address, Suburb, City, State, Postal Code, Country, Referral Source, Note, Tags, Preferred Language</li>
                    <li>• Use comma-separated values for tags (e.g., "vip,loyal")</li>
                    <li>• Marketing opt-ins accept Yes/No/True/False</li>
                    <li>• Customize duplicate handling and invalid-row behaviour above before importing</li>
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

      <CustomerImportPreviewDialog
        open={showCustomerPreviewDialog}
        onClose={() => {
          if (importingCustomers) {
            setShowCustomerPreviewDialog(true);
            return;
          }
          setShowCustomerPreviewDialog(false);
          setCustomerImportPreview(null);
        }}
        preview={customerImportPreview}
        onConfirm={executeCustomerImport}
        importing={importingCustomers}
        duplicateAction={customerDuplicateAction}
        skipInvalidRows={customerSkipInvalidRows}
        onDuplicateActionChange={setCustomerDuplicateAction}
        onSkipInvalidRowsChange={setCustomerSkipInvalidRows}
        onRefresh={refreshCustomerPreview}
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

      <CustomerColumnMappingDialog
        open={showCustomerMappingDialog}
        onClose={() => {
          if (importingCustomers) {
            setShowCustomerMappingDialog(true);
            return;
          }
          setShowCustomerMappingDialog(false);
        }}
        csvHeaders={customerCsvHeaders}
        csvPreviewRows={customerCsvPreviewRows}
        onConfirm={handleCustomerMappingConfirm}
      />
      
      {/* Tyro Pairing Dialog */}
      <TyroPairingDialog
        isOpen={showTyroPairingDialog}
        onClose={() => setShowTyroPairingDialog(false)}
        defaultMerchantId={tyroMerchantId}
        defaultTerminalId={tyroTerminalId}
        onPaired={(terminalId) => {
          setTyroTerminalId(terminalId);
          setShowTyroPairingDialog(false);
          toast({
            title: "Success",
            description: `Terminal ${terminalId} paired successfully`,
          });
        }}
      />
    </div>
  );
}
