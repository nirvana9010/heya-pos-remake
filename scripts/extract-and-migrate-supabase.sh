#!/bin/bash

echo "=== Extracting and Migrating Supabase Data ==="

# Extract only public schema data from the backup
echo "Extracting public schema data..."
sed -n '/^COPY public\./,/^\\\.$/p' db_cluster-31-07-2025@14-21-50.backup > public_schema_data.sql

# Add transaction wrapper
echo "BEGIN;" > supabase_public_data.sql
echo "SET session_replication_role = 'replica';" >> supabase_public_data.sql
cat public_schema_data.sql >> supabase_public_data.sql
echo "SET session_replication_role = 'origin';" >> supabase_public_data.sql
echo "COMMIT;" >> supabase_public_data.sql

# Clear existing data
echo "Clearing existing data..."
PGPASSWORD=***REMOVED*** psql -h localhost -U postgres -d postgres << 'EOF'
SET session_replication_role = 'replica';
TRUNCATE TABLE "BookingService", "OrderItem", "Payment", "LoyaltyTransaction", 
         "Order", "Booking", "Service", "ServiceCategory", "StaffSchedule",
         "Staff", "Customer", "Location", "MerchantNotification", 
         "OutboxEvent", "MerchantAuth", "Merchant", "Package" CASCADE;
SET session_replication_role = 'origin';
EOF

# Restore the data
echo "Restoring Supabase data..."
PGPASSWORD=***REMOVED*** psql -h localhost -U postgres -d postgres < supabase_public_data.sql

# Verify the migration
echo ""
echo "=== Migration Results ==="
PGPASSWORD=***REMOVED*** psql -h localhost -U postgres -d postgres << 'EOF'
SELECT 
    table_name,
    count
FROM (
    SELECT 'Package' as table_name, COUNT(*) as count FROM "Package"
    UNION ALL SELECT 'Merchant', COUNT(*) FROM "Merchant"
    UNION ALL SELECT 'Location', COUNT(*) FROM "Location"
    UNION ALL SELECT 'MerchantAuth', COUNT(*) FROM "MerchantAuth"
    UNION ALL SELECT 'Customer', COUNT(*) FROM "Customer"
    UNION ALL SELECT 'Staff', COUNT(*) FROM "Staff"
    UNION ALL SELECT 'ServiceCategory', COUNT(*) FROM "ServiceCategory"
    UNION ALL SELECT 'Service', COUNT(*) FROM "Service"
    UNION ALL SELECT 'Booking', COUNT(*) FROM "Booking"
    UNION ALL SELECT 'BookingService', COUNT(*) FROM "BookingService"
    UNION ALL SELECT 'Order', COUNT(*) FROM "Order"
    UNION ALL SELECT 'OrderItem', COUNT(*) FROM "OrderItem"
    UNION ALL SELECT 'Payment', COUNT(*) FROM "Payment"
) t
ORDER BY count DESC, table_name;
EOF

# Clean up temp files
rm -f public_schema_data.sql

echo ""
echo "Migration complete!"