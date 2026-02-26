/*
  Warnings:

  - The primary key for the `StaffAvailabilityBlock` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "public"."StaffAvailabilityBlock" DROP CONSTRAINT "StaffAvailabilityBlock_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "StaffAvailabilityBlock_pkey" PRIMARY KEY ("id");

-- RenameIndex
ALTER INDEX "public"."StaffAvailabilityBlock_location_start_idx" RENAME TO "StaffAvailabilityBlock_locationId_startTime_idx";

-- RenameIndex
ALTER INDEX "public"."StaffAvailabilityBlock_merchant_staff_start_idx" RENAME TO "StaffAvailabilityBlock_merchantId_staffId_startTime_idx";

-- RenameIndex
ALTER INDEX "public"."StaffAvailabilityBlock_merchant_start_idx" RENAME TO "StaffAvailabilityBlock_merchantId_startTime_idx";
