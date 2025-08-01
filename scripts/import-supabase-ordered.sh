#!/bin/bash

echo "=== Importing Supabase Data in Correct Order ==="

# Extract individual tables from backup
echo "Extracting tables..."
for table in Package Merchant Location MerchantAuth Staff Customer ServiceCategory Service StaffSchedule Booking BookingService Order OrderItem Payment OutboxEvent MerchantNotification; do
    sed -n "/^COPY public\.\"$table\"/,/^\\\\\.$/p" db_cluster-31-07-2025@14-21-50.backup > ${table}.sql
done

# Import in correct dependency order
export PGPASSWORD=jTzPXDBfABYvzoA

echo "Importing data..."
psql -h localhost -U postgres -d postgres << 'EOF'
BEGIN;
SET session_replication_role = 'replica';

-- Clear existing data
TRUNCATE TABLE "BookingService", "OrderItem", "Payment", "LoyaltyTransaction", 
         "Order", "Booking", "Service", "ServiceCategory", "StaffSchedule",
         "Staff", "Customer", "Location", "MerchantNotification", 
         "OutboxEvent", "MerchantAuth", "Merchant", "Package" CASCADE;
EOF

# Import each table
echo "Importing Package..."
psql -h localhost -U postgres -d postgres < Package.sql

echo "Importing Merchant..."
psql -h localhost -U postgres -d postgres < Merchant.sql

echo "Importing Location..."
psql -h localhost -U postgres -d postgres < Location.sql

echo "Importing MerchantAuth..."
psql -h localhost -U postgres -d postgres < MerchantAuth.sql

echo "Importing Customer..."
psql -h localhost -U postgres -d postgres < Customer.sql

echo "Importing Staff..."
psql -h localhost -U postgres -d postgres < Staff.sql

echo "Importing ServiceCategory..."
psql -h localhost -U postgres -d postgres < ServiceCategory.sql

echo "Importing Service..."
psql -h localhost -U postgres -d postgres < Service.sql

echo "Importing StaffSchedule..."
psql -h localhost -U postgres -d postgres < StaffSchedule.sql

echo "Importing Booking..."
psql -h localhost -U postgres -d postgres < Booking.sql

echo "Importing BookingService..."
psql -h localhost -U postgres -d postgres < BookingService.sql

echo "Importing Order..."
psql -h localhost -U postgres -d postgres < Order.sql

echo "Importing OrderItem..."
psql -h localhost -U postgres -d postgres < OrderItem.sql

echo "Importing Payment..."
psql -h localhost -U postgres -d postgres < Payment.sql

echo "Importing OutboxEvent..."
psql -h localhost -U postgres -d postgres < OutboxEvent.sql

echo "Importing MerchantNotification..."
psql -h localhost -U postgres -d postgres < MerchantNotification.sql

# Commit transaction
psql -h localhost -U postgres -d postgres << 'EOF'
SET session_replication_role = 'origin';
COMMIT;
EOF

# Verify results
echo ""
echo "=== Import Results ==="
psql -h localhost -U postgres -d postgres << 'EOF'
SELECT 
    table_name,
    count
FROM (
    SELECT 'Package' as table_name, COUNT(*) as count FROM "Package"
    UNION ALL SELECT 'Merchant', COUNT(*) FROM "Merchant"
    UNION ALL SELECT 'Location', COUNT(*) FROM "Location"
    UNION ALL SELECT 'Customer', COUNT(*) FROM "Customer"
    UNION ALL SELECT 'Staff', COUNT(*) FROM "Staff"
    UNION ALL SELECT 'Service', COUNT(*) FROM "Service"
    UNION ALL SELECT 'Booking', COUNT(*) FROM "Booking"
    UNION ALL SELECT 'Order', COUNT(*) FROM "Order"
) t
WHERE count > 0
ORDER BY count DESC, table_name;
EOF

# Clean up
rm -f Package.sql Merchant.sql Location.sql MerchantAuth.sql Staff.sql Customer.sql ServiceCategory.sql Service.sql StaffSchedule.sql Booking.sql BookingService.sql Order.sql OrderItem.sql Payment.sql OutboxEvent.sql MerchantNotification.sql

echo ""
echo "Import complete!"