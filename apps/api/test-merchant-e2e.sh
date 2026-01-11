#!/bin/bash

echo "🧪 Testing Luxe Beauty & Wellness Merchant API"
echo "=============================================="

# Get merchant ID
MERCHANT_ID=$(cd /home/nirvana9010/projects/heya-pos-remake/apps/api && npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.merchant.findFirst({ where: { subdomain: 'luxebeauty' } })
  .then(m => console.log(m.id))
  .then(() => prisma.\$disconnect());
" 2>/dev/null)

echo "Merchant ID: $MERCHANT_ID"
echo ""

# 1. Test merchant login
echo "1. Testing merchant login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@luxebeauty.com",
    "password": "testpassword123",
    "merchantCode": "luxeadmin"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

# 2. Test services endpoint
echo -e "\n2. Testing services endpoint..."
echo "Searching for 'facial':"
curl -s "http://localhost:3000/api/services?searchTerm=facial&limit=3" \
  -H "x-merchant-id: $MERCHANT_ID" \
  -H "Authorization: Bearer $TOKEN" | \
  grep -o '"name":"[^"]*"' | head -3

# 3. Test customers endpoint
echo -e "\n\n3. Testing customers endpoint..."
echo "Searching for 'olivia':"
curl -s "http://localhost:3000/api/api/customers?search=olivia" \
  -H "x-merchant-id: $MERCHANT_ID" \
  -H "Authorization: Bearer $TOKEN" | \
  grep -o '"firstName":"[^"]*","lastName":"[^"]*"' | head -1

# 4. Test bookings endpoint
echo -e "\n\n4. Testing bookings endpoint..."
echo "Today's bookings:"
TODAY=$(date +%Y-%m-%d)
curl -s "http://localhost:3000/api/api/bookings?startDate=$TODAY&endDate=$TODAY" \
  -H "x-merchant-id: $MERCHANT_ID" \
  -H "Authorization: Bearer $TOKEN" | \
  grep -o '"status":"[^"]*"' | head -5

# 5. Test staff PIN authentication
echo -e "\n\n5. Testing staff PIN authentication..."
PIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/staff/pin \
  -H "Content-Type: application/json" \
  -H "x-merchant-id: $MERCHANT_ID" \
  -d '{
    "email": "sarah.chen@luxebeauty.com",
    "pin": "1234"
  }')

if echo "$PIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Staff PIN auth successful"
else
  echo "❌ Staff PIN auth failed"
  echo "$PIN_RESPONSE"
fi

# 6. Test service categories
echo -e "\n\n6. Testing service categories..."
curl -s "http://localhost:3000/api/service-categories" \
  -H "x-merchant-id: $MERCHANT_ID" \
  -H "Authorization: Bearer $TOKEN" | \
  grep -o '"name":"[^"]*"' | head -4

echo -e "\n\n✅ All tests completed!"