-- Update all existing services to have GST-inclusive pricing (taxRate = 0)
UPDATE "Service" SET "taxRate" = 0.0 WHERE "taxRate" = 0.1;

-- Update all existing order items to have GST-inclusive pricing (taxRate = 0)
UPDATE "OrderItem" SET "taxRate" = 0.0 WHERE "taxRate" = 0.1;

-- Recalculate tax amounts to 0 for existing order items
UPDATE "OrderItem" SET "taxAmount" = 0.0;

-- Recalculate order totals (set tax to 0 and total = subtotal)
UPDATE "Order" SET "taxAmount" = 0.0, "totalAmount" = "subtotal";

-- Update balance due for unpaid orders
UPDATE "Order" 
SET "balanceDue" = "totalAmount" - "paidAmount" 
WHERE "state" IN ('DRAFT', 'LOCKED', 'PENDING_PAYMENT', 'PARTIALLY_PAID');