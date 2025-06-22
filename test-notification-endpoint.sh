#!/bin/bash

echo "Testing notification system via API..."
echo

# First, get auth token
echo "1. Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}')

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "Failed to get auth token"
  exit 1
fi

echo "Got token: ${TOKEN:0:20}..."
echo

# Test creating a booking to trigger notification
echo "2. Creating test booking to trigger notification..."
BOOKING_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v2/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerId": "b3742575-5aa2-45fe-a25a-d4d86e809aff",
    "locationId": "f7e4554d-da25-4162-9f4e-f58c8af73f6b",
    "startTime": "2025-06-25T10:00:00Z",
    "services": [{
      "serviceId": "9ec3601c-ce83-4ff8-b7c5-0eba9b8f8c40",
      "staffId": "2de403f8-fb47-4be2-af83-1765c8a04b1f"
    }],
    "notes": "Test booking for notification system"
  }')

echo "Booking response:"
echo "$BOOKING_RESPONSE" | jq '.' 2>/dev/null || echo "$BOOKING_RESPONSE"
echo

# Check if booking was created
BOOKING_ID=$(echo $BOOKING_RESPONSE | grep -o '"id":"[^"]*' | sed 's/"id":"//')
if [ -n "$BOOKING_ID" ]; then
  echo "✅ Booking created successfully: $BOOKING_ID"
  echo "   Notification should have been triggered!"
else
  echo "❌ Failed to create booking"
fi

echo
echo "Check API logs for notification processing:"
echo "tail -50 logs/api.log | grep -i notification"