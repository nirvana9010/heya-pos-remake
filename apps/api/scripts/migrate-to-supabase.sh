#!/bin/bash

# Migration script for SQLite to Supabase PostgreSQL

echo "=== HEYA POS SQLite to Supabase Migration ==="
echo ""

# Check if connection strings are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./migrate-to-supabase.sh <DIRECT_CONNECTION_STRING> <POOLED_CONNECTION_STRING>"
    echo ""
    echo "Get these from Supabase Dashboard > Settings > Database:"
    echo "  1. Direct connection (for migrations) - usually port 5432"
    echo "  2. Connection pooling > Transaction mode (for runtime) - usually port 6543"
    echo ""
    echo "Example:"
    echo "  ./migrate-to-supabase.sh \\"
    echo "    'postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres' \\"
    echo "    'postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true'"
    exit 1
fi

DIRECT_URL=$1
DATABASE_URL=$2

# Navigate to API directory
cd "$(dirname "$0")/.."

echo "Step 1: Creating .env.postgresql file..."
cat > .env.postgresql << EOF
# Direct connection for migrations
DIRECT_URL="${DIRECT_URL}"

# Pooled connection for runtime (transaction mode)
DATABASE_URL="${DATABASE_URL}"

# Keep existing non-database env vars
JWT_SECRET="your-secret-key-at-least-32-characters-long"
EOF

echo "Step 2: Backing up current .env file..."
if [ -f .env ]; then
    cp .env .env.sqlite.backup
fi

echo "Step 3: Running data export from SQLite..."
npx tsx scripts/export-sqlite-data.ts

echo ""
echo "Step 4: Switching to PostgreSQL schema..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma

echo "Step 5: Updating .env to use PostgreSQL..."
cp .env.postgresql .env

echo "Step 6: Generating Prisma Client for PostgreSQL..."
npx prisma generate

echo ""
echo "Step 7: Creating database schema in Supabase..."
echo "WARNING: This will reset the database. Continue? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    npx prisma db push --force-reset
else
    echo "Migration cancelled."
    exit 1
fi

echo ""
echo "Step 8: Importing data to Supabase..."
npx tsx scripts/import-to-postgresql.ts

echo ""
echo "=== Migration Complete! ==="
echo ""
echo "Next steps:"
echo "1. Test the application with the new database"
echo "2. Update any environment-specific configurations"
echo "3. Update deployment configurations"
echo ""
echo "To rollback to SQLite:"
echo "  cp .env.sqlite.backup .env"
echo "  cp prisma/schema.prisma.backup prisma/schema.prisma"
echo "  npx prisma generate"