-- Add check-in related fields to Customer table
ALTER TABLE "Customer" 
ADD COLUMN IF NOT EXISTS "allergies" TEXT,
ADD COLUMN IF NOT EXISTS "specialRequirements" TEXT,
ADD COLUMN IF NOT EXISTS "referralSource" TEXT,
ADD COLUMN IF NOT EXISTS "lastCheckInAt" TIMESTAMP(3);

-- Add index on lastCheckInAt for querying recent check-ins
CREATE INDEX IF NOT EXISTS "Customer_lastCheckInAt_idx" ON "Customer"("lastCheckInAt");