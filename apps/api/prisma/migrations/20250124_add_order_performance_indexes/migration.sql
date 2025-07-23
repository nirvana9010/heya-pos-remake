-- Add performance indexes for Order tables

-- Order table indexes
CREATE INDEX IF NOT EXISTS "Order_merchantId_idx" ON "Order"("merchantId");
CREATE INDEX IF NOT EXISTS "Order_merchantId_state_idx" ON "Order"("merchantId", "state");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_bookingId_idx" ON "Order"("bookingId");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

-- OrderItem table indexes
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- OrderModifier table indexes
CREATE INDEX IF NOT EXISTS "OrderModifier_orderId_idx" ON "OrderModifier"("orderId");

-- OrderPayment table indexes
CREATE INDEX IF NOT EXISTS "OrderPayment_orderId_idx" ON "OrderPayment"("orderId");
CREATE INDEX IF NOT EXISTS "OrderPayment_orderId_status_idx" ON "OrderPayment"("orderId", "status");