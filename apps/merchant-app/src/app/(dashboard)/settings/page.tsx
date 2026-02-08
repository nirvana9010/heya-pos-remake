"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  Clock,
  CreditCard,
  Shield,
  Bell,
  Users,
  Database,
  Globe,
  Upload,
  Download,
  FileText,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@heya-pos/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@heya-pos/ui";
import { Spinner } from "@heya-pos/ui";
import { TimezoneUtils } from "@heya-pos/utils";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import { resolveApiBaseUrl } from "@/lib/clients/base-client";
import { ImportPreviewDialog } from "@/components/services/import-preview-dialog";
import { ColumnMappingDialog } from "@/components/services/column-mapping-dialog";
import { CustomerColumnMappingDialog } from "@/components/customers/customer-column-mapping-dialog";
import { CustomerImportPreviewDialog } from "@/components/customers/customer-import-preview-dialog";
import { useAuth, usePermissions } from "@/lib/auth/auth-provider";
import { useFeatures } from "@/lib/features/feature-service";
import { TyroPairingDialog } from "@/components/tyro/TyroPairingDialog";
import { TyroStatusIndicator } from "@/components/tyro/TyroStatusIndicator";
import { HolidayManager } from "@/components/settings/HolidayManager";
import { TeamTabContent } from "@/components/settings/TeamTabContent";
import { useTyro } from "@/hooks/useTyro";
import type { CustomerImportPreview } from "@/lib/clients/customers-client";
import { customerKeys } from "@/lib/query/hooks/use-customers";
import type { Service as ApiService } from "@/lib/clients/services-client";
import type { MerchantSettings } from "@heya-pos/types";

const AUTO_SAVE_DEBOUNCE_MS = 600;

