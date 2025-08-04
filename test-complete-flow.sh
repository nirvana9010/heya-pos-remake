#!/bin/bash

echo "=== COMPLETE END-TO-END REAL-TIME NOTIFICATION TEST ==="
echo ""

# Use Zen Wellness merchant for testing
MERCHANT_ID="e33c47ba-2711-49ea-a37f-f0d2c45af197"
echo "Using merchant: Zen Wellness Spa ($MERCHANT_ID)"

# Create token for this merchant
TOKEN=$(node create-test-token.js "$MERCHANT_ID" | grep "^eyJ" | tr -d '\n')
echo "Created token for merchant"

# Start WebSocket listener
echo "Starting WebSocket listener..."
node test-websocket.js "$TOKEN" > /tmp/ws-complete.log 2>&1 &
WS_PID=$!
sleep 2

# Verify connection
if ! grep -q "Connected to WebSocket" /tmp/ws-complete.log; then
    echo "❌ WebSocket connection failed"
    cat /tmp/ws-complete.log
    kill $WS_PID 2>/dev/null
    exit 1
fi
echo "✅ WebSocket connected"

# Create a booking
echo ""
echo "Creating a booking to trigger notification..."
BOOKING_ID="complete-test-$(date +%s)"

export PGPASSWORD=cUWfqrUuuKlcnDWT
psql -h localhost -p 5432 -U postgres -d postgres << EOF
INSERT INTO "Booking" (
    id, "bookingNumber", "customerId", "providerId", "createdById",
    "startTime", "endTime", "status", "totalAmount", 
    "merchantId", "locationId", "source", "createdAt", "updatedAt"
) VALUES (
    '$BOOKING_ID',
    'TEST-' || EXTRACT(EPOCH FROM NOW())::INTEGER,
    (SELECT id FROM "Customer" WHERE "merchantId" = '$MERCHANT_ID' LIMIT 1),
    (SELECT id FROM "Staff" WHERE "merchantId" = '$MERCHANT_ID' LIMIT 1),
    (SELECT id FROM "Staff" WHERE "merchantId" = '$MERCHANT_ID' LIMIT 1),
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    'PENDING',
    100.00,
    '$MERCHANT_ID',
    (SELECT id FROM "Location" WHERE "merchantId" = '$MERCHANT_ID' LIMIT 1),
    'MERCHANT',
    NOW(),
    NOW()
);
EOF

echo "✅ Booking created: $BOOKING_ID"
sleep 2

# Check if booking_created was received
echo ""
echo "Checking for booking_created event..."
if grep -q "📅.*Booking created\|booking_created" /tmp/ws-complete.log; then
    echo "✅ Received booking_created notification!"
    grep "📅.*Booking created" /tmp/ws-complete.log | tail -1
else
    echo "⚠️  No booking_created event received yet"
fi

# Now update the booking
echo ""
echo "Updating booking status to CONFIRMED..."
psql -h localhost -p 5432 -U postgres -d postgres -c "UPDATE \"Booking\" SET status = 'CONFIRMED' WHERE id = '$BOOKING_ID';" > /dev/null 2>&1
echo "✅ Booking updated"
sleep 2

# Check if booking_updated was received
echo ""
echo "Checking for booking_updated event..."
if grep -q "📝.*Booking updated\|booking_updated" /tmp/ws-complete.log; then
    echo "✅ Received booking_updated notification!"
    grep "📝.*Booking updated" /tmp/ws-complete.log | tail -1
else
    echo "⚠️  No booking_updated event received yet"
fi

# Show summary
echo ""
echo "=== SUMMARY ==="
echo "WebSocket Events Received:"
grep -E "📅|📝|📬" /tmp/ws-complete.log | wc -l | xargs echo "- Total events:"
grep "📅" /tmp/ws-complete.log | wc -l | xargs echo "- Booking created events:"
grep "📝" /tmp/ws-complete.log | wc -l | xargs echo "- Booking updated events:"

# Check API logs
echo ""
echo "PostgreSQL Listener Activity:"
pm2 logs api --nostream --lines 100 | grep -E "📨.*Received.*notification" | wc -l | xargs echo "- Total notifications processed:"

# Clean up
kill $WS_PID 2>/dev/null
echo ""
echo "✅ TEST COMPLETE!"