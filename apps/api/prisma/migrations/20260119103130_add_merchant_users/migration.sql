-- CreateTable
CREATE TABLE "public"."MerchantUser" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MerchantRole" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MerchantUserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "MerchantUserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUser_inviteToken_key" ON "public"."MerchantUser"("inviteToken");

-- CreateIndex
CREATE INDEX "MerchantUser_merchantId_idx" ON "public"."MerchantUser"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantUser_email_idx" ON "public"."MerchantUser"("email");

-- CreateIndex
CREATE INDEX "MerchantUser_status_idx" ON "public"."MerchantUser"("status");

-- CreateIndex
CREATE INDEX "MerchantUser_inviteToken_idx" ON "public"."MerchantUser"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUser_merchantId_email_key" ON "public"."MerchantUser"("merchantId", "email");

-- CreateIndex
CREATE INDEX "MerchantRole_merchantId_idx" ON "public"."MerchantRole"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantRole_isSystem_idx" ON "public"."MerchantRole"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantRole_merchantId_name_key" ON "public"."MerchantRole"("merchantId", "name");

-- CreateIndex
CREATE INDEX "MerchantUserLocation_userId_idx" ON "public"."MerchantUserLocation"("userId");

-- CreateIndex
CREATE INDEX "MerchantUserLocation_locationId_idx" ON "public"."MerchantUserLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUserLocation_userId_locationId_key" ON "public"."MerchantUserLocation"("userId", "locationId");

-- AddForeignKey
ALTER TABLE "public"."MerchantUser" ADD CONSTRAINT "MerchantUser_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantUser" ADD CONSTRAINT "MerchantUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."MerchantRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantRole" ADD CONSTRAINT "MerchantRole_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantUserLocation" ADD CONSTRAINT "MerchantUserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."MerchantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantUserLocation" ADD CONSTRAINT "MerchantUserLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
