#!/bin/bash

# API Endpoint Test Script
set -e

API_URL="http://localhost:3000/api"
USERNAME="luxeadmin"
PASSWORD="testpassword123"

echo "🔍 Testing Heya POS API Endpoints..."
echo "================================="

# 1. Health Check
echo -e "\n1. Testing Health Endpoint..."
curl -s "$API_URL/health" | python3 -m json.tool

# 2. Login
echo -e "\n2. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

echo "$LOGIN_RESPONSE" | python3 -m json.tool

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
echo "Token obtained: ${TOKEN:0:50}..."

# 3. Test Auth Me
echo -e "\n3. Testing Auth Me Endpoint..."
curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool || echo "Failed"

# 4. Test Services
echo -e "\n4. Testing Services Endpoint..."
curl -s "$API_URL/services" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool || echo "Failed"

# 5. Test Service Categories
echo -e "\n5. Testing Service Categories..."
curl -s "$API_URL/service-categories" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool || echo "Failed"

# 6. Test Customers
echo -e "\n6. Testing Customers Endpoint..."
curl -s "$API_URL/customers" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool || echo "Failed"

# 7. Test Bookings
echo -e "\n7. Testing Bookings Endpoint..."
curl -s "$API_URL/bookings" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool || echo "Failed"

# 8. Test Calendar
echo -e "\n8. Testing Calendar Endpoint..."
curl -s "$API_URL/bookings/calendar" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool || echo "Failed"

echo -e "\n✅ API Endpoint Testing Complete!"