export default function SettingsPage() {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { clearPairing, isPaired } = useTyro();
  const queryClient = useQueryClient();
  const { features, modules, loading: featuresLoading } = useFeatures();
  const { permissions, isOwner, can } = usePermissions();
  // Initialize with merchant settings if available to prevent flicker
  const merchantSettings = merchant?.settings || {};

  const [bookingAdvanceHours, setBookingAdvanceHours] = useState(
    merchantSettings.bookingAdvanceHours?.toString() || "48",
  );
  const [cancellationHours, setCancellationHours] = useState(
    merchantSettings.cancellationHours?.toString() || "24",
  );
  const [minimumBookingNotice, setMinimumBookingNotice] = useState(
    merchantSettings.minimumBookingNotice?.toString() || "0",
  );
  const [requirePinForRefunds, setRequirePinForRefunds] = useState(
    merchantSettings.requirePinForRefunds ?? true,
  );
  const [requirePinForCancellations, setRequirePinForCancellations] = useState(
    merchantSettings.requirePinForCancellations ?? true,
  );
  const [requirePinForReports, setRequirePinForReports] = useState(
    merchantSettings.requirePinForReports ?? true,
  );
  const [requirePinForStaff, setRequirePinForStaff] = useState(
    merchantSettings.requirePinForStaff ?? true,
  );
  const [staffPinLockEnabled, setStaffPinLockEnabled] = useState(
    merchantSettings.staffPinLockEnabled ?? false,
  );
  const [staffPinLockError, setStaffPinLockError] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState(
    merchantSettings.timezone || "Australia/Sydney",
  );
  // SMS availability - derived from server (Twilio config), not user-togglable
  const [smsEnabled, setSmsEnabled] = useState(false);
  // Notification settings - initialize from merchant settings to prevent flicker
  const [bookingConfirmationEmail, setBookingConfirmationEmail] = useState(
    merchantSettings.bookingConfirmationEmail !== false,
  );
  const [bookingConfirmationSms, setBookingConfirmationSms] = useState(
    merchantSettings.bookingConfirmationSms !== false,
  );
  const [appointmentReminder24hEmail, setAppointmentReminder24hEmail] =
    useState(merchantSettings.appointmentReminder24hEmail !== false);
  const [appointmentReminder24hSms, setAppointmentReminder24hSms] = useState(
    merchantSettings.appointmentReminder24hSms !== false,
  );
  const [appointmentReminder2hEmail, setAppointmentReminder2hEmail] = useState(
    merchantSettings.appointmentReminder2hEmail !== false,
  );
  const [appointmentReminder2hSms, setAppointmentReminder2hSms] = useState(
    merchantSettings.appointmentReminder2hSms !== false,
  );
  const [newBookingNotification, setNewBookingNotification] = useState(
    merchantSettings.newBookingNotification !== false,
  );
  const [newBookingNotificationEmail, setNewBookingNotificationEmail] =
    useState(merchantSettings.newBookingNotificationEmail !== false);
  const [newBookingNotificationSms, setNewBookingNotificationSms] = useState(
    merchantSettings.newBookingNotificationSms !== false,
  );
  const [cancellationNotification, setCancellationNotification] = useState(
    merchantSettings.cancellationNotification !== false,
  );
  const [cancellationNotificationEmail, setCancellationNotificationEmail] =
    useState(merchantSettings.cancellationNotificationEmail !== false);
  const [cancellationNotificationSms, setCancellationNotificationSms] =
    useState(merchantSettings.cancellationNotificationSms !== false);
  const [requireDeposit, setRequireDeposit] = useState(
    merchantSettings.requireDeposit ?? false,
  );
  const [depositPercentage, setDepositPercentage] = useState(
    merchantSettings.depositPercentage?.toString() || "30",
  );
  const [enableTips, setEnableTips] = useState(
    merchantSettings.enableTips ?? false,
  );
  const [defaultTipPercentages, setDefaultTipPercentages] = useState<number[]>(
    merchantSettings.defaultTipPercentages || [10, 15, 20],
  );
  const [allowCustomTipAmount, setAllowCustomTipAmount] = useState(
    merchantSettings.allowCustomTipAmount ?? true,
  );
  const [allowOnlineBookings, setAllowOnlineBookings] = useState(
    merchantSettings.allowOnlineBookings ?? true,
  );
  const [allowUnassignedBookings, setAllowUnassignedBookings] = useState(
    merchantSettings.allowUnassignedBookings ?? true,
  );
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(
    merchantSettings.autoConfirmBookings ?? true,
  );
  const [calendarStartHour, setCalendarStartHour] = useState(
    merchantSettings.calendarStartHour ?? 6,
  );
  const [calendarEndHour, setCalendarEndHour] = useState(
    merchantSettings.calendarEndHour ?? 23,
  );
  const [showOnlyRosteredStaffDefault, setShowOnlyRosteredStaffDefault] =
    useState(merchantSettings.showOnlyRosteredStaffDefault ?? true);
  const [enableCalendarBlocks, setEnableCalendarBlocks] = useState(
    merchantSettings.enableCalendarBlocks ?? true,
  );
  const [includeUnscheduledStaff, setIncludeUnscheduledStaff] = useState(
    merchantSettings.includeUnscheduledStaff ?? false,
  );
  const [priceToDurationRatio, setPriceToDurationRatio] = useState(
    merchantSettings.priceToDurationRatio?.toString() || "1.0",
  );
  const [tyroEnabled, setTyroEnabled] = useState(
    merchantSettings.tyroEnabled ?? false,
  );
  const [tyroTerminalId, setTyroTerminalId] = useState(
    merchantSettings.tyroTerminalId ?? "",
  );
  const [tyroMerchantId, setTyroMerchantId] = useState(
    (merchantSettings.tyroMerchantId ??
      process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID) ||
      "",
  );
  const [showTyroPairingDialog, setShowTyroPairingDialog] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
      Object.entries(merchantSettings.businessHours).forEach(
        ([day, hours]: [string, any]) => {
          if (hours) {
            formattedHours[day] = {
              open: hours.open || "09:00",
              close: hours.close || "17:00",
              isOpen: hours.isOpen !== undefined ? hours.isOpen : true,
            };
          } else {
            formattedHours[day] = defaultHours[
              day as keyof typeof defaultHours
            ] || { open: "09:00", close: "17:00", isOpen: false };
          }
        },
      );
      return { ...defaultHours, ...formattedHours };
    }
    return defaultHours;
  });

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Partial<MerchantSettings>>({});
  const lastSavedSettingsRef = useRef<Partial<MerchantSettings>>(merchantSettings);
  const hasLoadedSettingsRef = useRef(false);
  const shouldSkipNextAutoSaveRef = useRef(true);
  const isUnmountedRef = useRef(false);
  const queueAutoSaveRef = useRef<
    (
      updates: Partial<MerchantSettings>,
      options?: { force?: boolean; skipDebounce?: boolean },
    ) => void
  >();

  const hasOwnPending = (
    snapshot: Partial<MerchantSettings>,
    key: string,
  ) => Object.prototype.hasOwnProperty.call(snapshot, key);

  const deepEqual = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) {
      return true;
    }

    if (
      typeof a === "object" &&
      a !== null &&
      typeof b === "object" &&
      b !== null
    ) {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch (error) {
        return false;
      }
    }

    return false;
  };

  const mergeSettingsIntoLocalCache = useCallback(
    (updates: Partial<MerchantSettings>) => {
      if (typeof window !== "undefined") {
        const storedMerchant = localStorage.getItem("merchant");
        if (storedMerchant) {
          try {
            const merchantData = JSON.parse(storedMerchant);
            merchantData.settings = {
              ...(merchantData.settings ?? {}),
              ...updates,
            };
            localStorage.setItem("merchant", JSON.stringify(merchantData));
            window.dispatchEvent(
              new CustomEvent("merchantSettingsUpdated", {
                detail: { settings: merchantData.settings },
              }),
            );
          } catch (error) {
            console.error("Failed to update local merchant data:", error);
          }
        }
      }

      if (merchant) {
        queryClient.invalidateQueries({ queryKey: ["merchant"] });
        queryClient.invalidateQueries({ queryKey: ["calendar"] });
      }
    },
    [merchant, queryClient],
  );

  const persistSettings = useCallback(
    async (updates: Partial<MerchantSettings>) => {
      const response = await apiClient.updateMerchantSettings(updates);
      if (response) {
        lastSavedSettingsRef.current = response;
        mergeSettingsIntoLocalCache(response);
        return response;
      }

      const fallback = {
        ...lastSavedSettingsRef.current,
        ...updates,
      } as Partial<MerchantSettings>;
      lastSavedSettingsRef.current = fallback;
      mergeSettingsIntoLocalCache(fallback);
      return fallback;
    },
    [mergeSettingsIntoLocalCache],
  );

  // Import states
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [customerDuplicateAction, setCustomerDuplicateAction] = useState<
    "skip" | "update"
  >("update");
  const [customerSkipInvalidRows, setCustomerSkipInvalidRows] = useState(true);
  const [customerCsvHeaders, setCustomerCsvHeaders] = useState<string[]>([]);
  const [customerCsvPreviewRows, setCustomerCsvPreviewRows] = useState<
    string[][]
  >([]);
  const [customerColumnMappings, setCustomerColumnMappings] = useState<Record<
    string,
    string
  > | null>(null);
  const [showCustomerMappingDialog, setShowCustomerMappingDialog] =
    useState(false);
  const [customerImportPreview, setCustomerImportPreview] =
    useState<CustomerImportPreview | null>(null);
  const [showCustomerPreviewDialog, setShowCustomerPreviewDialog] =
    useState(false);
  const [serviceFile, setServiceFile] = useState<File | null>(null);
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [importingServices, setImportingServices] = useState(false);
  const [serviceImportPreview, setServiceImportPreview] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {},
  );
  const [lastImportResult, setLastImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [allServices, setAllServices] = useState<ApiService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideEditId, setOverrideEditId] = useState<string | null>(null);
  const [overrideSelectedServiceId, setOverrideSelectedServiceId] =
    useState<string>("");
  const [overrideMaxDays, setOverrideMaxDays] = useState<number>(0);
  const [overrideMinHours, setOverrideMinHours] = useState<number>(0);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [removingOverrideId, setRemovingOverrideId] = useState<string | null>(
    null,
  );
  const bookingDefaults = useMemo(() => {
    const advanceHoursNumeric = Number(bookingAdvanceHours);
    const minNoticeMinutesNumeric = Number(minimumBookingNotice);

    const maxDays = Number.isFinite(advanceHoursNumeric)
      ? Math.max(1, Math.ceil(advanceHoursNumeric / 24))
      : 7;

    const minNoticeMinutes = Number.isFinite(minNoticeMinutesNumeric)
      ? Math.max(0, Math.floor(minNoticeMinutesNumeric))
      : 0;
    const minNoticeHours = Math.max(0, Math.ceil(minNoticeMinutes / 60));

    const minNoticeLabel = (() => {
      if (minNoticeMinutes <= 0) {
        return "no minimum notice requirement";
      }

      if (minNoticeMinutes % 1440 === 0) {
        const dayCount = minNoticeMinutes / 1440;
        return `${dayCount} day${dayCount === 1 ? "" : "s"}`;
      }

      if (minNoticeMinutes >= 60) {
        const hours = Math.floor(minNoticeMinutes / 60);
        const remainingMinutes = minNoticeMinutes % 60;

        if (remainingMinutes === 0) {
          return `${hours} hour${hours === 1 ? "" : "s"}`;
        }

        return `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${
          remainingMinutes === 1 ? "" : "s"
        }`;
      }

      return `${minNoticeMinutes} minute${
        minNoticeMinutes === 1 ? "" : "s"
      }`;
    })();

    return {
      maxDays,
      minNoticeMinutes,
      minNoticeHours,
      minNoticeLabel,
    };
  }, [bookingAdvanceHours, minimumBookingNotice]);

  const fetchServicesList = useCallback(async () => {
    setServicesLoading(true);
    try {
      const response = await apiClient.getServices({
        limit: 500,
        sortBy: "name",
        sortOrder: "asc",
      });
      setAllServices(response?.data ?? []);
    } catch (error: any) {
      console.error("Failed to load services:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setServicesLoading(false);
    }
  }, [toast]);

  const overrideRows = useMemo(() => {
    return allServices
      .filter((service) => {
        const maxValue =
          typeof service.maxAdvanceBooking === "number"
            ? service.maxAdvanceBooking
            : bookingDefaults.maxDays;
        const minValue =
          typeof service.minAdvanceBooking === "number"
            ? service.minAdvanceBooking
            : bookingDefaults.minNoticeHours;
        const metadataMode = (service.metadata as any)?.advanceBooking?.mode as
          | "merchant_default"
          | "custom"
          | undefined;
        if (metadataMode === "custom") {
          return true;
        }
        return (
          maxValue !== bookingDefaults.maxDays ||
          minValue !== bookingDefaults.minNoticeHours
        );
      })
      .map((service) => {
        const maxValue =
          typeof service.maxAdvanceBooking === "number"
            ? service.maxAdvanceBooking
            : bookingDefaults.maxDays;
        const minValue =
          typeof service.minAdvanceBooking === "number"
            ? service.minAdvanceBooking
            : bookingDefaults.minNoticeHours;
        const metadataMode = (service.metadata as any)?.advanceBooking?.mode as
          | "merchant_default"
          | "custom"
          | undefined;
        return {
          id: service.id,
          name: service.name,
          maxAdvanceBooking: maxValue,
          minAdvanceBooking: minValue,
          advanceBookingMode: metadataMode,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allServices, bookingDefaults]);

  const availableServicesForOverride = useMemo(() => {
    const overriddenIds = new Set(overrideRows.map((row) => row.id));
    return allServices
      .filter((service) => !overriddenIds.has(service.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allServices, overrideRows]);

  const editingOverrideService = useMemo(() => {
    if (!overrideEditId) {
      return null;
    }
    return allServices.find((service) => service.id === overrideEditId) ?? null;
  }, [overrideEditId, allServices]);

  useEffect(() => {
    if (overrideDialogOpen && !overrideEditId) {
      if (
        !overrideSelectedServiceId &&
        availableServicesForOverride.length > 0
      ) {
        setOverrideSelectedServiceId(availableServicesForOverride[0].id);
        setOverrideMaxDays(bookingDefaults.maxDays);
        setOverrideMinHours(bookingDefaults.minNoticeHours);
      }
      if (availableServicesForOverride.length === 0) {
        setOverrideSelectedServiceId("");
      }
    }
  }, [
    overrideDialogOpen,
    overrideEditId,
    overrideSelectedServiceId,
    availableServicesForOverride,
    bookingDefaults,
  ]);

  const loadMerchantSettings = useCallback(async () => {
    shouldSkipNextAutoSaveRef.current = true;
    const pendingSnapshot = { ...pendingUpdatesRef.current };
    const hadPendingChanges = Object.keys(pendingSnapshot).length > 0;
    const shouldHydrate = (key: keyof MerchantSettings | string) =>
      !hasOwnPending(pendingSnapshot, key as string);

    try {
      const response = await apiClient.get("/merchant/settings");
      if (response) {
        const hydrate = (
          key: keyof MerchantSettings | string,
          setter: (value: any) => void,
          value: any,
        ) => {
          if (shouldHydrate(key)) {
            setter(value);
          }
        };

        hydrate("bookingAdvanceHours", setBookingAdvanceHours, response.bookingAdvanceHours?.toString() || "48");
        hydrate("cancellationHours", setCancellationHours, response.cancellationHours?.toString() || "24");
        hydrate("minimumBookingNotice", setMinimumBookingNotice, response.minimumBookingNotice?.toString() || "0");
        hydrate("requirePinForRefunds", setRequirePinForRefunds, response.requirePinForRefunds ?? true);
        hydrate("requirePinForCancellations", setRequirePinForCancellations, response.requirePinForCancellations ?? true);
        hydrate("requirePinForReports", setRequirePinForReports, response.requirePinForReports ?? true);
        hydrate("requirePinForStaff", setRequirePinForStaff, response.requirePinForStaff ?? true);
        hydrate("staffPinLockEnabled", setStaffPinLockEnabled, response.staffPinLockEnabled ?? false);
        hydrate("requireDeposit", setRequireDeposit, response.requireDeposit ?? false);
        hydrate("depositPercentage", setDepositPercentage, response.depositPercentage?.toString() || "30");
        hydrate("enableTips", setEnableTips, response.enableTips ?? false);
        hydrate("defaultTipPercentages", setDefaultTipPercentages, response.defaultTipPercentages || [10, 15, 20]);
        hydrate("allowCustomTipAmount", setAllowCustomTipAmount, response.allowCustomTipAmount ?? true);
        hydrate("allowOnlineBookings", setAllowOnlineBookings, response.allowOnlineBookings ?? true);
        hydrate("allowUnassignedBookings", setAllowUnassignedBookings, response.allowUnassignedBookings ?? true);
        hydrate("autoConfirmBookings", setAutoConfirmBookings, response.autoConfirmBookings ?? true);
        hydrate("calendarStartHour", setCalendarStartHour, response.calendarStartHour ?? 6);
        hydrate("calendarEndHour", setCalendarEndHour, response.calendarEndHour ?? 23);
        hydrate("showOnlyRosteredStaffDefault", setShowOnlyRosteredStaffDefault, response.showOnlyRosteredStaffDefault ?? true);
        hydrate("enableCalendarBlocks", setEnableCalendarBlocks, response.enableCalendarBlocks ?? true);
        hydrate("includeUnscheduledStaff", setIncludeUnscheduledStaff, response.includeUnscheduledStaff ?? false);
        hydrate("priceToDurationRatio", setPriceToDurationRatio, response.priceToDurationRatio?.toString() || "1.0");
        hydrate("tyroEnabled", setTyroEnabled, response.tyroEnabled ?? false);
        hydrate("tyroTerminalId", setTyroTerminalId, response.tyroTerminalId ?? "");
        hydrate(
          "tyroMerchantId",
          setTyroMerchantId,
          (response.tyroMerchantId ?? process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID) || "",
        );
        if (response.timezone) {
          hydrate("timezone", setSelectedTimezone, response.timezone);
        }
        setSmsEnabled(!!response.smsEnabled);
        hydrate("bookingConfirmationEmail", setBookingConfirmationEmail, response.bookingConfirmationEmail !== false);
        hydrate("bookingConfirmationSms", setBookingConfirmationSms, response.bookingConfirmationSms !== false);
        hydrate("appointmentReminder24hEmail", setAppointmentReminder24hEmail, response.appointmentReminder24hEmail !== false);
        hydrate("appointmentReminder24hSms", setAppointmentReminder24hSms, response.appointmentReminder24hSms !== false);
        hydrate("appointmentReminder2hEmail", setAppointmentReminder2hEmail, response.appointmentReminder2hEmail !== false);
        hydrate("appointmentReminder2hSms", setAppointmentReminder2hSms, response.appointmentReminder2hSms !== false);
        hydrate("newBookingNotification", setNewBookingNotification, response.newBookingNotification !== false);
        hydrate(
          "newBookingNotificationEmail",
          setNewBookingNotificationEmail,
          response.newBookingNotificationEmail !== false,
        );
        hydrate(
          "newBookingNotificationSms",
          setNewBookingNotificationSms,
          response.newBookingNotificationSms !== false,
        );
        hydrate(
          "cancellationNotification",
          setCancellationNotification,
          response.cancellationNotification !== false,
        );
        hydrate(
          "cancellationNotificationEmail",
          setCancellationNotificationEmail,
          response.cancellationNotificationEmail !== false,
        );
        hydrate(
          "cancellationNotificationSms",
          setCancellationNotificationSms,
          response.cancellationNotificationSms !== false,
        );

        if (response.businessHours && shouldHydrate("businessHours")) {
          const formattedHours: any = {};
          Object.entries(response.businessHours).forEach(
            ([day, hours]: [string, any]) => {
              if (hours) {
                formattedHours[day] = {
                  open: hours.open || "09:00",
                  close: hours.close || "17:00",
                  isOpen: hours.isOpen !== undefined ? hours.isOpen : true,
                };
              } else {
                formattedHours[day] = {
                  open: "09:00",
                  close: "17:00",
                  isOpen: false,
                };
              }
            },
          );
          setBusinessHours(formattedHours);
        }
        lastSavedSettingsRef.current = response;
        mergeSettingsIntoLocalCache(response);

        if (!hadPendingChanges) {
          pendingUpdatesRef.current = {};
        }

        await fetchServicesList();
      }
    } catch (error) {
      console.error("Failed to load merchant settings:", error);
    } finally {
      hasLoadedSettingsRef.current = true;

      if (hadPendingChanges) {
        pendingUpdatesRef.current = pendingSnapshot;
        queueAutoSaveRef.current?.(pendingSnapshot, {
          force: true,
          skipDebounce: true,
        });
      }
    }
  }, [fetchServicesList, mergeSettingsIntoLocalCache]);

  const loadMerchantProfile = useCallback(async () => {
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
  }, [merchant]);

  const flushAutoSave = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const updates = pendingUpdatesRef.current;
    if (
      !updates ||
      Object.keys(updates).length === 0 ||
      !hasLoadedSettingsRef.current
    ) {
      return;
    }

    pendingUpdatesRef.current = {};
    if (!isUnmountedRef.current) {
      setIsAutoSaving(true);
    }

    try {
      await persistSettings(updates);
      if (!isUnmountedRef.current) {
        setLastSavedAt(new Date());
      }
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully",
      });
    } catch (error: any) {
      console.error("❌ Failed to auto-save settings:", error);
      toast({
        title: "Auto-save failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "We couldn't save your changes. Restoring previous settings.",
        variant: "destructive",
      });
      await loadMerchantSettings();
    } finally {
      if (!isUnmountedRef.current) {
        setIsAutoSaving(false);
      }
    }
  }, [loadMerchantSettings, persistSettings, toast]);

  const queueAutoSave = useCallback(
    (
      updates: Partial<MerchantSettings>,
      options?: {
        force?: boolean;
        skipDebounce?: boolean;
      },
    ) => {
      if (!hasLoadedSettingsRef.current && !options?.force) {
        return;
      }

      const currentPending = pendingUpdatesRef.current;
      const lastSaved = lastSavedSettingsRef.current ?? {};

      const changes: Partial<MerchantSettings> = {};
      for (const [key, value] of Object.entries(updates) as Array<[
        keyof MerchantSettings,
        MerchantSettings[keyof MerchantSettings],
      ]>) {
        if (hasOwnPending(currentPending, key as string)) {
          changes[key] = value as any;
          continue;
        }

        const previousValue = (lastSaved as any)[key];
        if (!deepEqual(value, previousValue)) {
          changes[key] = value as any;
        }
      }

      if (Object.keys(changes).length === 0) {
        return;
      }

      pendingUpdatesRef.current = {
        ...currentPending,
        ...changes,
      };

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      if (options?.skipDebounce) {
        autoSaveTimerRef.current = null;
        void flushAutoSave();
        return;
      }

      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null;
        void flushAutoSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
    [flushAutoSave],
  );

  queueAutoSaveRef.current = queueAutoSave;

  const handleAllowOnlineBookingsChange = useCallback(
    (value: boolean) => {
      setAllowOnlineBookings(value);
      queueAutoSave(
        {
          allowOnlineBookings: value,
        },
        { force: true },
      );
    },
    [queueAutoSave],
  );

  const handleAllowUnassignedBookingsChange = useCallback(
    (value: boolean) => {
      setAllowUnassignedBookings(value);
      queueAutoSave(
        {
          allowUnassignedBookings: value,
        },
        { force: true },
      );
    },
    [queueAutoSave, setAllowUnassignedBookings],
  );

  const handleAutoConfirmBookingsChange = useCallback(
    (value: boolean) => {
      setAutoConfirmBookings(value);
      queueAutoSave(
        {
          autoConfirmBookings: value,
        },
        { force: true },
      );
    },
    [queueAutoSave],
  );

  const handleEnableCalendarBlocksChange = useCallback(
    (value: boolean) => {
      setEnableCalendarBlocks(value);
      queueAutoSave(
        {
          enableCalendarBlocks: value,
        },
        { force: true },
      );
    },
    [queueAutoSave],
  );

  const toNumberOrUndefined = (value: string | number | undefined) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const aggregatedSettings = useMemo<Partial<MerchantSettings>>(
    () => ({
      bookingAdvanceHours: toNumberOrUndefined(bookingAdvanceHours),
      cancellationHours: toNumberOrUndefined(cancellationHours),
      minimumBookingNotice: toNumberOrUndefined(minimumBookingNotice),
      requirePinForRefunds,
      requirePinForCancellations,
      requirePinForReports,
      requirePinForStaff,
      staffPinLockEnabled,
      timezone: selectedTimezone,
      requireDeposit,
      depositPercentage: toNumberOrUndefined(depositPercentage),
      enableTips,
      defaultTipPercentages,
      allowCustomTipAmount,
      allowOnlineBookings,
      allowUnassignedBookings,
      autoConfirmBookings,
      calendarStartHour,
      calendarEndHour,
      showOnlyRosteredStaffDefault,
      enableCalendarBlocks,
      includeUnscheduledStaff,
      priceToDurationRatio: toNumberOrUndefined(priceToDurationRatio),
      tyroEnabled,
      tyroTerminalId: tyroTerminalId || undefined,
      tyroMerchantId: tyroMerchantId || undefined,
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
      cancellationNotificationSms,
      businessHours,
    }),
    [
      appointmentReminder24hEmail,
      appointmentReminder24hSms,
      appointmentReminder2hEmail,
      appointmentReminder2hSms,
      autoConfirmBookings,
      bookingAdvanceHours,
      bookingConfirmationEmail,
      bookingConfirmationSms,
      businessHours,
      calendarEndHour,
      calendarStartHour,
      cancellationHours,
      cancellationNotification,
      cancellationNotificationEmail,
      cancellationNotificationSms,
      defaultTipPercentages,
      depositPercentage,
      enableTips,
      includeUnscheduledStaff,
      enableCalendarBlocks,
      allowOnlineBookings,
      minimumBookingNotice,
      newBookingNotification,
      newBookingNotificationEmail,
      newBookingNotificationSms,
      priceToDurationRatio,
      requireDeposit,
      requirePinForCancellations,
      requirePinForReports,
      requirePinForRefunds,
      requirePinForStaff,
      staffPinLockEnabled,
      selectedTimezone,
      showOnlyRosteredStaffDefault,
      allowCustomTipAmount,
      allowUnassignedBookings,
      tyroEnabled,
      tyroMerchantId,
      tyroTerminalId,
    ],
  );

  const lastSavedMessage = useMemo(() => {
    if (!lastSavedAt) {
      return "Changes save automatically";
    }
    const diffMs = Date.now() - lastSavedAt.getTime();
    if (Number.isNaN(diffMs)) {
      return "Changes save automatically";
    }
    if (diffMs < 15_000) {
      return "Saved just now";
    }
    if (diffMs < 60_000) {
      const seconds = Math.max(1, Math.round(diffMs / 1000));
      return `Saved ${seconds} second${seconds === 1 ? "" : "s"} ago`;
    }
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `Saved at ${formatter.format(lastSavedAt)}`;
  }, [lastSavedAt]);

  useEffect(() => {
    loadMerchantSettings();
    loadMerchantProfile();
  }, [loadMerchantSettings, loadMerchantProfile]);

  useEffect(() => {
    if (!hasLoadedSettingsRef.current) {
      return;
    }
    if (shouldSkipNextAutoSaveRef.current) {
      shouldSkipNextAutoSaveRef.current = false;
      return;
    }
    queueAutoSave(aggregatedSettings);
  }, [aggregatedSettings, queueAutoSave]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (pendingUpdatesRef.current && Object.keys(pendingUpdatesRef.current).length > 0) {
        void flushAutoSave();
      }
    };
  }, [flushAutoSave]);

  const resetOverrideForm = useCallback(() => {
    setOverrideEditId(null);
    setOverrideSelectedServiceId("");
    setOverrideMaxDays(bookingDefaults.maxDays);
    setOverrideMinHours(bookingDefaults.minNoticeHours);
    setOverrideError(null);
    setOverrideSaving(false);
  }, [bookingDefaults]);

  const handleOverrideDialogOpenChange = useCallback(
    (open: boolean) => {
      setOverrideDialogOpen(open);
      if (!open) {
        resetOverrideForm();
      }
    },
    [resetOverrideForm],
  );

  const openAddOverride = useCallback(() => {
    resetOverrideForm();
    setOverrideDialogOpen(true);
  }, [resetOverrideForm]);

  const handleEditOverride = useCallback(
    (serviceId: string) => {
      const service = allServices.find((s) => s.id === serviceId);
      if (!service) {
        toast({
          title: "Service not found",
          description: "Unable to load the selected service.",
          variant: "destructive",
        });
        return;
      }
      setOverrideEditId(serviceId);
      setOverrideSelectedServiceId(serviceId);
      setOverrideMaxDays(
        typeof service.maxAdvanceBooking === "number"
          ? service.maxAdvanceBooking
          : bookingDefaults.maxDays,
      );
      setOverrideMinHours(
        typeof service.minAdvanceBooking === "number"
          ? service.minAdvanceBooking
          : bookingDefaults.minNoticeHours,
      );
      setOverrideError(null);
      setOverrideDialogOpen(true);
    },
    [allServices, bookingDefaults, toast],
  );

  const handleSubmitOverride = useCallback(async () => {
    setOverrideError(null);
    const targetService =
      overrideEditId && editingOverrideService
        ? editingOverrideService
        : (allServices.find(
            (service) => service.id === overrideSelectedServiceId,
          ) ?? null);

    if (!targetService) {
      setOverrideError("Select a service to override.");
      return;
    }

    const maxDays = Math.trunc(overrideMaxDays);
    if (!Number.isFinite(maxDays) || maxDays < 1) {
      setOverrideError("Maximum advance booking must be at least 1 day.");
      return;
    }
    if (maxDays > bookingDefaults.maxDays) {
      setOverrideError(
        `Maximum advance booking cannot exceed ${bookingDefaults.maxDays} day(s).`,
      );
      return;
    }

    const minHours = Math.trunc(overrideMinHours);
    if (!Number.isFinite(minHours) || minHours < 0) {
      setOverrideError(
        "Minimum advance notice must be a positive number of hours.",
      );
      return;
    }
    if (minHours > maxDays * 24) {
      setOverrideError(
        "Minimum advance notice cannot exceed the maximum booking window.",
      );
      return;
    }
    if (minHours < bookingDefaults.minNoticeHours) {
      setOverrideError(
        `Minimum advance notice cannot be less than the merchant default of ${bookingDefaults.minNoticeLabel}.`,
      );
      return;
    }

    setOverrideSaving(true);
    try {
      await apiClient.updateService(targetService.id, {
        maxAdvanceBooking: maxDays,
        minAdvanceBooking: minHours,
        advanceBookingMode: "custom",
      });
      toast({
        title: "Override saved",
        description: `${targetService.name} can now be booked up to ${maxDays} day${maxDays === 1 ? "" : "s"} in advance.`,
      });
      await fetchServicesList();
      setOverrideDialogOpen(false);
      resetOverrideForm();
    } catch (error: any) {
      console.error("Failed to save override:", error);
      setOverrideError(
        error?.response?.data?.message ||
          "Failed to save override. Please try again.",
      );
    } finally {
      setOverrideSaving(false);
    }
  }, [
    allServices,
    bookingDefaults,
    editingOverrideService,
    fetchServicesList,
    overrideEditId,
    overrideMaxDays,
    overrideMinHours,
    overrideSelectedServiceId,
    resetOverrideForm,
    toast,
  ]);

  const handleRemoveOverride = useCallback(
    async (serviceId: string) => {
      const service = allServices.find((s) => s.id === serviceId);
      if (!service) {
        toast({
          title: "Service not found",
          description: "Unable to load the selected service.",
          variant: "destructive",
        });
        return;
      }

      const confirmRemove = window.confirm(
        `Remove the custom booking window for "${service.name}"?`,
      );
      if (!confirmRemove) {
        return;
      }

      setRemovingOverrideId(serviceId);
      try {
        await apiClient.updateService(serviceId, {
          advanceBookingMode: "merchant_default",
          maxAdvanceBooking: bookingDefaults.maxDays,
          minAdvanceBooking: bookingDefaults.minNoticeHours,
        });
        toast({
          title: "Override removed",
          description: `${service.name} now follows the merchant default window.`,
        });
        await fetchServicesList();
      } catch (error: any) {
        console.error("Failed to remove override:", error);
        toast({
          title: "Error",
          description:
            error?.response?.data?.message || "Failed to remove override",
          variant: "destructive",
        });
      } finally {
        setRemovingOverrideId(null);
      }
    },
    [allServices, bookingDefaults, fetchServicesList, toast],
  );

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
      formData.append("file", customerFile);

      const API_BASE_URL = resolveApiBaseUrl();
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${API_BASE_URL}/v1/customers/import/mapping`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to parse CSV file");
      }

      const mappingData = await response.json();
      setCustomerCsvHeaders(mappingData.headers || []);
      setCustomerCsvPreviewRows(mappingData.rows || []);
      setShowCustomerMappingDialog(true);
    } catch (error) {
      toast({
        title: "Import error",
        description:
          error instanceof Error ? error.message : "Failed to parse CSV file",
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
        description:
          error instanceof Error
            ? error.message
            : "Unable to preview customer import",
        variant: "destructive",
      });
      if (!customerImportPreview) {
        setShowCustomerMappingDialog(true);
      }
    } finally {
      setImportingCustomers(false);
    }
  };

  const handleCustomerMappingConfirm = async (
    mappings: Record<string, string>,
  ) => {
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
        description:
          error instanceof Error ? error.message : "Unable to import customers",
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

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-import-template.csv";
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
      console.error("Template download error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download template",
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
      formData.append("file", serviceFile);

      const API_BASE_URL = resolveApiBaseUrl();
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${API_BASE_URL}/v1/services/import/mapping`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to parse CSV file");
      }

      const mappingData = await response.json();
      setCsvHeaders(mappingData.headers);
      setCsvPreviewRows(mappingData.rows);
      setShowMappingDialog(true);
    } catch (error) {
      toast({
        title: "Import error",
        description:
          error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setImportingServices(false);
    }
  };

  const handleColumnMappingConfirm = async (
    mappings: Record<string, string>,
  ) => {
    setColumnMappings(mappings);
    setShowMappingDialog(false);
    setImportingServices(true);

    try {
      const preview = await apiClient.services.previewServiceImport(
        serviceFile!,
        {
          duplicateAction: "skip",
          createCategories: true,
          skipInvalidRows: false,
        },
        mappings,
      );

      setServiceImportPreview(preview);
      setShowPreviewDialog(true);
    } catch (error) {
      toast({
        title: "Import error",
        description:
          error instanceof Error ? error.message : "Failed to preview import",
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
          duplicateAction: "create_new",
          createCategories: true,
          skipInvalidRows: false,
        },
      );

      toast({
        title: "✅ Import successful!",
        description: `Successfully imported ${result.imported} services${result.updated > 0 ? `, updated ${result.updated}` : ""}${result.skipped > 0 ? `, skipped ${result.skipped}` : ""}.`,
        duration: 5000, // Show for 5 seconds
      });

      // Invalidate services and categories cache so the Services page shows the new data
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", "categories"] });

      // Reset state
      setServiceFile(null);
      setServiceImportPreview(null);
      setShowPreviewDialog(false);

      // Store the result for display
      setLastImportResult(result);
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Failed to import services",
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
        <p className="text-muted-foreground mt-1">
          Manage your business preferences and configuration
        </p>
        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
          {isAutoSaving ? (
            <>
              <Spinner className="h-4 w-4" />
              <span>Saving changes…</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-primary" />
              <span>{lastSavedMessage}</span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {can("staff.view") && <TabsTrigger value="team">Team</TabsTrigger>}
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                View your business details and manage location settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Booking App - Main URL - MOVED TO TOP */}
              <div className="space-y-2 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Label className="text-base font-semibold">
                  🌟 Customer Booking App
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={(() => {
                      const isLocal = window.location.hostname === "localhost";
                      const baseUrl = isLocal
                        ? "http://localhost:3001"
                        : "https://visit.heyapos.com";
                      return merchantSubdomain
                        ? `${baseUrl}/${merchantSubdomain}/booking`
                        : `${baseUrl}/booking`;
                    })()}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const isLocal = window.location.hostname === "localhost";
                      const baseUrl = isLocal
                        ? "http://localhost:3001"
                        : "https://visit.heyapos.com";
                      const url = merchantSubdomain
                        ? `${baseUrl}/${merchantSubdomain}/booking`
                        : `${baseUrl}/booking`;
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
                      const isLocal = window.location.hostname === "localhost";
                      const baseUrl = isLocal
                        ? "http://localhost:3001"
                        : "https://visit.heyapos.com";
                      const url = merchantSubdomain
                        ? `${baseUrl}/${merchantSubdomain}/booking`
                        : `${baseUrl}/booking`;
                      window.open(url, "_blank");
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm font-medium text-primary">
                  Share this link with customers to allow them to book
                  appointments online 24/7
                </p>
              </div>

              <Separator />

              {/* Business Info - Read-only with link to Profile */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Basic Information</h3>
                  <Button variant="link" size="sm" className="text-xs" asChild>
                    <Link href="/profile">Edit in Profile →</Link>
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Business Name
                    </Label>
                    <p className="text-sm font-medium">
                      {businessName || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ABN</Label>
                    <p className="text-sm font-medium">
                      {businessAbn || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Business Email
                    </Label>
                    <p className="text-sm font-medium">
                      {businessEmail || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Business Phone
                    </Label>
                    <p className="text-sm font-medium">
                      {businessPhone || "Not set"}
                    </p>
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
                    <Select
                      value={selectedTimezone}
                      onValueChange={setSelectedTimezone}
                    >
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
                      All bookings and appointments will be displayed in this
                      timezone
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
                        const isLocal =
                          window.location.hostname === "localhost";
                        const baseUrl = isLocal
                          ? "http://localhost:3001"
                          : "https://visit.heyapos.com";
                        return merchantSubdomain
                          ? `${baseUrl}/${merchantSubdomain}/checkin`
                          : `${baseUrl}/checkin`;
                      })()}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const isLocal =
                          window.location.hostname === "localhost";
                        const baseUrl = isLocal
                          ? "http://localhost:3001"
                          : "https://visit.heyapos.com";
                        const url = merchantSubdomain
                          ? `${baseUrl}/${merchantSubdomain}/checkin`
                          : `${baseUrl}/checkin`;
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
                        const isLocal =
                          window.location.hostname === "localhost";
                        const baseUrl = isLocal
                          ? "http://localhost:3001"
                          : "https://visit.heyapos.com";
                        const url = merchantSubdomain
                          ? `${baseUrl}/${merchantSubdomain}/checkin`
                          : `${baseUrl}/checkin`;
                        window.open(url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Display this URL on tablets for customer self check-in at
                    your location
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Hours</h3>
                <div className="grid gap-3">
                  {[
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                  ].map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-between"
                    >
                      <Label className="w-24 capitalize">{day}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={businessHours[day]?.open || "09:00"}
                          onChange={(e) =>
                            setBusinessHours({
                              ...businessHours,
                              [day]: {
                                ...businessHours[day],
                                open: e.target.value,
                              },
                            })
                          }
                          className="w-32"
                          disabled={!businessHours[day]?.isOpen}
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={businessHours[day]?.close || "17:00"}
                          onChange={(e) =>
                            setBusinessHours({
                              ...businessHours,
                              [day]: {
                                ...businessHours[day],
                                close: e.target.value,
                              },
                            })
                          }
                          className="w-32"
                          disabled={!businessHours[day]?.isOpen}
                        />
                        <Switch
                          checked={businessHours[day]?.isOpen || false}
                          onCheckedChange={(checked) =>
                            setBusinessHours({
                              ...businessHours,
                              [day]: { ...businessHours[day], isOpen: checked },
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
          <HolidayManager
            initialState={merchantSettings?.holidayState ?? null}
          />
        </TabsContent>
        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Booking Settings
              </CardTitle>
              <CardDescription>
                Configure booking rules and policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="advance-booking">
                    Advance Booking (Hours)
                  </Label>
                  <Select
                    value={bookingAdvanceHours}
                    onValueChange={setBookingAdvanceHours}
                  >
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
                  <Label htmlFor="cancellation">
                    Cancellation Notice (Hours)
                  </Label>
                  <Select
                    value={cancellationHours}
                    onValueChange={setCancellationHours}
                  >
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
                  <Select
                    value={minimumBookingNotice}
                    onValueChange={setMinimumBookingNotice}
                  >
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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-900">
                      Service-Specific Booking Windows
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Override the default advance window only for services that
                      require more notice.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openAddOverride}
                    disabled={
                      servicesLoading ||
                      availableServicesForOverride.length === 0
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Override
                  </Button>
                </div>
                {servicesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="h-4 w-4" />
                    Loading service overrides…
                  </div>
                ) : overrideRows.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
                    All services currently follow the merchant default of{" "}
                    {bookingDefaults.maxDays} day
                    {bookingDefaults.maxDays === 1 ? "" : "s"}{" "}
                    {bookingDefaults.minNoticeMinutes > 0
                      ? `with a minimum notice of ${bookingDefaults.minNoticeLabel}.`
                      : "with no minimum notice requirement."}
                  </div>
                ) : (
                  <div className="divide-y rounded-md border">
                    {overrideRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {row.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Up to {row.maxAdvanceBooking} day
                            {row.maxAdvanceBooking === 1 ? "" : "s"} in advance
                            · Minimum notice {row.minAdvanceBooking} hour
                            {row.minAdvanceBooking === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOverride(row.id)}
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveOverride(row.id)}
                            disabled={removingOverrideId === row.id}
                          >
                            {removingOverrideId === row.id ? (
                              <>
                                <Spinner className="mr-1 h-4 w-4" />
                                Removing…
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-1 h-4 w-4" />
                                Remove
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {availableServicesForOverride.length === 0 &&
                  !servicesLoading &&
                  overrideRows.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      All services are currently using the merchant default
                      booking window.
                    </p>
                  )}
                {availableServicesForOverride.length === 0 &&
                  !servicesLoading &&
                  overrideRows.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Every service already has an override. Remove one to add
                      another custom window.
                    </p>
                  )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Online Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      Customers can book appointments through your website
                    </p>
                  </div>
                  <Switch
                    checked={allowOnlineBookings}
                    onCheckedChange={handleAllowOnlineBookingsChange}
                  />
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
                    onCheckedChange={handleAutoConfirmBookingsChange}
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
                    <Label>Allow Unassigned Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      When customers choose "Any Available" staff: ON = Creates
                      unassigned bookings for manual assignment later, OFF =
                      Automatically assigns the next available staff member.
                      The calendar will always display the "Unassigned" column
                      whenever this is enabled.
                    </p>
                  </div>
                  <Switch
                    checked={allowUnassignedBookings}
                    onCheckedChange={handleAllowUnassignedBookingsChange}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-base font-medium">
                    Calendar Display Hours
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Set the hours displayed on your calendar view (default: 6 AM
                    - 11 PM)
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm">
                    <div className="space-y-2">
                      <Label htmlFor="calendar-start">Start Hour</Label>
                      <Select
                        value={calendarStartHour.toString()}
                        onValueChange={(value) =>
                          setCalendarStartHour(parseInt(value))
                        }
                      >
                        <SelectTrigger id="calendar-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0
                                ? "12 AM"
                                : i < 12
                                  ? `${i} AM`
                                  : i === 12
                                    ? "12 PM"
                                    : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="calendar-end">End Hour</Label>
                      <Select
                        value={calendarEndHour.toString()}
                        onValueChange={(value) =>
                          setCalendarEndHour(parseInt(value))
                        }
                      >
                        <SelectTrigger id="calendar-end">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem
                              key={i}
                              value={i.toString()}
                              disabled={i <= calendarStartHour}
                            >
                              {i === 0
                                ? "12 AM"
                                : i < 12
                                  ? `${i} AM`
                                  : i === 12
                                    ? "12 PM"
                                    : `${i - 12} PM`}
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
                        When opening the calendar, show only staff members who
                        are scheduled to work that day
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
                            When roster filter is on, still show staff members
                            who don't have weekly schedules defined
                          </p>
                        </div>
                    <Switch
                      checked={includeUnscheduledStaff}
                      onCheckedChange={setIncludeUnscheduledStaff}
                    />
                  </div>
                </>
              )}

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Calendar Blocks</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow staff break blocks to be painted on the calendar and enforced in availability
                  </p>
                </div>
                <Switch
                  checked={enableCalendarBlocks}
                  onCheckedChange={handleEnableCalendarBlocksChange}
                />
              </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Settings</h3>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Payment settings are managed through your payment provider
                    configuration.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tyro Payment Terminal</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable Tyro payment terminal integration for card
                          payments
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
                              onChange={(e) =>
                                setTyroTerminalId(e.target.value)
                              }
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
                                  setTyroTerminalId("");
                                  toast({
                                    title: "Terminal unpaired",
                                    description:
                                      "The terminal has been unpaired successfully",
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
                <CardDescription>
                  Configure PIN requirements for sensitive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Refunds</Label>
                    <p className="text-sm text-muted-foreground">
                      Manager PIN required to process refunds
                    </p>
                  </div>
                  <Switch
                    checked={requirePinForRefunds}
                    onCheckedChange={setRequirePinForRefunds}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Cancellations</Label>
                    <p className="text-sm text-muted-foreground">
                      Staff PIN required to cancel bookings
                    </p>
                  </div>
                  <Switch
                    checked={requirePinForCancellations}
                    onCheckedChange={setRequirePinForCancellations}
                  />
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
                    onCheckedChange={setRequirePinForReports}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require PIN for Staff Creation</Label>
                    <p className="text-sm text-muted-foreground">
                      Make PIN mandatory when creating new staff members.
                      {requirePinForStaff
                        ? " PIN must be set during staff creation."
                        : " If disabled, a random PIN will be auto-generated."}
                    </p>
                  </div>
                  <Switch
                    checked={requirePinForStaff}
                    onCheckedChange={setRequirePinForStaff}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Staff PIN Lock Screen</Label>
                    <p className="text-sm text-muted-foreground">
                      Require staff to identify with their PIN before using the app on shared devices.
                      {staffPinLockEnabled
                        ? " Screen auto-locks after 60 seconds of inactivity."
                        : " Only applies to team member accounts (not owner login)."}
                    </p>
                    {staffPinLockError && (
                      <p className="text-sm text-red-500 mt-1">{staffPinLockError}</p>
                    )}
                  </div>
                  <Switch
                    checked={staffPinLockEnabled}
                    onCheckedChange={async (checked) => {
                      setStaffPinLockError(null);
                      if (checked) {
                        try {
                          const status = await apiClient.auth.getStaffPinStatus();
                          if (status.hasDuplicates) {
                            setStaffPinLockError("Resolve duplicate PINs in Staff settings before enabling.");
                            return;
                          }
                          if (!status.hasPins) {
                            setStaffPinLockError("No staff have PINs set. Configure PINs in Staff settings first.");
                            return;
                          }
                          setStaffPinLockEnabled(true);
                          queueAutoSave(
                            { staffPinLockEnabled: true },
                            { force: true },
                          );
                        } catch {
                          setStaffPinLockError("Failed to check staff PIN status. Please try again.");
                        }
                      } else {
                        setStaffPinLockEnabled(false);
                        queueAutoSave(
                          { staffPinLockEnabled: false },
                          { force: true },
                        );
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Levels</CardTitle>
                <CardDescription>
                  Define permissions for different staff roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Employee</h4>
                      <Badge variant="secondary">Level 1</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Can view their own bookings, process payments, manage
                      customers
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Manager</h4>
                      <Badge variant="secondary">Level 2</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All employee permissions plus: view reports, manage staff
                      schedules, process refunds
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Owner</h4>
                      <Badge variant="secondary">Level 3</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Full access to all features including settings, staff
                      management, and financial data
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
              <CardDescription>
                Configure how you and your customers receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!smsEnabled && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  SMS is not enabled on this account. Please contact the service provider.
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Customer Notifications
                </h3>
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
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <Switch
                        checked={bookingConfirmationSms}
                        onCheckedChange={setBookingConfirmationSms}
                        disabled={!smsEnabled}
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
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <Switch
                        checked={appointmentReminder24hSms}
                        onCheckedChange={setAppointmentReminder24hSms}
                        disabled={!smsEnabled}
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
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <Switch
                        checked={appointmentReminder2hSms}
                        onCheckedChange={setAppointmentReminder2hSms}
                        disabled={!smsEnabled}
                      />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Staff Notifications
                </h3>
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
                      <span className="text-sm text-muted-foreground">
                        Panel
                      </span>
                      <Switch
                        checked={newBookingNotificationEmail}
                        onCheckedChange={setNewBookingNotificationEmail}
                      />
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <Switch
                        checked={newBookingNotificationSms}
                        onCheckedChange={setNewBookingNotificationSms}
                        disabled={!smsEnabled}
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
                      <span className="text-sm text-muted-foreground">
                        Panel
                      </span>
                      <Switch
                        checked={cancellationNotificationEmail}
                        onCheckedChange={setCancellationNotificationEmail}
                      />
                      <span className="text-sm text-muted-foreground">
                        Email
                      </span>
                      <Switch
                        checked={cancellationNotificationSms}
                        onCheckedChange={setCancellationNotificationSms}
                        disabled={!smsEnabled}
                      />
                      <span className="text-sm text-muted-foreground">SMS</span>
                    </div>
                  </div>
                </div>
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
                  Bulk import customers from a CSV file. Download the template
                  to see the required format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <Label
                        htmlFor="customer-file"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Choose CSV file
                      </Label>
                      <Input
                        id="customer-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) =>
                          setCustomerFile(e.target.files?.[0] || null)
                        }
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
                      onValueChange={(value) =>
                        setCustomerDuplicateAction(value as "skip" | "update")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select how to handle duplicates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">
                          Update existing customers
                        </SelectItem>
                        <SelectItem value="skip">
                          Skip duplicate rows
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose whether rows that match an existing email or mobile
                      should update that customer or be skipped.
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
                          ? "Rows with validation errors are ignored."
                          : "Validation errors stop the import so you can fix them."}
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
                    <li>
                      • Optional columns include Email, Mobile Number, Phone,
                      Date of Birth, Gender, Address, Suburb, City, State,
                      Postal Code, Country, Referral Source, Note, Tags,
                      Preferred Language
                    </li>
                    <li>
                      • Use comma-separated values for tags (e.g., "vip,loyal")
                    </li>
                    <li>• Marketing opt-ins accept Yes/No/True/False</li>
                    <li>
                      • Customize duplicate handling and invalid-row behaviour
                      above before importing
                    </li>
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
                  Bulk import services from a CSV file. Download the template to
                  see the required format.
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
                      {lastImportResult.updated > 0 &&
                        `, updated ${lastImportResult.updated}`}
                      {lastImportResult.skipped > 0 &&
                        `, skipped ${lastImportResult.skipped}`}
                    </p>
                  </div>
                )}
                <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <Label
                        htmlFor="service-file"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Choose CSV file
                      </Label>
                      <Input
                        id="service-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) =>
                          setServiceFile(e.target.files?.[0] || null)
                        }
                      />
                    </div>
                    {serviceFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {serviceFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={downloadServiceTemplate}>
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
                    <li>
                      • Optional fields: Category, Description, Duration, Active
                      Status
                    </li>
                    <li>
                      • Duration can be left empty if price-to-duration ratio is
                      set
                    </li>
                    <li>
                      • Duration formats: 60, 90, 1h, 1.5h, 1h30m, "90 min"
                    </li>
                    <li>
                      • Categories will be created automatically if they don't
                      exist
                    </li>
                    <li>• Set active to "true" or "false" (default: true)</li>
                    <li>• Duplicate services will be skipped by default</li>
                    <li>
                      • Tax, deposit, and booking rules use your merchant
                      settings
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: After upload, you'll map your CSV columns to the
                    correct fields
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
                  Configure automatic duration calculation for services when
                  importing without duration values
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price-duration-ratio">
                      Price to Duration Ratio
                    </Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-sm text-muted-foreground">
                        $1 =
                      </span>
                      <Input
                        id="price-duration-ratio"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={priceToDurationRatio}
                        onChange={(e) =>
                          setPriceToDurationRatio(e.target.value)
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        minutes
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When importing services without duration, the system will
                      automatically calculate duration based on price. For
                      example, with a ratio of 1.0, a $60 service will be set to
                      60 minutes.
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <h4 className="font-medium">
                      Examples with current ratio ({priceToDurationRatio}):
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>
                        • $30 service →{" "}
                        {Math.round(30 * parseFloat(priceToDurationRatio))}{" "}
                        minutes
                      </li>
                      <li>
                        • $60 service →{" "}
                        {Math.round(60 * parseFloat(priceToDurationRatio))}{" "}
                        minutes
                      </li>
                      <li>
                        • $90 service →{" "}
                        {Math.round(90 * parseFloat(priceToDurationRatio))}{" "}
                        minutes
                      </li>
                      <li>
                        • $120 service →{" "}
                        {Math.round(120 * parseFloat(priceToDurationRatio))}{" "}
                        minutes
                      </li>
                    </ul>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {can("staff.view") && (
          <TabsContent value="team" className="space-y-6">
            <TeamTabContent merchant={merchant} />
          </TabsContent>
        )}

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription & Features
              </CardTitle>
              <CardDescription>
                View your current package and available features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {featuresLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : (
                <>
                  {/* Package Info */}
                  <div className="p-4 rounded-lg border bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {features?.packageName || "Standard"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Current subscription package
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        Active
                      </Badge>
                    </div>
                  </div>

                  {/* Features List */}
                  <div>
                    <h4 className="font-medium mb-4">Package Features</h4>
                    <div className="grid gap-3">
                      {modules?.map((module) => {
                        // Handle both API response formats (enabled/enabledFeatures)
                        const enabledList = (features as any)?.enabled || (features as any)?.enabledFeatures || [];
                        const disabledList = (features as any)?.disabled || (features as any)?.disabledFeatures || [];
                        const isEnabled = enabledList.includes(module.id);
                        const isDisabled = disabledList.includes(module.id);
                        const inPackage = features?.packageFeatures?.includes(module.id);

                        return (
                          <div
                            key={module.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isEnabled && !isDisabled
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{module.name}</span>
                                {inPackage && (
                                  <Badge variant="outline" className="text-xs">
                                    In Package
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {module.description}
                              </p>
                            </div>
                            <div className="ml-4">
                              {isEnabled && !isDisabled ? (
                                <Badge className="bg-green-600">Enabled</Badge>
                              ) : isDisabled ? (
                                <Badge variant="destructive">Disabled</Badge>
                              ) : (
                                <Badge variant="secondary">Not Available</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* User Permissions (for debugging) */}
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-4">Your Permissions</h4>
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">
                          {isOwner ? "Owner (Full Access)" : "Team Member"}
                        </span>
                      </div>
                      {isOwner ? (
                        <p className="text-sm text-muted-foreground">
                          You have full access to all features and settings.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {permissions?.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={overrideDialogOpen}
        onOpenChange={handleOverrideDialogOpenChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {overrideEditId
                ? "Edit Service Override"
                : "Add Service Override"}
            </DialogTitle>
            <DialogDescription>
              Set a custom booking window for a specific service. Leave fields
              within the merchant defaults to keep everything aligned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {overrideEditId ? (
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">
                  Service
                </Label>
                <p className="text-sm text-gray-900">
                  {editingOverrideService?.name || "Unknown service"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="override-service">Service</Label>
                <Select
                  value={overrideSelectedServiceId}
                  onValueChange={setOverrideSelectedServiceId}
                  disabled={availableServicesForOverride.length === 0}
                >
                  <SelectTrigger id="override-service">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServicesForOverride.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableServicesForOverride.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    All services already have overrides or none are available.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="override-max-days">
                  Maximum advance window (days)
                </Label>
                <Input
                  id="override-max-days"
                  type="number"
                  min={1}
                  max={bookingDefaults.maxDays}
                  value={overrideMaxDays}
                  onChange={(event) =>
                    setOverrideMaxDays(
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="override-min-hours">
                  Minimum notice (hours)
                </Label>
                <Input
                  id="override-min-hours"
                  type="number"
                  min={0}
                  value={overrideMinHours}
                  onChange={(event) =>
                    setOverrideMinHours(
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
                    )
                  }
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Merchant default: {bookingDefaults.maxDays} day
              {bookingDefaults.maxDays === 1 ? "" : "s"} ahead ·{" "}
              {bookingDefaults.minNoticeMinutes > 0
                ? `minimum notice ${bookingDefaults.minNoticeLabel}.`
                : "no minimum notice requirement."}
            </p>

            {overrideError && (
              <p className="text-sm text-red-600">{overrideError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOverrideDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitOverride}
              disabled={
                overrideSaving ||
                (availableServicesForOverride.length === 0 && !overrideEditId)
              }
            >
              {overrideSaving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : overrideEditId ? (
                "Update Override"
              ) : (
                "Save Override"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
