-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 30,
    "maxLocations" INTEGER NOT NULL,
    "maxStaff" INTEGER NOT NULL,
    "maxCustomers" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "abn" TEXT,
    "subdomain" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "subscriptionEnds" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MerchantAuth" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "businessHours" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Staff" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "pin" TEXT,
    "accessLevel" INTEGER NOT NULL DEFAULT 1,
    "calendarColor" TEXT,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StaffLocation" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StaffSchedule" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "suburb" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "notes" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'WALK_IN',
    "loyaltyPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "loyaltyVisits" INTEGER NOT NULL DEFAULT 0,
    "lifetimeVisits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreference" TEXT NOT NULL DEFAULT 'both',
    "smsNotifications" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(10,2),
    "maxAdvanceBooking" INTEGER NOT NULL DEFAULT 90,
    "minAdvanceBooking" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paddingBefore" INTEGER NOT NULL DEFAULT 0,
    "paddingAfter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceCategory" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "locationId" TEXT,
    "customerId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ONLINE',
    "createdById" TEXT NOT NULL,
    "providerId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overrideApprovedBy" TEXT,
    "customerRequestedStaff" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookingService" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
    "merchantId" VARCHAR(255) NOT NULL,
    "locationId" VARCHAR(255),
    "customerId" VARCHAR(255),
    "bookingId" VARCHAR(255),
    "orderNumber" VARCHAR(255) NOT NULL,
    "state" VARCHAR(255) NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "createdById" VARCHAR(255) NOT NULL,
    "lockedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "cancelledAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
    "orderId" VARCHAR(255) NOT NULL,
    "itemType" VARCHAR(255) NOT NULL,
    "itemId" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "staffId" VARCHAR(255),
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderModifier" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
    "orderId" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "subtype" VARCHAR(255),
    "calculation" VARCHAR(255) NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliesTo" TEXT[],

    CONSTRAINT "OrderModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderPayment" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
    "orderId" VARCHAR(255) NOT NULL,
    "paymentMethod" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "tipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    "reference" VARCHAR(255),
    "gatewayResponse" JSONB,
    "processedById" VARCHAR(255),
    "processedAt" TIMESTAMP(6),
    "failedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "refundReason" TEXT,
    "refundedAmount" DECIMAL(10,2) DEFAULT 0,
    "refundedAt" TIMESTAMP(6),

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TipAllocation" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid(),
    "orderPaymentId" VARCHAR(255) NOT NULL,
    "staffId" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.1,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "locationId" TEXT,
    "invoiceId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "stripePaymentIntentId" TEXT,
    "tyroTransactionId" TEXT,
    "processorResponse" JSONB,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'POINTS',
    "visitsRequired" INTEGER,
    "visitRewardType" TEXT,
    "visitRewardValue" DECIMAL(10,2),
    "pointsPerVisit" DECIMAL(10,2),
    "pointsPerDollar" DECIMAL(10,2) DEFAULT 1,
    "pointsPerCurrency" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "rewardThreshold" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "rewardValue" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "pointsValue" DECIMAL(10,4) NOT NULL DEFAULT 0.01,
    "expiryDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyTier" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiredPoints" DECIMAL(10,2) NOT NULL,
    "multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "benefits" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyCard" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tierId" TEXT,
    "cardNumber" TEXT NOT NULL,
    "points" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lifetimePoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "cardId" TEXT,
    "customerId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "visitsDelta" INTEGER NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "bookingId" TEXT,
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "merchantId" TEXT NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyReminderTouchpoint" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "thresholdValue" DECIMAL(10,2) NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "smsBody" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReminderTouchpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyReminderState" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "lastTouchpointSent" INTEGER NOT NULL DEFAULT 0,
    "lastValueSnapshot" DECIMAL(10,2),
    "lastRedeemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReminderState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledNotification" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MerchantNotification" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduleOverride" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "public"."Package"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "public"."Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_subdomain_key" ON "public"."Merchant"("subdomain");

-- CreateIndex
CREATE INDEX "Merchant_status_idx" ON "public"."Merchant"("status");

-- CreateIndex
CREATE INDEX "Merchant_email_idx" ON "public"."Merchant"("email");

-- CreateIndex
CREATE INDEX "Merchant_subdomain_idx" ON "public"."Merchant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantAuth_merchantId_key" ON "public"."MerchantAuth"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantAuth_username_key" ON "public"."MerchantAuth"("username");

-- CreateIndex
CREATE INDEX "MerchantAuth_username_idx" ON "public"."MerchantAuth"("username");

-- CreateIndex
CREATE INDEX "Location_merchantId_idx" ON "public"."Location"("merchantId");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "public"."Location"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Location_merchantId_name_key" ON "public"."Location"("merchantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "public"."Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_merchantId_idx" ON "public"."Staff"("merchantId");

