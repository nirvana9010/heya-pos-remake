# Payment Method Migration Guide

## Overview
This migration updates the payment method values from provider-specific card types (CARD_TYRO, CARD_STRIPE, CARD_MANUAL) to a generic CARD type.

## Migration Steps

1. **Backup your database** before running any migrations

2. **Run the SQL migration**:
   ```bash
   psql $DATABASE_URL -f update_card_payment_method.sql
   ```

3. **Verify the changes**:
   ```sql
   -- Check OrderPayment table
   SELECT DISTINCT method FROM "OrderPayment" WHERE method LIKE 'CARD%';
   
   -- Check Payment table
   SELECT DISTINCT method FROM "Payment" WHERE method LIKE 'CARD%';
   ```

4. **Expected result**: All card payment methods should now be 'CARD'

## Rollback (if needed)

To rollback this migration, you would need to:
1. Restore from backup, OR
2. Manually update records back to their original values (not recommended as you'd need to know which provider each payment originally used)

## Notes

- This migration consolidates all card payment types into a single 'CARD' type
- The payment provider information is now handled separately by the payment gateway configuration
- This change makes the system more flexible for adding new payment providers in the future