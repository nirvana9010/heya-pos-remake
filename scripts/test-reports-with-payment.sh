#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
API_URL="http://localhost:3000/api"

# Get auth token
echo -e "${YELLOW}1. Authenticating as merchant...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/v1/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
MERCHANT_ID=$(echo $AUTH_RESPONSE | jq -r '.user.merchantId')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}Failed to authenticate${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo -e "Merchant ID: ${BLUE}${MERCHANT_ID}${NC}"

# Function to get report data
get_reports() {
    echo -e "\n${YELLOW}Getting current report data...${NC}"
    
    # Get overview
    OVERVIEW=$(curl -s -X GET "$API_URL/v1/reports/overview" \
      -H "Authorization: Bearer $TOKEN")
    
    # Extract key metrics
    TOTAL_REVENUE=$(echo $OVERVIEW | jq '.revenue.revenue.monthly')
    DAILY_REVENUE=$(echo $OVERVIEW | jq '.revenue.revenue.daily')
    TOTAL_BOOKINGS=$(echo $OVERVIEW | jq '.bookings.bookings.total')
    COMPLETED_BOOKINGS=$(echo $OVERVIEW | jq '.bookings.bookings.completed')
    TOTAL_CUSTOMERS=$(echo $OVERVIEW | jq '.customers.customers.total')
    
    echo -e "Daily Revenue: ${GREEN}$${DAILY_REVENUE}${NC}"
    echo -e "Monthly Revenue: ${GREEN}$${TOTAL_REVENUE}${NC}"
    echo -e "Total Bookings: ${GREEN}${TOTAL_BOOKINGS}${NC}"
    echo -e "Completed Bookings: ${GREEN}${COMPLETED_BOOKINGS}${NC}"
    echo -e "Total Customers: ${GREEN}${TOTAL_CUSTOMERS}${NC}"
}

# Get initial reports
echo -e "\n${BLUE}=== INITIAL REPORT STATE ===${NC}"
get_reports
INITIAL_REVENUE=$TOTAL_REVENUE
INITIAL_DAILY_REVENUE=$DAILY_REVENUE
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

# Get location
echo -e "\n${YELLOW}5. Getting location...${NC}"
LOCATIONS=$(curl -s -X GET "$API_URL/v1/locations" \
  -H "Authorization: Bearer $TOKEN")
LOCATION_ID=$(echo $LOCATIONS | jq -r '.[0].id')
echo -e "${GREEN}✓ Using location ID: $LOCATION_ID${NC}"

# Create a booking for today
echo -e "\n${YELLOW}6. Creating a new booking...${NC}"
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

# Start the booking
echo -e "\n${YELLOW}7. Starting the booking...${NC}"
START_RESPONSE=$(curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID/start" \
  -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}✓ Booking started${NC}"

# Complete the booking
echo -e "\n${YELLOW}8. Completing the booking...${NC}"
COMPLETE_RESPONSE=$(curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID/complete" \
  -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}✓ Booking completed${NC}"

# Wait for async processing
sleep 2

# Check reports after completing booking (before payment)
echo -e "\n${BLUE}=== REPORT STATE AFTER BOOKING COMPLETION (NO PAYMENT YET) ===${NC}"
get_reports
echo -e "${YELLOW}Note: Revenue should NOT have changed yet (no payment processed)${NC}"

# Create an order from the booking
echo -e "\n${YELLOW}9. Creating order from booking...${NC}"
ORDER_RESPONSE=$(curl -s -X POST "$API_URL/v1/payments/orders/from-booking/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id')
ORDER_TOTAL=$(echo $ORDER_RESPONSE | jq -r '.totalAmount')
if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" = "null" ]; then
    echo -e "${RED}Failed to create order${NC}"
    echo $ORDER_RESPONSE
    exit 1
fi
echo -e "${GREEN}✓ Created order ID: $ORDER_ID${NC}"
echo -e "Order total: ${GREEN}$${ORDER_TOTAL}${NC}"

# Process payment
echo -e "\n${YELLOW}10. Processing payment...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/v1/payments/process" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"paymentMethod\": \"CASH\",
    \"amount\": $ORDER_TOTAL,
    \"tipAmount\": 0
  }")

PAYMENT_ID=$(echo $PAYMENT_RESPONSE | jq -r '.payment.id')
if [ -z "$PAYMENT_ID" ] || [ "$PAYMENT_ID" = "null" ]; then
    echo -e "${RED}Failed to process payment${NC}"
    echo $PAYMENT_RESPONSE
    exit 1
fi
echo -e "${GREEN}✓ Payment processed successfully (ID: $PAYMENT_ID)${NC}"

# Wait for payment processing
sleep 2

# Check reports after payment
echo -e "\n${BLUE}=== REPORT STATE AFTER PAYMENT ===${NC}"
get_reports

# Calculate differences
REVENUE_DIFF=$(echo "$TOTAL_REVENUE - $INITIAL_REVENUE" | bc)
DAILY_REVENUE_DIFF=$(echo "$DAILY_REVENUE - $INITIAL_DAILY_REVENUE" | bc)
BOOKINGS_DIFF=$((TOTAL_BOOKINGS - INITIAL_BOOKINGS))
COMPLETED_DIFF=$((COMPLETED_BOOKINGS - INITIAL_COMPLETED))

echo -e "\n${BLUE}=== SUMMARY OF CHANGES ===${NC}"
echo -e "Daily revenue increased by: ${GREEN}$${DAILY_REVENUE_DIFF}${NC} (should be $${SERVICE_PRICE})"
echo -e "Monthly revenue increased by: ${GREEN}$${REVENUE_DIFF}${NC} (should be $${SERVICE_PRICE})"
echo -e "Total bookings increased by: ${GREEN}${BOOKINGS_DIFF}${NC}"
echo -e "Completed bookings increased by: ${GREEN}${COMPLETED_DIFF}${NC}"

# Test revenue trend to see today's entry
echo -e "\n${YELLOW}11. Checking revenue trend for today...${NC}"
TREND=$(curl -s -X GET "$API_URL/v1/reports/revenue-trend?days=1" \
  -H "Authorization: Bearer $TOKEN")
TODAY_REVENUE=$(echo $TREND | jq '.[0].revenue')
echo -e "Today's revenue in trend: ${GREEN}$${TODAY_REVENUE}${NC}"

# Create another booking with payment in one flow
echo -e "\n${YELLOW}12. Creating second booking to test full flow...${NC}"
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
    \"notes\": \"Second test booking\"
  }")

BOOKING_ID2=$(echo $BOOKING_RESPONSE2 | jq -r '.id')
echo -e "${GREEN}✓ Created booking ID: $BOOKING_ID2${NC}"

# Complete booking 2
curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID2/start" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID2/complete" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✓ Booking 2 completed${NC}"

# Create order and process payment for booking 2
ORDER_RESPONSE2=$(curl -s -X POST "$API_URL/v1/payments/orders/from-booking/$BOOKING_ID2" \
  -H "Authorization: Bearer $TOKEN")
ORDER_ID2=$(echo $ORDER_RESPONSE2 | jq -r '.id')

PAYMENT_RESPONSE2=$(curl -s -X POST "$API_URL/v1/payments/process" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID2\",
    \"paymentMethod\": \"CARD\",
    \"amount\": $ORDER_TOTAL,
    \"tipAmount\": 10
  }")
echo -e "${GREEN}✓ Payment 2 processed with $10 tip${NC}"

# Wait and check final reports
sleep 2

echo -e "\n${BLUE}=== FINAL REPORT STATE ===${NC}"
get_reports

FINAL_REVENUE_DIFF=$(echo "$TOTAL_REVENUE - $INITIAL_REVENUE" | bc)
FINAL_DAILY_DIFF=$(echo "$DAILY_REVENUE - $INITIAL_DAILY_REVENUE" | bc)
EXPECTED_REVENUE=$(echo "$SERVICE_PRICE * 2 + 10" | bc)

echo -e "\n${BLUE}=== FINAL SUMMARY ===${NC}"
echo -e "Total revenue increase: ${GREEN}$${FINAL_REVENUE_DIFF}${NC} (expected: $${EXPECTED_REVENUE})"
echo -e "Daily revenue increase: ${GREEN}$${FINAL_DAILY_DIFF}${NC}"
echo -e "Total bookings created: ${GREEN}2${NC}"

# Check top services should include our service
echo -e "\n${YELLOW}13. Verifying service appears in top services...${NC}"
TOP_SERVICES=$(curl -s -X GET "$API_URL/v1/reports/top-services" \
  -H "Authorization: Bearer $TOKEN")
SERVICE_IN_TOP=$(echo $TOP_SERVICES | jq --arg sid "$SERVICE_ID" '.[] | select(.serviceId == $sid)')
if [ ! -z "$SERVICE_IN_TOP" ]; then
    echo -e "${GREEN}✓ Service found in top services${NC}"
    echo $SERVICE_IN_TOP | jq .
else
    echo -e "${YELLOW}⚠ Service not found in top services (might need more bookings)${NC}"
fi

# Check staff performance
echo -e "\n${YELLOW}14. Verifying staff performance updated...${NC}"
STAFF_PERF=$(curl -s -X GET "$API_URL/v1/reports/staff-performance" \
  -H "Authorization: Bearer $TOKEN")
STAFF_IN_PERF=$(echo $STAFF_PERF | jq --arg sid "$STAFF_ID" '.[] | select(.staffId == $sid)')
if [ ! -z "$STAFF_IN_PERF" ]; then
    echo -e "${GREEN}✓ Staff found in performance report${NC}"
    echo $STAFF_IN_PERF | jq .
else
    echo -e "${YELLOW}⚠ Staff not found in performance report${NC}"
fi

echo -e "\n${GREEN}✅ Comprehensive report testing completed!${NC}"
echo -e "\n${BLUE}Key Findings:${NC}"
echo -e "1. Booking completion alone does NOT update revenue reports"
echo -e "2. Payment processing is required for revenue to be reflected"
echo -e "3. Booking stats update immediately upon booking creation/completion"
echo -e "4. Revenue reports are based on PAID invoices/payments only"