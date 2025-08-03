#!/bin/bash

echo "Testing Auto-Complete on Payment"
echo "================================="

# Get auth token
echo "1. Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/auth/merchant/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@hamiltonbeauty.com", "password": "demo123"}')

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
echo "   Token: ${TOKEN:0:50}..."

# Get a service
echo "2. Getting service ID..."
SERVICES=$(curl -s "http://localhost:3000/api/v1/services" \
    -H "Authorization: Bearer $TOKEN")
SERVICE_ID=$(echo "$SERVICES" | jq -r '.data[1].id')
echo "   Service ID: $SERVICE_ID"

# Get a staff member  
echo "3. Getting staff ID..."
STAFF=$(curl -s "http://localhost:3000/api/v1/staff" \
    -H "Authorization: Bearer $TOKEN")
STAFF_ID=$(echo "$STAFF" | jq -r '.[0].id')
echo "   Staff ID: $STAFF_ID"

# Get or create a customer
echo "4. Getting customer ID..."
CUSTOMERS=$(curl -s "http://localhost:3000/api/v1/customers" \
    -H "Authorization: Bearer $TOKEN")
CUSTOMER_ID=$(echo "$CUSTOMERS" | jq -r '.data[0].id')
echo "   Customer ID: $CUSTOMER_ID"

# Create a PENDING booking
echo "5. Creating PENDING booking..."
# Use a random time slot to avoid conflicts (11:00 AM Sydney time = 00:00 UTC)
RANDOM_HOUR=$(( ( RANDOM % 6 ) + 1 ))  # 1-6 hours from midnight UTC
TODAY_TIME=$(date '+%Y-%m-%d')T0${RANDOM_HOUR}:00:00Z
BOOKING_DATA='{
    "customerId": "'$CUSTOMER_ID'",
    "staffId": "'$STAFF_ID'",
    "startTime": "'$TODAY_TIME'",
    "services": [{
        "serviceId": "'$SERVICE_ID'",
        "staffId": "'$STAFF_ID'"
    }],
    "notes": "Testing auto-complete on payment"
}'

BOOKING_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v2/bookings" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BOOKING_DATA")

BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.id')
echo "   Created booking: $BOOKING_ID"
if [ "$BOOKING_ID" = "null" ] || [ -z "$BOOKING_ID" ]; then
    echo "   ERROR: Failed to create booking"
    echo "   Response: $(echo "$BOOKING_RESPONSE" | jq -c '.')"
    exit 1
fi

# Check initial status
echo "6. Checking initial status..."
BOOKING_CHECK=$(curl -s "http://localhost:3000/api/v2/bookings/$BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")
INITIAL_STATUS=$(echo "$BOOKING_CHECK" | jq -r '.status')
echo "   Initial status: $INITIAL_STATUS"

# Mark as paid
echo "7. Marking booking as paid..."
PAYMENT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v2/bookings/$BOOKING_ID/mark-paid" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"paymentMethod": "CASH", "notes": "Test payment"}')

echo "   Payment response: $(echo "$PAYMENT_RESPONSE" | jq -c '.')"

# Wait a moment for processing
sleep 2

# Check final status
echo "8. Checking final status..."
BOOKING_FINAL=$(curl -s "http://localhost:3000/api/v2/bookings/$BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")
FINAL_STATUS=$(echo "$BOOKING_FINAL" | jq -r '.status')
echo "   Final status: $FINAL_STATUS"

# Result
echo ""
if [ "$FINAL_STATUS" = "completed" ] || [ "$FINAL_STATUS" = "COMPLETED" ]; then
    echo "✅ SUCCESS: Booking auto-completed from $INITIAL_STATUS to $FINAL_STATUS"
else
    echo "❌ FAILED: Expected completed, got $FINAL_STATUS"
fi