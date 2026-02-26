/*
  Warnings:

  - The primary key for the `StaffAvailabilityBlock` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `StaffAvailabilityBlock` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."StaffAvailabilityBlock" DROP CONSTRAINT "StaffAvailabilityBlock_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3),
ADD CONSTRAINT "StaffAvailabilityBlock_pkey" PRIMARY KEY ("id");
