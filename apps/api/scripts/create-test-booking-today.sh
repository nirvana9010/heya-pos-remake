#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Creating Test Booking for Today ===${NC}"

# Base URL
BASE_URL="http://localhost:3000/api"

# Login first
echo -e "\n${BLUE}1. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -oP '"token":"\K[^"]+' || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

# Get a customer
echo -e "\n${BLUE}2. Getting a customer...${NC}"
CUSTOMERS=$(curl -s -X GET "$BASE_URL/v1/customers?limit=1" \
  -H "Authorization: Bearer $TOKEN")

CUSTOMER_ID=$(echo $CUSTOMERS | grep -oP '"id":"\K[^"]+' | head -1)
echo "Customer ID: $CUSTOMER_ID"

# Get a staff member
echo -e "\n${BLUE}3. Getting a staff member...${NC}"
STAFF=$(curl -s -X GET "$BASE_URL/v1/staff?limit=1" \
  -H "Authorization: Bearer $TOKEN")

STAFF_ID=$(echo $STAFF | grep -oP '"id":"\K[^"]+' | head -1)
echo "Staff ID: $STAFF_ID"

# Get a service
echo -e "\n${BLUE}4. Getting a service...${NC}"
SERVICES=$(curl -s -X GET "$BASE_URL/v1/services?limit=1" \
  -H "Authorization: Bearer $TOKEN")

SERVICE_ID=$(echo $SERVICES | grep -oP '"id":"\K[^"]+' | head -1)
echo "Service ID: $SERVICE_ID"

# Get location
echo -e "\n${BLUE}5. Getting location...${NC}"
LOCATIONS=$(curl -s -X GET "$BASE_URL/v1/locations?limit=1" \
  -H "Authorization: Bearer $TOKEN")

LOCATION_ID=$(echo $LOCATIONS | grep -oP '"id":"\K[^"]+' | head -1)
echo "Location ID: $LOCATION_ID"

# Create booking for today at 2pm
TODAY=$(date +%Y-%m-%d)
START_TIME="${TODAY}T14:00:00.000Z"

echo -e "\n${BLUE}6. Creating booking for today at 2pm...${NC}"
BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/v2/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"staffId\": \"$STAFF_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"locationId\": \"$LOCATION_ID\",
    \"startTime\": \"$START_TIME\",
    \"notes\": \"Test booking created for calendar display\"
  }")

if echo "$BOOKING_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✅ Booking created successfully${NC}"
  echo "$BOOKING_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BOOKING_RESPONSE"
else
  echo -e "${RED}❌ Failed to create booking${NC}"
  echo "Response: $BOOKING_RESPONSE"
fi