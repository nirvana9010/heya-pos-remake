#!/bin/bash

# Test script for auto-complete booking on payment feature
# This script will:
# 1. Enable the autoCompleteBookings setting
# 2. Create a test booking
# 3. Mark the booking as paid
# 4. Verify the booking is automatically completed

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing Auto-Complete Booking on Payment ===${NC}"
echo ""

# Get auth token - login with email (not username)
echo "Getting fresh auth token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hamiltonbeauty.com", "password": "demo123"}')

AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')

if [ "$AUTH_TOKEN" = "null" ] || [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Error: Failed to get auth token.${NC}"
    echo "$AUTH_RESPONSE" | jq .
    exit 1
fi

echo "Auth token obtained successfully"
echo "$AUTH_TOKEN" > /tmp/auth_token.txt

# Step 1: Enable autoCompleteBookings setting
echo -e "${YELLOW}1. Enabling autoCompleteBookings setting...${NC}"
curl -X PUT http://localhost:3000/api/v1/merchant/settings \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autoCompleteBookings": true
  }' -s > /dev/null

echo -e "${GREEN}✓ Setting enabled${NC}"
echo ""

# Step 2: Create a test booking
echo -e "${YELLOW}2. Creating test booking...${NC}"

# First get a customer and service
CUSTOMER_DATA=$(curl -s http://localhost:3000/api/v1/customers \
  -H "Authorization: Bearer $AUTH_TOKEN")
CUSTOMER_ID=$(echo "$CUSTOMER_DATA" | jq -r '.customers[0].id')

SERVICE_DATA=$(curl -s http://localhost:3000/api/v1/services \
  -H "Authorization: Bearer $AUTH_TOKEN")
SERVICE_ID=$(echo "$SERVICE_DATA" | jq -r '.services[0].id')

STAFF_DATA=$(curl -s http://localhost:3000/api/v1/staff \
  -H "Authorization: Bearer $AUTH_TOKEN")
# Staff API returns an array directly, not an object with "staff" property
STAFF_ID=$(echo "$STAFF_DATA" | jq -r '.[0].id')

echo "Customer ID: $CUSTOMER_ID"
echo "Service ID: $SERVICE_ID"
echo "Staff ID: $STAFF_ID"

if [ "$CUSTOMER_ID" = "null" ] || [ "$SERVICE_ID" = "null" ] || [ "$STAFF_ID" = "null" ]; then
    echo -e "${RED}Error: Failed to get test data. Make sure there are customers, services, and staff in the system.${NC}"
    exit 1
fi

# Create booking for today
BOOKING_DATE=$(date +%Y-%m-%d)
BOOKING_TIME="14:00"

BOOKING_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v2/bookings \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"services\": [{
      \"serviceId\": \"$SERVICE_ID\",
      \"staffId\": \"$STAFF_ID\"
    }],
    \"startTime\": \"${BOOKING_DATE}T${BOOKING_TIME}:00Z\",
    \"source\": \"IN_PERSON\",
    \"notes\": \"Test booking for auto-complete feature\"
  }")

BOOKING_ID=$(echo $BOOKING_RESPONSE | jq -r '.id')
BOOKING_NUMBER=$(echo $BOOKING_RESPONSE | jq -r '.bookingNumber')

if [ "$BOOKING_ID" = "null" ]; then
    echo -e "${RED}✗ Failed to create booking${NC}"
    echo $BOOKING_RESPONSE | jq .
    exit 1
fi

echo -e "${GREEN}✓ Created booking $BOOKING_NUMBER (ID: $BOOKING_ID)${NC}"
echo ""

# Step 3: Check initial status
echo -e "${YELLOW}3. Checking initial booking status...${NC}"
INITIAL_STATUS=$(curl -s http://localhost:3000/api/v2/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.status')

echo -e "Initial status: ${YELLOW}$INITIAL_STATUS${NC}"
echo ""

# Step 4: Mark booking as paid
echo -e "${YELLOW}4. Marking booking as paid...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v2/bookings/$BOOKING_ID/mark-paid \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "notes": "Test payment for auto-complete"
  }')

PAYMENT_SUCCESS=$(echo $PAYMENT_RESPONSE | jq -r '.success')

if [ "$PAYMENT_SUCCESS" != "true" ]; then
    echo -e "${RED}✗ Failed to mark booking as paid${NC}"
    echo $PAYMENT_RESPONSE | jq .
    exit 1
fi

echo -e "${GREEN}✓ Booking marked as paid${NC}"
echo ""

# Step 5: Wait a moment for auto-complete to process
echo -e "${YELLOW}5. Waiting for auto-complete to process...${NC}"
sleep 2

# Step 6: Check final status
echo -e "${YELLOW}6. Checking final booking status...${NC}"
FINAL_STATUS=$(curl -s http://localhost:3000/api/v2/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.status')

echo -e "Final status: ${YELLOW}$FINAL_STATUS${NC}"
echo ""

# Step 7: Verify the result
echo -e "${YELLOW}=== Test Results ===${NC}"
if [ "$FINAL_STATUS" = "COMPLETED" ]; then
    echo -e "${GREEN}✓ SUCCESS: Booking was automatically completed when marked as paid!${NC}"
    echo -e "${GREEN}  Initial status: $INITIAL_STATUS${NC}"
    echo -e "${GREEN}  Final status: $FINAL_STATUS${NC}"
else
    echo -e "${RED}✗ FAILURE: Booking was not automatically completed${NC}"
    echo -e "${RED}  Expected: COMPLETED${NC}"
    echo -e "${RED}  Actual: $FINAL_STATUS${NC}"
    
    # Check API logs for more info
    echo ""
    echo -e "${YELLOW}Checking API logs for auto-complete messages...${NC}"
    pm2 logs api --nostream --lines 50 | grep -i "auto-complet" | tail -5
fi

echo ""
echo -e "${YELLOW}=== Test Complete ===${NC}"

# Optional: Disable the setting back if needed
# curl -X PUT http://localhost:3000/api/v1/merchant/settings \
#   -H "Authorization: Bearer $AUTH_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{"autoCompleteBookings": false}' -s > /dev/null