-- CreateIndex
CREATE INDEX "Staff_email_idx" ON "public"."Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_pin_idx" ON "public"."Staff"("pin");

-- CreateIndex
CREATE INDEX "Staff_status_idx" ON "public"."Staff"("status");

-- CreateIndex
CREATE INDEX "StaffLocation_staffId_idx" ON "public"."StaffLocation"("staffId");

-- CreateIndex
CREATE INDEX "StaffLocation_locationId_idx" ON "public"."StaffLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLocation_staffId_locationId_key" ON "public"."StaffLocation"("staffId", "locationId");

-- CreateIndex
CREATE INDEX "StaffSchedule_staffId_idx" ON "public"."StaffSchedule"("staffId");

-- CreateIndex
CREATE INDEX "StaffSchedule_dayOfWeek_idx" ON "public"."StaffSchedule"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSchedule_staffId_dayOfWeek_key" ON "public"."StaffSchedule"("staffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Customer_merchantId_idx" ON "public"."Customer"("merchantId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "public"."Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_mobile_idx" ON "public"."Customer"("mobile");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "public"."Customer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_merchantId_email_key" ON "public"."Customer"("merchantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_merchantId_mobile_key" ON "public"."Customer"("merchantId", "mobile");

-- CreateIndex
CREATE INDEX "Service_merchantId_idx" ON "public"."Service"("merchantId");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "public"."Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "public"."Service"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_merchantId_name_key" ON "public"."Service"("merchantId", "name");

-- CreateIndex
CREATE INDEX "ServiceCategory_merchantId_idx" ON "public"."ServiceCategory"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_merchantId_name_key" ON "public"."ServiceCategory"("merchantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "public"."Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_merchantId_idx" ON "public"."Booking"("merchantId");

-- CreateIndex
CREATE INDEX "Booking_locationId_idx" ON "public"."Booking"("locationId");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "public"."Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_providerId_idx" ON "public"."Booking"("providerId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "public"."Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_startTime_idx" ON "public"."Booking"("startTime");

-- CreateIndex
CREATE INDEX "Booking_bookingNumber_idx" ON "public"."Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "public"."Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Booking_deletedAt_idx" ON "public"."Booking"("deletedAt");

-- CreateIndex
CREATE INDEX "BookingService_bookingId_idx" ON "public"."BookingService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingService_serviceId_idx" ON "public"."BookingService"("serviceId");

-- CreateIndex
CREATE INDEX "BookingService_staffId_idx" ON "public"."BookingService"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_bookingId_key" ON "public"."Order"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_merchantId_idx" ON "public"."Order"("merchantId");

-- CreateIndex
CREATE INDEX "Order_merchantId_state_idx" ON "public"."Order"("merchantId", "state");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_bookingId_idx" ON "public"."Order"("bookingId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderModifier_orderId_idx" ON "public"."OrderModifier"("orderId");

-- CreateIndex
CREATE INDEX "OrderPayment_orderId_idx" ON "public"."OrderPayment"("orderId");

-- CreateIndex
CREATE INDEX "OrderPayment_orderId_status_idx" ON "public"."OrderPayment"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_bookingId_key" ON "public"."Invoice"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_merchantId_idx" ON "public"."Invoice"("merchantId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "public"."Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "public"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_merchantId_idx" ON "public"."Payment"("merchantId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "public"."Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paymentMethod_idx" ON "public"."Payment"("paymentMethod");

-- CreateIndex
CREATE INDEX "PaymentRefund_paymentId_idx" ON "public"."PaymentRefund"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentRefund_status_idx" ON "public"."PaymentRefund"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyProgram_merchantId_key" ON "public"."LoyaltyProgram"("merchantId");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_merchantId_idx" ON "public"."LoyaltyProgram"("merchantId");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_isActive_idx" ON "public"."LoyaltyProgram"("isActive");

-- CreateIndex
CREATE INDEX "LoyaltyTier_programId_idx" ON "public"."LoyaltyTier"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTier_programId_name_key" ON "public"."LoyaltyTier"("programId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_cardNumber_key" ON "public"."LoyaltyCard"("cardNumber");

-- CreateIndex
CREATE INDEX "LoyaltyCard_programId_idx" ON "public"."LoyaltyCard"("programId");

-- CreateIndex
CREATE INDEX "LoyaltyCard_customerId_idx" ON "public"."LoyaltyCard"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyCard_cardNumber_idx" ON "public"."LoyaltyCard"("cardNumber");

-- CreateIndex
CREATE INDEX "LoyaltyCard_status_idx" ON "public"."LoyaltyCard"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_programId_customerId_key" ON "public"."LoyaltyCard"("programId", "customerId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_cardId_idx" ON "public"."LoyaltyTransaction"("cardId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_customerId_idx" ON "public"."LoyaltyTransaction"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_merchantId_idx" ON "public"."LoyaltyTransaction"("merchantId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_type_idx" ON "public"."LoyaltyTransaction"("type");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "public"."LoyaltyTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_merchantId_idx" ON "public"."AuditLog"("merchantId");

-- CreateIndex
CREATE INDEX "AuditLog_staffId_idx" ON "public"."AuditLog"("staffId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_idx" ON "public"."OutboxEvent"("processedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "public"."OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateId_aggregateType_idx" ON "public"."OutboxEvent"("aggregateId", "aggregateType");

-- CreateIndex
CREATE INDEX "OutboxEvent_merchantId_idx" ON "public"."OutboxEvent"("merchantId");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_retryCount_idx" ON "public"."OutboxEvent"("processedAt", "retryCount");

-- CreateIndex
CREATE INDEX "NotificationLog_merchantId_idx" ON "public"."NotificationLog"("merchantId");

-- CreateIndex
CREATE INDEX "NotificationLog_customerId_idx" ON "public"."NotificationLog"("customerId");

-- CreateIndex
CREATE INDEX "NotificationLog_bookingId_idx" ON "public"."NotificationLog"("bookingId");

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "public"."NotificationLog"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "public"."NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_sentAt_idx" ON "public"."NotificationLog"("sentAt");

-- CreateIndex
CREATE INDEX "LoyaltyReminderTouchpoint_merchantId_sequence_idx" ON "public"."LoyaltyReminderTouchpoint"("merchantId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReminderTouchpoint_merchantId_sequence_key" ON "public"."LoyaltyReminderTouchpoint"("merchantId", "sequence");

-- CreateIndex
CREATE INDEX "LoyaltyReminderState_merchantId_idx" ON "public"."LoyaltyReminderState"("merchantId");

-- CreateIndex
CREATE INDEX "LoyaltyReminderState_customerId_idx" ON "public"."LoyaltyReminderState"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReminderState_merchantId_customerId_key" ON "public"."LoyaltyReminderState"("merchantId", "customerId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_bookingId_idx" ON "public"."ScheduledNotification"("bookingId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_status_idx" ON "public"."ScheduledNotification"("status");

-- CreateIndex
CREATE INDEX "ScheduledNotification_scheduledFor_idx" ON "public"."ScheduledNotification"("scheduledFor");

-- CreateIndex
CREATE INDEX "MerchantNotification_merchantId_idx" ON "public"."MerchantNotification"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantNotification_read_idx" ON "public"."MerchantNotification"("read");

-- CreateIndex
CREATE INDEX "MerchantNotification_type_idx" ON "public"."MerchantNotification"("type");

-- CreateIndex
CREATE INDEX "MerchantNotification_createdAt_idx" ON "public"."MerchantNotification"("createdAt");

-- CreateIndex
CREATE INDEX "ScheduleOverride_staffId_idx" ON "public"."ScheduleOverride"("staffId");

-- CreateIndex
CREATE INDEX "ScheduleOverride_date_idx" ON "public"."ScheduleOverride"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleOverride_staffId_date_key" ON "public"."ScheduleOverride"("staffId", "date");

-- AddForeignKey
ALTER TABLE "public"."Merchant" ADD CONSTRAINT "Merchant_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantAuth" ADD CONSTRAINT "MerchantAuth_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Staff" ADD CONSTRAINT "Staff_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffLocation" ADD CONSTRAINT "StaffLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffLocation" ADD CONSTRAINT "StaffLocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffSchedule" ADD CONSTRAINT "StaffSchedule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingService" ADD CONSTRAINT "BookingService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderModifier" ADD CONSTRAINT "OrderModifier_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPayment" ADD CONSTRAINT "OrderPayment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "public"."Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TipAllocation" ADD CONSTRAINT "TipAllocation_orderPaymentId_fkey" FOREIGN KEY ("orderPaymentId") REFERENCES "public"."OrderPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TipAllocation" ADD CONSTRAINT "TipAllocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "public"."LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."LoyaltyCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "public"."Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutboxEvent" ADD CONSTRAINT "OutboxEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationLog" ADD CONSTRAINT "NotificationLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationLog" ADD CONSTRAINT "NotificationLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationLog" ADD CONSTRAINT "NotificationLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyReminderTouchpoint" ADD CONSTRAINT "LoyaltyReminderTouchpoint_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyReminderState" ADD CONSTRAINT "LoyaltyReminderState_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyReminderState" ADD CONSTRAINT "LoyaltyReminderState_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantNotification" ADD CONSTRAINT "MerchantNotification_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduleOverride" ADD CONSTRAINT "ScheduleOverride_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
