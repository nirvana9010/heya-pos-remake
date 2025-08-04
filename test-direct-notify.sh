#!/bin/bash

echo "=== Direct Database Trigger Test ==="
echo ""

# Start monitoring API logs for PostgreSQL notifications
echo "Starting log monitor..."
pm2 logs api -f 2>/dev/null | grep -E "PostgresListener|notification|NOTIFY|booking" > /tmp/postgres-notify.log 2>&1 &
MONITOR_PID=$!

# Start WebSocket listener
TOKEN=$(node create-test-token.js | grep "^eyJ" | tr -d '\n')
echo "Starting WebSocket listener..."
node test-websocket.js "$TOKEN" > /tmp/ws-notify.log 2>&1 &
WS_PID=$!
sleep 2

echo "Creating a test booking that should trigger NOTIFY..."

# Create a booking that WILL trigger the notify
BOOKING_ID="notify-test-$(date +%s)"
PGPASSWORD=cUWfqrUuuKlcnDWT psql -h localhost -p 5432 -U postgres -d postgres << EOF
-- Create a booking - this should trigger booking_created NOTIFY
INSERT INTO "Booking" (
    id, 
    "bookingNumber",
    "customerId", 
    "providerId",
    "createdById",
    "startTime", 
    "endTime", 
    "status", 
    "totalAmount", 
    "merchantId", 
    "locationId",
    "source",
    "createdAt",
    "updatedAt"
) VALUES (
    '$BOOKING_ID',
    'TEST-' || EXTRACT(EPOCH FROM NOW())::INTEGER,
    (SELECT id FROM "Customer" LIMIT 1),
    (SELECT id FROM "Staff" LIMIT 1),
    (SELECT id FROM "Staff" LIMIT 1),
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    'PENDING',
    100.00,
    (SELECT id FROM "Merchant" LIMIT 1),
    (SELECT id FROM "Location" LIMIT 1),
    'MERCHANT',
    NOW(),
    NOW()
);

-- Now update it - this should trigger booking_updated NOTIFY
UPDATE "Booking" 
SET status = 'CONFIRMED', "updatedAt" = NOW() 
WHERE id = '$BOOKING_ID';

-- Verify it was created and updated
SELECT id, status FROM "Booking" WHERE id = '$BOOKING_ID';
EOF

echo ""
echo "Database operations complete. Waiting for notifications..."
sleep 3

# Kill the monitor
kill $MONITOR_PID 2>/dev/null

echo ""
echo "=== PostgreSQL Listener Logs ==="
grep -E "Received notification|booking" /tmp/postgres-notify.log | tail -10

echo ""
echo "=== WebSocket Events ==="
grep -E "📅|📝|booking_" /tmp/ws-notify.log | tail -10

# Check if we got both notifications
if grep -q "Received notification" /tmp/postgres-notify.log; then
    echo ""
    echo "✅ PostgreSQL NOTIFY was received by the listener!"
else
    echo ""
    echo "❌ No PostgreSQL NOTIFY received by listener"
fi

if grep -q "booking_created\|booking_updated" /tmp/ws-notify.log; then
    echo "✅ WebSocket client received booking events!"
else
    echo "❌ WebSocket client did not receive booking events"
fi

# Clean up
kill $WS_PID 2>/dev/null
echo ""
echo "Test complete!"