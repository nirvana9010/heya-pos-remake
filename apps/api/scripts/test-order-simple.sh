#!/bin/bash

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hamiltonbeauty.com","password":"demo123"}')

echo "Login response: $LOGIN_RESPONSE" | head -1

# Extract token using grep and sed
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

echo "Token obtained: ${TOKEN:0:20}..."

# Create order
echo -e "\nCreating order..."
ORDER=$(curl -s -X POST http://localhost:3000/api/v1/payments/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Order response:"
echo "$ORDER"

# Extract order number using grep and sed
ORDER_NUMBER=$(echo "$ORDER" | grep -o '"orderNumber":"[^"]*' | sed 's/"orderNumber":"//')
echo -e "\nOrder number: $ORDER_NUMBER"

# Check date prefix
TODAY=$(date +%y%m%d)
EXPECTED_PREFIX="OR-$TODAY"
echo "Expected prefix: $EXPECTED_PREFIX"

if [[ "$ORDER_NUMBER" == "$EXPECTED_PREFIX"* ]]; then
  echo "✅ Order number has correct date prefix!"
else
  echo "❌ Order number doesn't match expected prefix!"
fi