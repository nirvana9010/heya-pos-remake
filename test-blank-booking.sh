#!/bin/bash

# Test script for blank booking creation during check-in

echo "=== Testing Blank Booking Creation ==="
echo "Date: $(date)"
echo ""

# Test with a new phone number that doesn't exist (use timestamp to ensure uniqueness)
TIMESTAMP=$(date +%s)
TEST_PHONE="04$(echo $TIMESTAMP | tail -c 9)"
TEST_EMAIL="test.blank.$TIMESTAMP@example.com"
SUBDOMAIN="zen-wellness"

echo "1. Testing check-in with new customer (should create blank booking)..."
echo "Phone: $TEST_PHONE"
echo "Subdomain: $SUBDOMAIN"
echo ""

# Create check-in request
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/public/checkin?subdomain=$SUBDOMAIN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "'$TEST_PHONE'",
    "firstName": "Test",
    "lastName": "BlankBooking",
    "email": "'$TEST_EMAIL'"
  }')

echo "Check-in Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if blank booking was created
BLANK_BOOKING_CREATED=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('blankBookingCreated', False))" 2>/dev/null || echo "false")

if [ "$BLANK_BOOKING_CREATED" = "True" ] || [ "$BLANK_BOOKING_CREATED" = "true" ]; then
    echo "✅ SUCCESS: Blank booking was created for walk-in customer!"
    
    # Extract customer ID to check bookings
    CUSTOMER_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['customer']['id'])" 2>/dev/null)
    
    if [ ! -z "$CUSTOMER_ID" ]; then
        echo ""
        echo "2. Verifying booking was created..."
        echo "Customer ID: $CUSTOMER_ID"
        
        # Check today's bookings for this customer
        BOOKINGS_RESPONSE=$(curl -s "http://localhost:3000/api/v1/public/customers/$CUSTOMER_ID/bookings?subdomain=$SUBDOMAIN")
        echo ""
        echo "Today's Bookings Response:"
        echo "$BOOKINGS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BOOKINGS_RESPONSE"
        
        # Count bookings
        BOOKING_COUNT=$(echo "$BOOKINGS_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('bookings', [])))" 2>/dev/null || echo "0")
        
        if [ "$BOOKING_COUNT" -gt "0" ]; then
            echo ""
            echo "✅ SUCCESS: Found $BOOKING_COUNT booking(s) for the customer!"
        else
            echo "❌ ERROR: No bookings found for customer even though blank booking was reported as created"
        fi
    fi
else
    echo "❌ ERROR: Blank booking was not created"
    echo "Response indicates blankBookingCreated: $BLANK_BOOKING_CREATED"
fi

echo ""
echo "=== Test Complete ==="