-- Make email field optional for Staff table
-- First drop the unique constraint/index
DROP INDEX IF EXISTS "Staff_email_key";

-- Make the email column nullable
ALTER TABLE "Staff" ALTER COLUMN "email" DROP NOT NULL;

-- Add a new unique constraint that allows null values
-- PostgreSQL treats NULL values as distinct in unique constraints
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email") WHERE "email" IS NOT NULL;