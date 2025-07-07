-- Create StaffSchedule table
CREATE TABLE IF NOT EXISTS "StaffSchedule" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "staffId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "StaffSchedule_staffId_locationId_dayOfWeek_key" ON "StaffSchedule"("staffId", "locationId", "dayOfWeek");

-- Create indexes
CREATE INDEX IF NOT EXISTS "StaffSchedule_staffId_idx" ON "StaffSchedule"("staffId");
CREATE INDEX IF NOT EXISTS "StaffSchedule_locationId_idx" ON "StaffSchedule"("locationId");
CREATE INDEX IF NOT EXISTS "StaffSchedule_dayOfWeek_idx" ON "StaffSchedule"("dayOfWeek");

-- Add foreign keys
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_locationId_fkey" 
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_staffId_fkey" 
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;