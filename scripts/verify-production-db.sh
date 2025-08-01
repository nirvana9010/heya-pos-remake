#!/bin/bash

# Production Database Verification Script
# This script helps verify that production is using the correct database

echo "🔍 Production Database Verification Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Expected DigitalOcean host
EXPECTED_HOST="heyapos-db-do-user-21925728-0.h.db.ondigitalocean.com"
OLD_SUPABASE_HOST="aws-0-ap-southeast-2.pooler.supabase.com"

echo ""
echo "📋 Quick Verification Commands:"
echo ""

echo "1. For Fly.io - Check current database URL:"
echo -e "${YELLOW}fly secrets list -a your-api-app-name | grep DATABASE${NC}"
echo ""

echo "2. For Fly.io - Test database connection:"
echo -e "${YELLOW}fly ssh console -a your-api-app-name -C 'echo \$DATABASE_URL | grep -o \"@[^:]*\" | head -1'${NC}"
echo ""

echo "3. For Fly.io - Check recent logs for database errors:"
echo -e "${YELLOW}fly logs -a your-api-app-name --recent | grep -i \"database\\|supabase\\|digitalocean\"${NC}"
echo ""

echo "4. Test API health endpoint:"
echo -e "${YELLOW}curl -s https://your-api.fly.dev/api/v1/auth/health | jq .${NC}"
echo ""

echo "📊 What to Look For:"
echo ""
echo -e "✅ ${GREEN}GOOD:${NC} Database host contains: $EXPECTED_HOST"
echo -e "❌ ${RED}BAD:${NC} Database host contains: $OLD_SUPABASE_HOST"
echo ""

echo "🚨 If you see Supabase URLs, immediately run:"
echo -e "${YELLOW}fly secrets set DATABASE_URL=\"postgres://postgres:[YOUR-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable\" -a your-api-app-name${NC}"
echo ""

echo "📝 Full Update Command Set:"
cat << 'EOF'
# Update both database URLs (replace [YOUR-PASSWORD] with actual password)
fly secrets set DATABASE_URL="postgres://postgres:[YOUR-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable" -a your-api-app-name
fly secrets set DIRECT_URL="postgres://postgres:[YOUR-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable" -a your-api-app-name

# Remove old Supabase variables
fly secrets unset SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY -a your-api-app-name

# Deploy the changes
fly deploy -a your-api-app-name
EOF

echo ""
echo "🔄 Remember to replace 'your-api-app-name' with your actual Fly.io app name!"