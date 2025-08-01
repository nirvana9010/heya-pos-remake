#!/bin/bash

# Migration script from Supabase to Fly.io PostgreSQL
# This script properly migrates ALL data including Services, Bookings, Orders

echo "=== Supabase to Fly.io PostgreSQL Migration ==="
echo ""

# Supabase connection details
SUPABASE_PROJECT_ID="hpvnmqvdgkfeykekosrh"
echo "Supabase Project: $SUPABASE_PROJECT_ID"
echo ""

# Check if we have a backup file
if [ -f "$1" ]; then
    echo "Using backup file: $1"
    BACKUP_FILE="$1"
else
    echo "Please provide either:"
    echo "1. The Supabase database password to connect directly"
    echo "2. The path to the .backup file"
    echo ""
    echo "Usage: $0 [backup-file-path]"
    echo "   or: SUPABASE_DB_PASSWORD=your-password $0"
    exit 1
fi

# Fly.io PostgreSQL (local proxy)
FLY_DB_URL="postgres://postgres:***REMOVED***@localhost:5432/postgres"

# If using direct connection
if [ -n "$SUPABASE_DB_PASSWORD" ]; then
    SUPABASE_DB_URL="postgresql://postgres.${SUPABASE_PROJECT_ID}:${SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
    echo "Connecting to Supabase directly..."
    
    # Dump all data from Supabase
    echo "Dumping data from Supabase..."
    pg_dump "$SUPABASE_DB_URL" \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        -f supabase_data_dump.sql
    
    BACKUP_FILE="supabase_data_dump.sql"
fi

# Clear existing data in Fly.io database
echo ""
echo "Clearing existing data in Fly.io database..."
PGPASSWORD=***REMOVED*** psql -h localhost -U postgres -d postgres << 'EOF'
-- Disable foreign key checks
SET session_replication_role = 'replica';

-- Clear all data in reverse dependency order
TRUNCATE TABLE "BookingService" CASCADE;
TRUNCATE TABLE "OrderItem" CASCADE;
TRUNCATE TABLE "Payment" CASCADE;
TRUNCATE TABLE "LoyaltyTransaction" CASCADE;
TRUNCATE TABLE "Order" CASCADE;
TRUNCATE TABLE "Booking" CASCADE;
TRUNCATE TABLE "Service" CASCADE;
TRUNCATE TABLE "ServiceCategory" CASCADE;
TRUNCATE TABLE "StaffSchedule" CASCADE;
TRUNCATE TABLE "Staff" CASCADE;
TRUNCATE TABLE "Customer" CASCADE;
TRUNCATE TABLE "Location" CASCADE;
TRUNCATE TABLE "MerchantNotification" CASCADE;
TRUNCATE TABLE "OutboxEvent" CASCADE;
TRUNCATE TABLE "MerchantAuth" CASCADE;
TRUNCATE TABLE "Merchant" CASCADE;
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Package" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
EOF

# Restore data from backup
echo ""
echo "Restoring data from backup..."
if [[ "$BACKUP_FILE" == *.sql ]]; then
    # SQL file - direct restore
    PGPASSWORD=***REMOVED*** psql -h localhost -U postgres -d postgres < "$BACKUP_FILE"
else
    # Binary backup file - use pg_restore
    PGPASSWORD=***REMOVED*** pg_restore \
        -h localhost \
        -U postgres \
        -d postgres \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        "$BACKUP_FILE"
fi

# Verify migration
echo ""
echo "=== Migration Results ==="
PGPASSWORD=***REMOVED*** psql -h localhost -U postgres -d postgres << 'EOF'
SELECT 
    'Package' as table_name, COUNT(*) as count FROM "Package"
UNION ALL SELECT 'Merchant', COUNT(*) FROM "Merchant"
UNION ALL SELECT 'Location', COUNT(*) FROM "Location"
UNION ALL SELECT 'User', COUNT(*) FROM "User"
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
ORDER BY table_name;
EOF

echo ""
echo "Migration complete!"
echo ""
echo "Next steps:"
echo "1. Restart the API: pm2 restart api"
echo "2. Test the booking app: https://visit.heyapos.com/[merchant-subdomain]"
echo "3. Test the merchant app: https://hub.heyapos.com"