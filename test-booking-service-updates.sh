#!/bin/bash

# Test script for booking service updates after validation fix
# Tests the complete flow: get booking, add service, verify update

echo "=== BOOKING SERVICE UPDATE TEST ==="
echo "Date: $(date)"
echo ""

# Get auth token
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "lukas.tn90@gmail.com", "password": "demo456"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi
echo "✅ Got auth token: ${TOKEN:0:20}..."
echo ""

# Get a booking to test with
echo "2. Getting available bookings..."
BOOKINGS_RESPONSE=$(curl -s "http://localhost:3000/api/v2/bookings?limit=5" \
  -H "Authorization: Bearer $TOKEN")

BOOKING_ID=$(echo $BOOKINGS_RESPONSE | jq -r '.data[0].id // empty')
if [ -z "$BOOKING_ID" ]; then
  echo "❌ No bookings found"
  echo "Response: $BOOKINGS_RESPONSE"
  exit 1
fi
echo "✅ Found booking ID: $BOOKING_ID"
echo ""

# Get booking details before update
echo "3. Getting booking details before update..."
BEFORE_RESPONSE=$(curl -s "http://localhost:3000/api/v2/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN")

BEFORE_SERVICES=$(echo $BEFORE_RESPONSE | jq '.services // []')
BEFORE_COUNT=$(echo $BEFORE_SERVICES | jq 'length')
CURRENT_SERVICE_ID=$(echo $BEFORE_RESPONSE | jq -r '.services[0].serviceId // .serviceId')
CURRENT_STAFF_ID=$(echo $BEFORE_RESPONSE | jq -r '.staffId // .providerId')
CURRENT_START_TIME=$(echo $BEFORE_RESPONSE | jq -r '.startTime')

# Use a default staff ID if none found
if [ "$CURRENT_STAFF_ID" = "null" ] || [ -z "$CURRENT_STAFF_ID" ]; then
  CURRENT_STAFF_ID="d89f64c2-6705-4b87-889f-6fda6c599b33"  # Default staff
  echo "⚠️  No staff ID found, using default: $CURRENT_STAFF_ID"
fi

echo "📋 Current booking state:"
echo "   - Services count: $BEFORE_COUNT"
echo "   - Current service ID: $CURRENT_SERVICE_ID"
echo "   - Staff ID: $CURRENT_STAFF_ID"
echo "   - Start time: $CURRENT_START_TIME"
echo ""

# Use a known service ID for testing (from the actual database)
echo "4. Using known service for testing..."
NEW_SERVICE_ID="ea6fc43f-112e-40ff-96d7-e2ca36e646c2"  # Deep Tissue Massage
NEW_SERVICE_NAME="Deep Tissue Massage"
NEW_SERVICE_PRICE=110
NEW_SERVICE_DURATION=60

if [ "$NEW_SERVICE_ID" = "$CURRENT_SERVICE_ID" ]; then
  # If current service is the same, use a different one
  NEW_SERVICE_ID="9af7bc64-d8b8-499e-b2c3-cdbe0ac8cd53"  # Reiki Healing
  NEW_SERVICE_NAME="Reiki Healing" 
  NEW_SERVICE_PRICE=95
  NEW_SERVICE_DURATION=60
fi

echo "✅ Will add service: $NEW_SERVICE_NAME ($NEW_SERVICE_ID)"
echo "   - Price: $NEW_SERVICE_PRICE"
echo "   - Duration: $NEW_SERVICE_DURATION"
echo ""

# Create the multi-service update payload
echo "5. Creating multi-service update payload..."
UPDATE_PAYLOAD=$(cat <<EOF
{
  "startTime": "$CURRENT_START_TIME",
  "staffId": "$CURRENT_STAFF_ID",
  "services": [
    {
      "serviceId": "$CURRENT_SERVICE_ID",
      "staffId": "$CURRENT_STAFF_ID",
      "price": $(echo $BEFORE_RESPONSE | jq '.price // .totalAmount'),
      "duration": $(echo $BEFORE_RESPONSE | jq '.duration')
    },
    {
      "serviceId": "$NEW_SERVICE_ID", 
      "staffId": "$CURRENT_STAFF_ID",
      "price": $NEW_SERVICE_PRICE,
      "duration": $NEW_SERVICE_DURATION
    }
  ],
  "notes": "Test: Added service via API test script"
}
EOF
)

echo "📤 Update payload:"
echo "$UPDATE_PAYLOAD" | jq .
echo ""

# Send the update request
echo "6. Sending booking update request..."
UPDATE_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X PATCH \
  "http://localhost:3000/api/v2/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD")

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "🌐 Response status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Update request successful!"
  echo ""
  
  # Parse the response
  UPDATED_SERVICES=$(echo $RESPONSE_BODY | jq '.services // []')
  UPDATED_COUNT=$(echo $UPDATED_SERVICES | jq 'length')
  UPDATED_TOTAL=$(echo $RESPONSE_BODY | jq '.totalAmount // .price')
  UPDATED_DURATION=$(echo $RESPONSE_BODY | jq '.duration')
  
  echo "📋 Updated booking state:"
  echo "   - Services count: $UPDATED_COUNT (was $BEFORE_COUNT)"
  echo "   - Total amount: $UPDATED_TOTAL"
  echo "   - Total duration: $UPDATED_DURATION"
  echo "   - Services: $(echo $UPDATED_SERVICES | jq -r '.[] | .name // .serviceId' | tr '\n' ', ' | sed 's/,$//')"
  echo ""
  
  # Verify the update
  echo "7. Verifying update by fetching booking again..."
  sleep 1
  VERIFY_RESPONSE=$(curl -s "http://localhost:3000/api/v2/bookings/$BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  VERIFY_SERVICES=$(echo $VERIFY_RESPONSE | jq '.services // []')
  VERIFY_COUNT=$(echo $VERIFY_SERVICES | jq 'length')
  
  if [ "$VERIFY_COUNT" -gt "$BEFORE_COUNT" ]; then
    echo "✅ SUCCESS: Booking now has $VERIFY_COUNT services (was $BEFORE_COUNT)"
    echo "✅ Multi-service booking update working correctly!"
    echo ""
    echo "🎉 TEST PASSED: Booking service updates are now working!"
  else
    echo "❌ FAILURE: Service count didn't increase ($VERIFY_COUNT vs expected >$BEFORE_COUNT)"
    echo "❌ The update may not have persisted properly"
  fi
  
else
  echo "❌ Update request failed with status $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
  
  # Try to parse error details
  ERROR_MSG=$(echo $RESPONSE_BODY | jq -r '.message // .errorMessage // "Unknown error"')
  echo "Error: $ERROR_MSG"
fi

echo ""
echo "=== TEST COMPLETE ==="