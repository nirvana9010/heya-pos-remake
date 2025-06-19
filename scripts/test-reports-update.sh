#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
API_URL="http://localhost:3000/api"

# Get auth token
echo -e "${YELLOW}1. Authenticating as merchant...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/v1/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}Failed to authenticate${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated successfully${NC}"

# Function to get report data
get_reports() {
    echo -e "\n${YELLOW}Getting current report data...${NC}"
    
    # Get overview
    OVERVIEW=$(curl -s -X GET "$API_URL/v1/reports/overview" \
      -H "Authorization: Bearer $TOKEN")
    
    # Extract key metrics
    TOTAL_REVENUE=$(echo $OVERVIEW | jq '.revenue.revenue.monthly')
    TOTAL_BOOKINGS=$(echo $OVERVIEW | jq '.bookings.bookings.total')
    COMPLETED_BOOKINGS=$(echo $OVERVIEW | jq '.bookings.bookings.completed')
    TOTAL_CUSTOMERS=$(echo $OVERVIEW | jq '.customers.customers.total')
    
    echo -e "Current Monthly Revenue: ${GREEN}$${TOTAL_REVENUE}${NC}"
    echo -e "Total Bookings: ${GREEN}${TOTAL_BOOKINGS}${NC}"
    echo -e "Completed Bookings: ${GREEN}${COMPLETED_BOOKINGS}${NC}"
    echo -e "Total Customers: ${GREEN}${TOTAL_CUSTOMERS}${NC}"
}

# Get initial reports
echo -e "${YELLOW}=== INITIAL REPORT STATE ===${NC}"
get_reports
INITIAL_REVENUE=$TOTAL_REVENUE
INITIAL_BOOKINGS=$TOTAL_BOOKINGS
INITIAL_COMPLETED=$COMPLETED_BOOKINGS

# Get a customer
echo -e "\n${YELLOW}2. Getting a customer...${NC}"
CUSTOMERS=$(curl -s -X GET "$API_URL/v1/customers" \
  -H "Authorization: Bearer $TOKEN")
CUSTOMER_ID=$(echo $CUSTOMERS | jq -r '.[0].id')
CUSTOMER_NAME=$(echo $CUSTOMERS | jq -r '.[0].firstName + " " + .[0].lastName')
echo -e "${GREEN}✓ Using customer: $CUSTOMER_NAME (ID: $CUSTOMER_ID)${NC}"

# Get a service
echo -e "\n${YELLOW}3. Getting a service...${NC}"
SERVICES=$(curl -s -X GET "$API_URL/v1/services" \
  -H "Authorization: Bearer $TOKEN")
SERVICE_ID=$(echo $SERVICES | jq -r '.[0].id')
SERVICE_NAME=$(echo $SERVICES | jq -r '.[0].name')
SERVICE_PRICE=$(echo $SERVICES | jq -r '.[0].price')
echo -e "${GREEN}✓ Using service: $SERVICE_NAME (Price: $${SERVICE_PRICE})${NC}"

# Get a staff member
echo -e "\n${YELLOW}4. Getting a staff member...${NC}"
STAFF=$(curl -s -X GET "$API_URL/v1/staff" \
  -H "Authorization: Bearer $TOKEN")
STAFF_ID=$(echo $STAFF | jq -r '.[0].id')
STAFF_NAME=$(echo $STAFF | jq -r '.[0].firstName + " " + .[0].lastName')
echo -e "${GREEN}✓ Using staff: $STAFF_NAME (ID: $STAFF_ID)${NC}"

# Create a booking for today
echo -e "\n${YELLOW}5. Creating a new booking...${NC}"
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
END_TIME=$(date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%S.000Z")

BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/v2/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"services\": [
      {
        \"serviceId\": \"$SERVICE_ID\",
        \"staffId\": \"$STAFF_ID\",
        \"startTime\": \"$START_TIME\",
        \"endTime\": \"$END_TIME\",
        \"price\": $SERVICE_PRICE
      }
    ],
    \"notes\": \"Test booking for reports verification\"
  }")

BOOKING_ID=$(echo $BOOKING_RESPONSE | jq -r '.id')
if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" = "null" ]; then
    echo -e "${RED}Failed to create booking${NC}"
    echo $BOOKING_RESPONSE
    exit 1
fi
echo -e "${GREEN}✓ Created booking ID: $BOOKING_ID${NC}"

# Wait a moment
sleep 2

# Check reports after creating booking
echo -e "\n${YELLOW}=== REPORT STATE AFTER CREATING BOOKING ===${NC}"
get_reports
echo -e "Bookings increased by: ${GREEN}$((TOTAL_BOOKINGS - INITIAL_BOOKINGS))${NC}"

