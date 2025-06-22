-- Make providerId optional to support unassigned bookings
ALTER TABLE "Booking" ALTER COLUMN "providerId" DROP NOT NULL;