#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing V2 Bookings API Flows ===${NC}"

# Base URL
BASE_URL="http://localhost:3000/api"

# Test 1: Login as merchant
echo -e "\n${BLUE}1. Testing merchant login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -oP '"token":"\K[^"]+' || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✅ Login successful${NC}"
fi

# Test 2: Get bookings list (V2)
echo -e "\n${BLUE}2. Testing V2 bookings list...${NC}"
BOOKINGS_RESPONSE=$(curl -s -X GET "$BASE_URL/v2/bookings?limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$BOOKINGS_RESPONSE" | grep -q '"data"'; then
  echo -e "${GREEN}✅ V2 bookings list working${NC}"
  
  # Check if customerName is present in response
  if echo "$BOOKINGS_RESPONSE" | grep -q '"customerName"'; then
    echo -e "${GREEN}✅ customerName field present in V2 response${NC}"
  else
    echo -e "${RED}❌ customerName field missing in V2 response${NC}"
  fi
else
  echo -e "${RED}❌ V2 bookings list failed${NC}"
  echo "Response: $BOOKINGS_RESPONSE"
fi

# Test 3: Get single booking (V2)
echo -e "\n${BLUE}3. Testing V2 single booking...${NC}"
# Extract first booking ID from list
BOOKING_ID=$(echo $BOOKINGS_RESPONSE | grep -oP '"id":"\K[^"]+' | head -1)

if [ ! -z "$BOOKING_ID" ]; then
  SINGLE_BOOKING=$(curl -s -X GET "$BASE_URL/v2/bookings/$BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$SINGLE_BOOKING" | grep -q '"id"'; then
    echo -e "${GREEN}✅ V2 single booking working${NC}"
  else
    echo -e "${RED}❌ V2 single booking failed${NC}"
    echo "Response: $SINGLE_BOOKING"
  fi
else
  echo -e "${BLUE}⚠️  No bookings found to test single booking endpoint${NC}"
fi

# Test 4: Check calendar view
echo -e "\n${BLUE}4. Testing V2 calendar view...${NC}"
TODAY=$(date +%Y-%m-%d)
CALENDAR_RESPONSE=$(curl -s -X GET "$BASE_URL/v2/bookings/calendar?date=$TODAY" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CALENDAR_RESPONSE" | grep -q '"slots"'; then
  echo -e "${GREEN}✅ V2 calendar view working${NC}"
else
  echo -e "${RED}❌ V2 calendar view failed${NC}"
  echo "Response: $CALENDAR_RESPONSE"
fi

# Test 5: Dashboard stats (with fallback)
echo -e "\n${BLUE}5. Testing dashboard stats...${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/v1/dashboard/stats" \
  -H "Authorization: Bearer $TOKEN")

if [ "$?" -eq 0 ]; then
  if echo "$STATS_RESPONSE" | grep -q '"todayBookings"'; then
    echo -e "${GREEN}✅ Dashboard stats endpoint exists${NC}"
  else
    echo -e "${BLUE}⚠️  Dashboard stats endpoint not found (using frontend fallback)${NC}"
  fi
fi

# Test 6: Check customers endpoint
echo -e "\n${BLUE}6. Testing customers endpoint...${NC}"
CUSTOMERS_RESPONSE=$(curl -s -X GET "$BASE_URL/v1/customers?limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMERS_RESPONSE" | grep -q '"firstName"'; then
  echo -e "${GREEN}✅ Customers endpoint working${NC}"
else
  echo -e "${RED}❌ Customers endpoint failed${NC}"
  echo "Response: $CUSTOMERS_RESPONSE"
fi

# Test 7: Public endpoints (no version prefix)
echo -e "\n${BLUE}7. Testing public endpoints...${NC}"
PUBLIC_SERVICES=$(curl -s -X GET "$BASE_URL/public/services")

if echo "$PUBLIC_SERVICES" | grep -q '"data"'; then
  echo -e "${GREEN}✅ Public services endpoint working${NC}"
else
  echo -e "${RED}❌ Public services endpoint failed${NC}"
  echo "Response: $PUBLIC_SERVICES"
fi

PUBLIC_CATEGORIES=$(curl -s -X GET "$BASE_URL/public/service-categories")

if echo "$PUBLIC_CATEGORIES" | grep -q '"data"'; then
  echo -e "${GREEN}✅ Public service categories endpoint working${NC}"
else
  echo -e "${RED}❌ Public service categories endpoint failed${NC}"
  echo "Response: $PUBLIC_CATEGORIES"
fi

echo -e "\n${BLUE}=== V2 Testing Complete ===${NC}"