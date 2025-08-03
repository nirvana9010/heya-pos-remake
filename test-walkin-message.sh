#!/bin/bash

# Test script for walk-in customer check-in message

echo "=== Testing Walk-in Check-in Message ==="
echo "Date: $(date)"
echo ""

# Test with a new phone number that doesn't exist (use timestamp to ensure uniqueness)
TIMESTAMP=$(date +%s)
TEST_PHONE="04$(echo $TIMESTAMP | tail -c 9)"
TEST_EMAIL="walkin.test.$TIMESTAMP@example.com"
SUBDOMAIN="zen-wellness"

echo "1. Testing check-in with new walk-in customer..."
echo "Phone: $TEST_PHONE"
echo "Email: $TEST_EMAIL"
echo "Subdomain: $SUBDOMAIN"
echo ""

# Create check-in request
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/public/checkin?subdomain=$SUBDOMAIN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "'$TEST_PHONE'",
    "firstName": "Walk",
    "lastName": "InCustomer",
    "email": "'$TEST_EMAIL'"
  }')

echo "Check-in Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if blank booking was created
BLANK_BOOKING_CREATED=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('blankBookingCreated', False))" 2>/dev/null || echo "false")

if [ "$BLANK_BOOKING_CREATED" = "True" ] || [ "$BLANK_BOOKING_CREATED" = "true" ]; then
    echo "✅ SUCCESS: Blank booking was created for walk-in customer!"
    echo ""
    echo "Expected message in booking app:"
    echo "  'Please wait for an available staff member. Thank you for visiting!'"
    echo ""
    echo "Instead of:"
    echo "  'Your appointment for Service with Unassigned is at [time]'"
else
    echo "❌ ERROR: Blank booking was not created"
    echo "Response indicates blankBookingCreated: $BLANK_BOOKING_CREATED"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "Note: To fully test the UI message, check the booking app at:"
echo "http://localhost:3001/checkin?subdomain=$SUBDOMAIN"