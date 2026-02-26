DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'HolidaySource'
    ) THEN
        CREATE TYPE "HolidaySource" AS ENUM ('STATE', 'CUSTOM');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MerchantHoliday" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isDayOff" BOOLEAN NOT NULL DEFAULT true,
    "source" "HolidaySource" NOT NULL DEFAULT 'STATE',
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MerchantHoliday_merchantId_date_key" ON "MerchantHoliday"("merchantId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MerchantHoliday_merchantId_state_idx" ON "MerchantHoliday"("merchantId", "state");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'MerchantHoliday_merchantId_fkey'
    ) THEN
        ALTER TABLE "MerchantHoliday"
        ADD CONSTRAINT "MerchantHoliday_merchantId_fkey"
        FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
