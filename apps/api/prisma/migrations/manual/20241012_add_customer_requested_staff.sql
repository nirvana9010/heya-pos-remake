-- Adds the customerRequestedStaff flag so we can track when customers pick a specific staff member online
ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "customerRequestedStaff" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows explicitly to avoid relying on the new default for historical data
UPDATE "Booking" SET "customerRequestedStaff" = false WHERE "customerRequestedStaff" IS NULL;
