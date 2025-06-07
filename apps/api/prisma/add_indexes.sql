-- Add performance indexes for PostgreSQL
-- Run this script in Supabase SQL Editor

-- Customer indexes for search performance
CREATE INDEX IF NOT EXISTS "Customer_firstName_idx" ON "Customer"("firstName");
CREATE INDEX IF NOT EXISTS "Customer_lastName_idx" ON "Customer"("lastName");

-- Service indexes for search performance
CREATE INDEX IF NOT EXISTS "Service_name_idx" ON "Service"("name");

-- Booking indexes for availability queries
CREATE INDEX IF NOT EXISTS "Booking_endTime_idx" ON "Booking"("endTime");

-- Payment indexes for financial reports
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "Booking_merchantId_startTime_idx" ON "Booking"("merchantId", "startTime");
CREATE INDEX IF NOT EXISTS "Booking_merchantId_endTime_idx" ON "Booking"("merchantId", "endTime");
CREATE INDEX IF NOT EXISTS "Customer_merchantId_email_idx" ON "Customer"("merchantId", "email");
CREATE INDEX IF NOT EXISTS "Customer_merchantId_mobile_idx" ON "Customer"("merchantId", "mobile");
CREATE INDEX IF NOT EXISTS "Service_merchantId_isActive_idx" ON "Service"("merchantId", "isActive");

-- Index for case-insensitive searches (PostgreSQL specific)
-- These use the lower() function for better performance on case-insensitive queries
CREATE INDEX IF NOT EXISTS "Customer_firstName_lower_idx" ON "Customer"(LOWER("firstName"));
CREATE INDEX IF NOT EXISTS "Customer_lastName_lower_idx" ON "Customer"(LOWER("lastName"));
CREATE INDEX IF NOT EXISTS "Customer_email_lower_idx" ON "Customer"(LOWER("email"));
CREATE INDEX IF NOT EXISTS "Service_name_lower_idx" ON "Service"(LOWER("name"));