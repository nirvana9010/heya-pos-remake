export const CURRENCIES = {
  AUD: { code: "AUD", symbol: "$", name: "Australian Dollar" },
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  NZD: { code: "NZD", symbol: "$", name: "New Zealand Dollar" },
} as const;

export const TIMEZONES = {
  "Australia/Sydney": "Sydney",
  "Australia/Melbourne": "Melbourne",
  "Australia/Brisbane": "Brisbane",
  "Australia/Perth": "Perth",
  "Australia/Adelaide": "Adelaide",
  "Australia/Hobart": "Hobart",
  "Australia/Darwin": "Darwin",
} as const;

export const AUSTRALIAN_STATES = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  SA: "South Australia",
  WA: "Western Australia",
  TAS: "Tasmania",
  NT: "Northern Territory",
  ACT: "Australian Capital Territory",
} as const;

export const SLOT_DURATIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
] as const;

export const BOOKING_STATUSES = {
  PENDING: { value: "PENDING", label: "Pending", color: "yellow" },
  CONFIRMED: { value: "CONFIRMED", label: "Confirmed", color: "blue" },
  CHECKED_IN: { value: "CHECKED_IN", label: "Checked In", color: "green" },
  IN_PROGRESS: { value: "IN_PROGRESS", label: "In Progress", color: "purple" },
  COMPLETED: { value: "COMPLETED", label: "Completed", color: "gray" },
  CANCELLED: { value: "CANCELLED", label: "Cancelled", color: "red" },
  NO_SHOW: { value: "NO_SHOW", label: "No Show", color: "orange" },
} as const;

export const PAYMENT_METHODS = {
  CASH: { value: "CASH", label: "Cash", icon: "banknote" },
  CARD: { value: "CARD", label: "Card", icon: "credit-card" },
  BANK_TRANSFER: {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: "building",
  },
  DIGITAL_WALLET: {
    value: "DIGITAL_WALLET",
    label: "Digital Wallet",
    icon: "smartphone",
  },
} as const;

export const STAFF_PERMISSIONS = {
  // Booking permissions
  BOOKING_VIEW: "booking.view",
  BOOKING_CREATE: "booking.create",
  BOOKING_UPDATE: "booking.update",
  BOOKING_CANCEL: "booking.cancel",
  BOOKING_DELETE: "booking.delete",

  // Customer permissions
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_UPDATE: "customer.update",
  CUSTOMER_DELETE: "customer.delete",

  // Payment permissions
  PAYMENT_VIEW: "payment.view",
  PAYMENT_PROCESS: "payment.process",
  PAYMENT_REFUND: "payment.refund",

  // Service permissions
  SERVICE_VIEW: "service.view",
  SERVICE_CREATE: "service.create",
  SERVICE_UPDATE: "service.update",
  SERVICE_DELETE: "service.delete",

  // Staff permissions
  STAFF_VIEW: "staff.view",
  STAFF_CREATE: "staff.create",
  STAFF_UPDATE: "staff.update",
  STAFF_DELETE: "staff.delete",

  // Report permissions
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",

  // Settings permissions
  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",
} as const;

export const DEFAULT_PERMISSIONS_BY_ROLE = {
  OWNER: Object.values(STAFF_PERMISSIONS),
  ADMIN: Object.values(STAFF_PERMISSIONS),
  MANAGER: [
    STAFF_PERMISSIONS.BOOKING_VIEW,
    STAFF_PERMISSIONS.BOOKING_CREATE,
    STAFF_PERMISSIONS.BOOKING_UPDATE,
    STAFF_PERMISSIONS.BOOKING_CANCEL,
    STAFF_PERMISSIONS.CUSTOMER_VIEW,
    STAFF_PERMISSIONS.CUSTOMER_CREATE,
    STAFF_PERMISSIONS.CUSTOMER_UPDATE,
    STAFF_PERMISSIONS.PAYMENT_VIEW,
    STAFF_PERMISSIONS.PAYMENT_PROCESS,
    STAFF_PERMISSIONS.SERVICE_VIEW,
    STAFF_PERMISSIONS.STAFF_VIEW,
    STAFF_PERMISSIONS.REPORT_VIEW,
    STAFF_PERMISSIONS.SETTINGS_VIEW,
  ],
  STAFF: [
    STAFF_PERMISSIONS.BOOKING_VIEW,
    STAFF_PERMISSIONS.BOOKING_CREATE,
    STAFF_PERMISSIONS.BOOKING_UPDATE,
    STAFF_PERMISSIONS.CUSTOMER_VIEW,
    STAFF_PERMISSIONS.CUSTOMER_CREATE,
    STAFF_PERMISSIONS.PAYMENT_VIEW,
    STAFF_PERMISSIONS.PAYMENT_PROCESS,
    STAFF_PERMISSIONS.SERVICE_VIEW,
  ],
} as const;

export const PACKAGE_FEATURES = {
  BASIC: {
    maxLocations: 1,
    maxStaff: 3,
    maxCustomers: 500,
    features: ["basic_booking", "basic_pos", "email_support"],
  },
  PROFESSIONAL: {
    maxLocations: 2,
    maxStaff: 10,
    maxCustomers: 2000,
    features: [
      "advanced_booking",
      "full_pos",
      "loyalty_program",
      "priority_support",
    ],
  },
  ENTERPRISE: {
    maxLocations: 5,
    maxStaff: 50,
    maxCustomers: 10000,
    features: [
      "multi_location",
      "api_access",
      "custom_integrations",
      "dedicated_support",
    ],
  },
} as const;

export const PIN_PROTECTED_ACTIONS = [
  "booking.cancel",
  "payment.refund",
  "appointment.modify_past",
  "report.access",
  "staff.manage",
] as const;

export const DEFAULT_BUSINESS_HOURS = {
  monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
  saturday: { isOpen: true, openTime: "09:00", closeTime: "14:00" },
  sunday: { isOpen: false },
} as const;
