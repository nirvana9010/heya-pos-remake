-- Enable btree_gist extension for EXCLUDE constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add padding fields to Service model
ALTER TABLE "Service" 
ADD COLUMN "paddingBefore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "paddingAfter" INTEGER NOT NULL DEFAULT 0;

-- Add override fields to Booking model
ALTER TABLE "Booking" 
ADD COLUMN "isOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "overrideReason" TEXT,
ADD COLUMN "overrideApprovedBy" TEXT;

-- Add index for staff availability queries
CREATE INDEX "Booking_providerId_startTime_endTime_idx" 
ON "Booking"("providerId", "startTime", "endTime") 
WHERE "status" NOT IN ('CANCELLED', 'NO_SHOW');

-- Add composite index for efficient availability checks
CREATE INDEX "Booking_providerId_status_startTime_idx" 
ON "Booking"("providerId", "status", "startTime") 
WHERE "status" IN ('CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS');

-- Comment on the columns for documentation
COMMENT ON COLUMN "Service"."paddingBefore" IS 'Minutes needed before service starts (e.g., setup time)';
COMMENT ON COLUMN "Service"."paddingAfter" IS 'Minutes needed after service ends (e.g., cleanup time)';
COMMENT ON COLUMN "Booking"."isOverride" IS 'Whether this booking was forced by staff despite conflicts';
COMMENT ON COLUMN "Booking"."overrideReason" IS 'Reason provided by staff for forcing the booking';
COMMENT ON COLUMN "Booking"."overrideApprovedBy" IS 'Staff ID who approved the override';