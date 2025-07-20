-- Add orderId to LoyaltyTransaction table
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "orderId" TEXT;

-- Add foreign key constraint
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey" 
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");