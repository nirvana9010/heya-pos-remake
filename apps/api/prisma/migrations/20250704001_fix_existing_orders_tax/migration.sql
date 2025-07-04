-- Fix any remaining orders with tax calculations
-- This ensures all existing orders have GST-inclusive pricing

-- First, update any order items that still have tax
UPDATE "OrderItem" 
SET "taxRate" = 0.0, "taxAmount" = 0.0
WHERE "taxRate" > 0;

-- Recalculate order item totals (total = quantity * unitPrice - discount)
UPDATE "OrderItem"
SET "total" = ("quantity" * "unitPrice") - "discount";

-- Update order totals to remove tax
UPDATE "Order" o
SET 
  "subtotal" = (
    SELECT COALESCE(SUM(oi."total"), 0)
    FROM "OrderItem" oi
    WHERE oi."orderId" = o."id"
  ),
  "taxAmount" = 0.0;

-- Apply any existing modifiers to get the final total
UPDATE "Order" o
SET "totalAmount" = o."subtotal" + COALESCE((
  SELECT SUM(om."amount")
  FROM "OrderModifier" om
  WHERE om."orderId" = o."id"
), 0);

-- Update balance due for unpaid orders
UPDATE "Order" o
SET "balanceDue" = o."totalAmount" - o."paidAmount"
WHERE o."state" IN ('DRAFT', 'LOCKED', 'PENDING_PAYMENT', 'PARTIALLY_PAID');

-- Update any services that still have 10% tax rate
UPDATE "Service" SET "taxRate" = 0.0 WHERE "taxRate" = 0.1;