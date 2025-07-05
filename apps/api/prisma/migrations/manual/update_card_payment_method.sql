-- Update CARD_TYRO to CARD in OrderPayment table
UPDATE "OrderPayment" 
SET method = 'CARD' 
WHERE method = 'CARD_TYRO';

-- Update CARD_STRIPE to CARD in OrderPayment table
UPDATE "OrderPayment" 
SET method = 'CARD' 
WHERE method = 'CARD_STRIPE';

-- Update CARD_MANUAL to CARD in OrderPayment table
UPDATE "OrderPayment" 
SET method = 'CARD' 
WHERE method = 'CARD_MANUAL';

-- Update CARD_TYRO to CARD in Payment table (if exists)
UPDATE "Payment" 
SET method = 'CARD' 
WHERE method = 'CARD_TYRO';

-- Update CARD_STRIPE to CARD in Payment table (if exists)
UPDATE "Payment" 
SET method = 'CARD' 
WHERE method = 'CARD_STRIPE';

-- Update CARD_MANUAL to CARD in Payment table (if exists)
UPDATE "Payment" 
SET method = 'CARD' 
WHERE method = 'CARD_MANUAL';

-- Update any other tables that might have payment method columns
-- Note: Run this migration manually after verifying which tables need updates