# Start the booking
echo -e "\n${YELLOW}6. Starting the booking...${NC}"
START_RESPONSE=$(curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID/start" \
  -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}✓ Booking started${NC}"

# Complete the booking
echo -e "\n${YELLOW}7. Completing the booking...${NC}"
COMPLETE_RESPONSE=$(curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID/complete" \
  -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}✓ Booking completed${NC}"

# Wait for async processing
echo -e "\n${YELLOW}Waiting for async processing...${NC}"
sleep 3

# Check reports after completing booking
echo -e "\n${YELLOW}=== REPORT STATE AFTER COMPLETING BOOKING ===${NC}"
get_reports

# Calculate differences
REVENUE_DIFF=$(echo "$TOTAL_REVENUE - $INITIAL_REVENUE" | bc)
COMPLETED_DIFF=$((TOTAL_BOOKINGS - INITIAL_BOOKINGS))

echo -e "\n${YELLOW}=== SUMMARY OF CHANGES ===${NC}"
echo -e "Revenue increased by: ${GREEN}$${REVENUE_DIFF}${NC} (should be $${SERVICE_PRICE})"
echo -e "Total bookings increased by: ${GREEN}${COMPLETED_DIFF}${NC}"
echo -e "Completed bookings increased by: ${GREEN}$((COMPLETED_BOOKINGS - INITIAL_COMPLETED))${NC}"

# Test revenue trend
echo -e "\n${YELLOW}8. Testing revenue trend endpoint...${NC}"
TREND=$(curl -s -X GET "$API_URL/v1/reports/revenue-trend?days=7" \
  -H "Authorization: Bearer $TOKEN")
TODAY_REVENUE=$(echo $TREND | jq '.[-1].revenue')
echo -e "Today's revenue in trend: ${GREEN}$${TODAY_REVENUE}${NC}"

# Test top services
echo -e "\n${YELLOW}9. Testing top services endpoint...${NC}"
TOP_SERVICES=$(curl -s -X GET "$API_URL/v1/reports/top-services" \
  -H "Authorization: Bearer $TOKEN")
echo -e "Top services count: ${GREEN}$(echo $TOP_SERVICES | jq '. | length')${NC}"

# Test staff performance
echo -e "\n${YELLOW}10. Testing staff performance endpoint...${NC}"
STAFF_PERF=$(curl -s -X GET "$API_URL/v1/reports/staff-performance" \
  -H "Authorization: Bearer $TOKEN")
echo -e "Staff with performance data: ${GREEN}$(echo $STAFF_PERF | jq '. | length')${NC}"

# Create another booking and cancel it
echo -e "\n${YELLOW}11. Creating another booking to test cancellation...${NC}"
START_TIME2=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%S.000Z")
END_TIME2=$(date -u -d "+3 hours" +"%Y-%m-%dT%H:%M:%S.000Z")

BOOKING_RESPONSE2=$(curl -s -X POST "$API_URL/v2/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"services\": [
      {
        \"serviceId\": \"$SERVICE_ID\",
        \"staffId\": \"$STAFF_ID\",
        \"startTime\": \"$START_TIME2\",
        \"endTime\": \"$END_TIME2\",
        \"price\": $SERVICE_PRICE
      }
    ],
    \"notes\": \"Test booking for cancellation\"
  }")

BOOKING_ID2=$(echo $BOOKING_RESPONSE2 | jq -r '.id')
echo -e "${GREEN}✓ Created booking ID: $BOOKING_ID2${NC}"

# Cancel the booking
echo -e "\n${YELLOW}12. Cancelling the booking...${NC}"
CANCEL_RESPONSE=$(curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID2/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing cancellation"}')
echo -e "${GREEN}✓ Booking cancelled${NC}"

# Wait for processing
sleep 2

# Final report check
echo -e "\n${YELLOW}=== FINAL REPORT STATE ===${NC}"
get_reports

# Get booking stats for verification
echo -e "\n${YELLOW}13. Getting detailed booking stats...${NC}"
BOOKING_STATS=$(curl -s -X GET "$API_URL/v1/reports/bookings" \
  -H "Authorization: Bearer $TOKEN")
echo -e "Cancelled bookings: ${GREEN}$(echo $BOOKING_STATS | jq '.bookings.cancelled')${NC}"
echo -e "Pending bookings: ${GREEN}$(echo $BOOKING_STATS | jq '.bookings.pending')${NC}"

echo -e "\n${GREEN}✅ Report testing completed!${NC}"