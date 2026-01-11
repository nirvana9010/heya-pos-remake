#!/bin/bash

echo "=== Testing Real-time Notification Flow ==="
echo "This script will:"
echo "1. Start a WebSocket listener"
echo "2. Create a booking"
echo "3. Verify real-time notification is received"
echo ""

# Create test token
TOKEN=$(node create-test-token.js | grep "^eyJ" | tr -d '\n')
echo "Generated test token"

# Start WebSocket listener in background
echo "Starting WebSocket listener..."
node test-websocket.js "$TOKEN" > /tmp/ws-realtime.log 2>&1 &
WS_PID=$!
sleep 2

# Check if connected
if grep -q "Connected to WebSocket" /tmp/ws-realtime.log; then
    echo "✅ WebSocket connected successfully"
else
    echo "❌ WebSocket failed to connect"
    cat /tmp/ws-realtime.log
    kill $WS_PID 2>/dev/null
    exit 1
fi

# Now trigger a database change that should emit an event
echo ""
echo "Triggering database event..."
echo "Inserting test booking into database..."

# Connect to database and insert a test booking
DATABASE_URL=$(grep DATABASE_URL /home/nirvana9010/projects/heya-pos-remake/apps/api/.env | cut -d'=' -f2- | tr -d '"')

# Use psql to insert a test booking
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
psql $(echo $DATABASE_URL | sed 's/:5432/:5432/g' | sed 's/?.*//' | sed 's/postgres:\/\/[^@]*@/postgres:\/\/postgres@/') << EOF
-- Insert a test booking
INSERT INTO "Booking" (
    id, 
    "customerId", 
    "serviceId", 
    "providerId", 
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
    'test-booking-' || gen_random_uuid(),
    'test-customer-id',
    'test-service-id',
    'test-provider-id',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    'PENDING',
    100.00,
    'test-merchant-id-456',
    'test-location-id',
    'MERCHANT',
    NOW(),
    NOW()
);
EOF

echo "Database insert completed"
echo ""

# Wait for notification
echo "Waiting for real-time notification..."
sleep 3

# Check if notification was received
echo ""
echo "=== WebSocket Log ==="
tail -20 /tmp/ws-realtime.log

# Check if booking_created event was received
if grep -q "booking_created\|Booking created" /tmp/ws-realtime.log; then
    echo ""
    echo "✅ SUCCESS: Real-time notification received!"
else
    echo ""
    echo "⚠️  No booking_created event received yet"
    echo "Checking PostgreSQL listener logs..."
    pm2 logs api --nostream --lines 30 | grep -E "PostgresListener|NOTIFY|booking"
fi

# Clean up
kill $WS_PID 2>/dev/null
echo ""
echo "Test complete!"