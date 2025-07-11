-- Make locationId optional in all tables
ALTER TABLE "Booking" ALTER COLUMN "locationId" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "locationId" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "locationId" DROP NOT NULL;

-- Add comment to indicate these are optional now
COMMENT ON COLUMN "Booking"."locationId" IS 'Optional - Location support is deprecated';
COMMENT ON COLUMN "Order"."locationId" IS 'Optional - Location support is deprecated';
COMMENT ON COLUMN "Payment"."locationId" IS 'Optional - Location support is deprecated';