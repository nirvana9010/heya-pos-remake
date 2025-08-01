#!/bin/bash

echo "=== Migrating Supabase Data with Schema Fixes ==="

# Create a clean SQL file with schema adjustments
echo "Processing backup file..."

# Extract and process each table individually
cat > migrate_supabase.sql << 'EOF'
BEGIN;
SET session_replication_role = 'replica';

-- Clear existing data
TRUNCATE TABLE "BookingService", "OrderItem", "Payment", "LoyaltyTransaction", 
         "Order", "Booking", "Service", "ServiceCategory", "StaffSchedule",
         "Staff", "Customer", "Location", "MerchantNotification", 
         "OutboxEvent", "MerchantAuth", "Merchant", "Package" CASCADE;

EOF

# Process each table from the backup
echo "Processing tables..."

# Function to extract and process a table
process_table() {
    local table=$1
    local skip_columns=$2
    
    echo "Processing $table..."
    
    # Extract the COPY command and data
    sed -n "/^COPY public\.\"$table\"/,/^\\\\\.$/p" db_cluster-31-07-2025@14-21-50.backup > temp_${table}.sql
    
    if [ -s "temp_${table}.sql" ]; then
        if [ -n "$skip_columns" ]; then
            # Remove specified columns from COPY command
            # This is complex, so for StaffSchedule we'll handle it specially
            if [ "$table" = "StaffSchedule" ]; then
                # Transform StaffSchedule data to remove locationId column
                echo "-- $table data (removing locationId)" >> migrate_supabase.sql
                echo "COPY public.\"StaffSchedule\" (id, \"staffId\", \"dayOfWeek\", \"startTime\", \"endTime\", \"createdAt\", \"updatedAt\") FROM stdin;" >> migrate_supabase.sql
                # Skip header line and transform data lines
                tail -n +2 temp_${table}.sql | grep -v "^\\\\\." | awk -F'\t' '{print $1"\t"$2"\t"$4"\t"$5"\t"$6"\t"$7"\t"$8}' >> migrate_supabase.sql
                echo "\\." >> migrate_supabase.sql
            fi
        else
            # Use as-is
            cat temp_${table}.sql >> migrate_supabase.sql
        fi
        echo "" >> migrate_supabase.sql
    fi
    
    rm -f temp_${table}.sql
}

# Process tables in dependency order
process_table "Package"
process_table "Merchant"
process_table "Location" 
process_table "MerchantAuth"
process_table "Staff"
process_table "Customer"
process_table "ServiceCategory"
process_table "Service"
process_table "StaffSchedule" "locationId"  # Remove locationId column
process_table "Booking"
process_table "BookingService"
process_table "Order"
process_table "OrderItem"
process_table "Payment"
process_table "OutboxEvent"
process_table "MerchantNotification"

# Complete the transaction
echo "SET session_replication_role = 'origin';" >> migrate_supabase.sql
echo "COMMIT;" >> migrate_supabase.sql

# Run the migration
echo ""
echo "Running migration..."
export PGPASSWORD=jTzPXDBfABYvzoA
psql -h localhost -U postgres -d postgres < migrate_supabase.sql

# Verify results
echo ""
echo "=== Migration Results ==="
psql -h localhost -U postgres -d postgres << 'VERIFY'
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
    UNION ALL SELECT 'StaffSchedule', COUNT(*) FROM "StaffSchedule"
    UNION ALL SELECT 'OutboxEvent', COUNT(*) FROM "OutboxEvent"
    UNION ALL SELECT 'MerchantNotification', COUNT(*) FROM "MerchantNotification"
) t
WHERE count > 0
ORDER BY count DESC, table_name;
VERIFY

# Check Orange Nails specifically
echo ""
echo "=== Orange Nails Data ==="
psql -h localhost -U postgres -d postgres << 'ORANGE'
SELECT 
    m.name,
    m.subdomain,
    (SELECT COUNT(*) FROM "Service" s WHERE s."merchantId" = m.id) as services,
    (SELECT COUNT(*) FROM "Booking" b WHERE b."merchantId" = m.id) as bookings,
    (SELECT COUNT(*) FROM "Customer" c WHERE c."merchantId" = m.id) as customers,
    (SELECT COUNT(*) FROM "Staff" st WHERE st."merchantId" = m.id) as staff
FROM "Merchant" m
WHERE m.subdomain = 'orange-nails-beauty';
ORANGE

# Clean up
rm -f migrate_supabase.sql

echo ""
echo "Migration complete!"