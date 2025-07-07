-- Drop existing StaffSchedule table and recreate without locationId
DROP TABLE IF EXISTS "StaffSchedule";

-- Create simplified StaffSchedule table
CREATE TABLE "StaffSchedule" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "StaffSchedule_staffId_dayOfWeek_key" ON "StaffSchedule"("staffId", "dayOfWeek");

-- Create indexes
CREATE INDEX "StaffSchedule_staffId_idx" ON "StaffSchedule"("staffId");
CREATE INDEX "StaffSchedule_dayOfWeek_idx" ON "StaffSchedule"("dayOfWeek");

-- Add foreign key
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_staffId_fkey" 
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;