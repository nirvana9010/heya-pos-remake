-- Create StaffAvailabilityBlock to store ad-hoc calendar blocks for staff
CREATE TABLE "StaffAvailabilityBlock" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "merchantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ NOT NULL,
    "locationId" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "StaffAvailabilityBlock_start_before_end" CHECK ("startTime" < "endTime"),
    CONSTRAINT "StaffAvailabilityBlock_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAvailabilityBlock_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAvailabilityBlock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StaffAvailabilityBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "StaffAvailabilityBlock_merchant_staff_start_idx"
  ON "StaffAvailabilityBlock" ("merchantId", "staffId", "startTime");

CREATE INDEX "StaffAvailabilityBlock_merchant_start_idx"
  ON "StaffAvailabilityBlock" ("merchantId", "startTime");

CREATE INDEX "StaffAvailabilityBlock_location_start_idx"
  ON "StaffAvailabilityBlock" ("locationId", "startTime");
