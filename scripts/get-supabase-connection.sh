#!/bin/bash

# Get Supabase connection details from Fly.io
echo "Getting Supabase connection details..."

# Get the secrets
SUPABASE_URL=$(/home/nirvana9010/.fly/bin/flyctl ssh console -a heya-pos-api -C "echo \$SUPABASE_URL")
SUPABASE_SERVICE_KEY=$(/home/nirvana9010/.fly/bin/flyctl ssh console -a heya-pos-api -C "echo \$SUPABASE_SERVICE_KEY")

echo "SUPABASE_URL: $SUPABASE_URL"

# Extract project ID from URL
PROJECT_ID=$(echo $SUPABASE_URL | sed -n 's|https://\([^\.]*\)\.supabase\.co|\1|p')
echo "PROJECT_ID: $PROJECT_ID"

# Construct database URLs
# Supabase uses port 5432 for direct connections and 6543 for pooled connections
SUPABASE_DB_URL="postgresql://postgres.${PROJECT_ID}:[YOUR-DB-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

echo ""
echo "To connect to Supabase database, you need the database password from your Supabase dashboard."
echo "Go to: https://supabase.com/dashboard/project/${PROJECT_ID}/settings/database"
echo ""
echo "Connection string format:"
echo "postgresql://postgres.${PROJECT_ID}:[YOUR-DB-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"