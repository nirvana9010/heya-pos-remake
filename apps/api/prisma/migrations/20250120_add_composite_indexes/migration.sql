-- Add composite indexes for common query patterns

-- Bookings queries (frequently filtered by merchant + status + date)
CREATE INDEX idx_booking_merchant_status_starttime ON "Booking" ("merchantId", "status", "startTime");
CREATE INDEX idx_booking_merchant_provider_starttime ON "Booking" ("merchantId", "providerId", "startTime");
CREATE INDEX idx_booking_merchant_customer_starttime ON "Booking" ("merchantId", "customerId", "startTime");

-- Customer queries (frequently searched by merchant + name/phone)
CREATE INDEX idx_customer_merchant_firstname_lastname ON "Customer" ("merchantId", "firstName", "lastName");
CREATE INDEX idx_customer_merchant_phone ON "Customer" ("merchantId", "phone");
CREATE INDEX idx_customer_merchant_status_createdat ON "Customer" ("merchantId", "status", "createdAt");

-- Service queries (frequently filtered by merchant + active status)
CREATE INDEX idx_service_merchant_isactive_displayorder ON "Service" ("merchantId", "isActive", "displayOrder");
CREATE INDEX idx_service_merchant_category_isactive ON "Service" ("merchantId", "categoryId", "isActive");

-- Staff queries (frequently filtered by merchant + status + location)
CREATE INDEX idx_staff_merchant_status_createdat ON "Staff" ("merchantId", "status", "createdAt");
CREATE INDEX idx_stafflocation_location_isprimary ON "StaffLocation" ("locationId", "isPrimary");

-- Order queries (frequently filtered by merchant + state + date)
CREATE INDEX idx_order_merchant_state_createdat ON "Order" ("merchantId", "state", "createdAt");
CREATE INDEX idx_order_merchant_customer_createdat ON "Order" ("merchantId", "customerId", "createdAt");

-- Payment queries (frequently filtered by merchant + status + date)
CREATE INDEX idx_payment_merchant_status_createdat ON "Payment" ("merchantId", "status", "createdAt");
CREATE INDEX idx_payment_invoice_status ON "Payment" ("invoiceId", "status");

-- Invoice queries (frequently filtered by merchant + status + date)
CREATE INDEX idx_invoice_merchant_status_createdat ON "Invoice" ("merchantId", "status", "createdAt");
CREATE INDEX idx_invoice_merchant_customer_createdat ON "Invoice" ("merchantId", "customerId", "createdAt");

-- Loyalty queries (frequently filtered by merchant + customer)
CREATE INDEX idx_loyaltytransaction_merchant_customer_createdat ON "LoyaltyTransaction" ("merchantId", "customerId", "createdAt");
CREATE INDEX idx_loyaltycard_program_status ON "LoyaltyCard" ("programId", "status");

-- Audit log queries (frequently filtered by merchant + date range)
CREATE INDEX idx_auditlog_merchant_timestamp ON "AuditLog" ("merchantId", "timestamp");
CREATE INDEX idx_auditlog_merchant_action_timestamp ON "AuditLog" ("merchantId", "action", "timestamp");

-- OutboxEvent queries (for event processing)
CREATE INDEX idx_outboxevent_processedat_createdat ON "OutboxEvent" ("processedAt", "createdAt");