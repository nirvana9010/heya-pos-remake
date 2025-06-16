#!/bin/bash

echo "🚀 Testing Booking API Flow"
echo "=========================="
echo ""

# Base URLs
API_URL="http://localhost:3000/api/v1"
BOOKING_URL="http://localhost:3001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local description="$1"
    local response="$2"
    local expected="$3"
    
    if [[ "$response" == *"$expected"* ]]; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Response: $response"
    fi
}

echo "1️⃣ Testing Public API Endpoints"
echo "--------------------------------"

# Get services
echo "Testing GET /public/services..."
SERVICES=$(curl -s "$API_URL/public/services")
test_endpoint "Services endpoint returns data" "$SERVICES" "data"

# Extract service IDs for testing
FACIAL_ID=$(echo "$SERVICES" | grep -o '"id":"[^"]*","name":"Classic Facial"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
MASSAGE_ID=$(echo "$SERVICES" | grep -o '"id":"[^"]*","name":"Swedish Massage"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo "  - Found Classic Facial ID: $FACIAL_ID"
echo "  - Found Swedish Massage ID: $MASSAGE_ID"
echo ""

# Get staff
echo "Testing GET /public/staff..."
STAFF=$(curl -s "$API_URL/public/staff")
test_endpoint "Staff endpoint returns data" "$STAFF" "data"
echo ""

# Get merchant info
echo "Testing GET /public/merchant-info..."
MERCHANT=$(curl -s "$API_URL/public/merchant-info")
test_endpoint "Merchant info endpoint returns data" "$MERCHANT" "timezone"
echo ""

echo "2️⃣ Testing Availability Check"
echo "-----------------------------"

# Check availability for multiple services
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
echo "Checking availability for $TOMORROW..."

AVAILABILITY_PAYLOAD=$(cat <<EOF
{
  "date": "$TOMORROW",
  "services": [
    {"serviceId": "$FACIAL_ID"},
    {"serviceId": "$MASSAGE_ID"}
  ]
}
EOF
)

AVAILABILITY=$(curl -s -X POST "$API_URL/public/bookings/check-availability" \
  -H "Content-Type: application/json" \
  -d "$AVAILABILITY_PAYLOAD")

test_endpoint "Availability check returns slots" "$AVAILABILITY" "slots"
echo ""

echo "3️⃣ Testing Multi-Service Booking Creation"
echo "-----------------------------------------"

# Create a booking with multiple services
BOOKING_PAYLOAD=$(cat <<EOF
{
  "customerName": "Test User",
  "customerEmail": "test$(date +%s)@example.com",
  "customerPhone": "0412345678",
  "services": [
    {"serviceId": "$FACIAL_ID"},
    {"serviceId": "$MASSAGE_ID"}
  ],
  "date": "$TOMORROW",
  "startTime": "10:00",
  "notes": "Multi-service booking test"
}
EOF
)

echo "Creating booking with payload:"
echo "$BOOKING_PAYLOAD" | jq . 2>/dev/null || echo "$BOOKING_PAYLOAD"
echo ""

BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/public/bookings" \
  -H "Content-Type: application/json" \
  -d "$BOOKING_PAYLOAD")

# Check if booking was created successfully
if [[ "$BOOKING_RESPONSE" == *"bookingNumber"* ]]; then
    echo -e "${GREEN}✓${NC} Multi-service booking created successfully!"
    BOOKING_ID=$(echo "$BOOKING_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    BOOKING_NUMBER=$(echo "$BOOKING_RESPONSE" | grep -o '"bookingNumber":"[^"]*"' | cut -d'"' -f4)
    echo "  - Booking ID: $BOOKING_ID"
    echo "  - Booking Number: $BOOKING_NUMBER"
    
    # Check if both services are included
    if [[ "$BOOKING_RESPONSE" == *"Classic Facial"* ]] && [[ "$BOOKING_RESPONSE" == *"Swedish Massage"* ]]; then
        echo -e "${GREEN}✓${NC} Both services included in booking"
    else
        echo -e "${RED}✗${NC} Services missing from booking response"
    fi
    
    # Check total price
    if [[ "$BOOKING_RESPONSE" == *"totalPrice"* ]]; then
        TOTAL_PRICE=$(echo "$BOOKING_RESPONSE" | grep -o '"totalPrice":[0-9.]*' | cut -d':' -f2)
        echo "  - Total Price: $TOTAL_PRICE"
    fi
else
    echo -e "${RED}✗${NC} Failed to create booking"
    echo "Response: $BOOKING_RESPONSE"
fi

echo ""
echo "4️⃣ Testing Booking Page Load"
echo "----------------------------"

# Test if booking page loads without errors
BOOKING_PAGE=$(curl -s "$BOOKING_URL/booking" | head -100)
if [[ "$BOOKING_PAGE" == *"Book Your Appointment"* ]] && [[ "$BOOKING_PAGE" != *"ReferenceError"* ]]; then
    echo -e "${GREEN}✓${NC} Booking page loads without errors"
else
    echo -e "${RED}✗${NC} Booking page has errors"
    if [[ "$BOOKING_PAGE" == *"ReferenceError"* ]]; then
        echo "  Found ReferenceError in page"
    fi
fi

echo ""
echo "✅ Testing complete!"