# Manual Migration Scripts

This directory holds raw SQL migrations that must be applied manually whenever the Prisma schema changes. Run them against the relevant environment **before** deploying code that depends on the new structure.

## 2024-10-12 – Add `customerRequestedStaff` flag to bookings

Adds a boolean flag so the platform can tell when an online booking explicitly selected a staff member.

1. Back up your database.
2. Execute the script:
   ```bash
   psql "$DATABASE_URL" -f 20241012_add_customer_requested_staff.sql
   ```
3. No rollback script is provided; restore from backup if needed.

## Payment method normalisation

`update_card_payment_method.sql` consolidates legacy card method values into a single `CARD` type.

1. Back up your database.
2. Run:
   ```bash
   psql "$DATABASE_URL" -f update_card_payment_method.sql
   ```
3. Verify:
   ```sql
   SELECT DISTINCT method FROM "OrderPayment" WHERE method LIKE 'CARD%';
   SELECT DISTINCT method FROM "Payment" WHERE method LIKE 'CARD%';
   ```

All card payments should now report the unified `CARD` method.
