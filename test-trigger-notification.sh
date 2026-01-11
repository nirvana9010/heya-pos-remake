#!/bin/bash

echo "=== Testing Database Trigger → WebSocket Flow ==="
echo ""

# Start WebSocket listener
TOKEN=$(node create-test-token.js | grep "^eyJ" | tr -d '\n')
echo "Starting WebSocket listener..."
node test-websocket.js "$TOKEN" > /tmp/ws-trigger.log 2>&1 &
WS_PID=$!
sleep 2

# Verify connection
if ! grep -q "Connected to WebSocket" /tmp/ws-trigger.log; then
    echo "❌ WebSocket connection failed"
    kill $WS_PID 2>/dev/null
    exit 1
fi
echo "✅ WebSocket connected"

# Get database connection from API env
cd /home/nirvana9010/projects/heya-pos-remake/apps/api
DATABASE_URL=$(grep DATABASE_URL .env | cut -d'=' -f2- | tr -d '"')

echo ""
echo "Finding an existing booking to update..."

# Find a booking to update
BOOKING_ID=$(PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
psql $(echo $DATABASE_URL | sed 's/:6543/:5432/g' | sed 's/?.*//' ) -t -c "SELECT id FROM \"Booking\" WHERE status = 'PENDING' AND \"merchantId\" = 'test-merchant-id-456' LIMIT 1;" 2>/dev/null | grep -v '^$' | tr -d ' ')

if [ -z "$BOOKING_ID" ]; then
    echo "No existing booking found. Creating one..."
    # Create a booking for our test merchant
    BOOKING_ID="test-$(date +%s)"
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
    psql $(echo $DATABASE_URL | sed 's/:6543/:5432/g' | sed 's/?.*//' ) -c "
    INSERT INTO \"Booking\" (
        id, \"customerId\", \"serviceId\", \"providerId\", 
        \"startTime\", \"endTime\", \"status\", \"totalAmount\", 
        \"merchantId\", \"locationId\", \"source\", \"createdAt\", \"updatedAt\"
    ) VALUES (
        '$BOOKING_ID', 'cust-123', 'serv-456', 'prov-789',
        NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours',
        'PENDING', 100.00, 'test-merchant-id-456', 'loc-123',
        'MERCHANT', NOW(), NOW()
    );" 2>/dev/null
    echo "Created booking: $BOOKING_ID"
else
    echo "Found existing booking: $BOOKING_ID"
fi

echo ""
echo "Updating booking status to trigger notification..."

# Update the booking to trigger the database trigger
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
psql $(echo $DATABASE_URL | sed 's/:6543/:5432/g' | sed 's/?.*//' ) -c "
UPDATE \"Booking\" 
SET status = 'CONFIRMED', \"updatedAt\" = NOW() 
WHERE id = '$BOOKING_ID';" 2>/dev/null

echo "Booking updated in database"
echo ""
echo "Waiting for real-time notification..."
sleep 3

# Check WebSocket log
echo ""
echo "=== WebSocket Events Received ==="
grep -E "📅|📝|📬|booking" /tmp/ws-trigger.log | tail -10

# Check if we got the notification
if grep -q "booking_updated\|📝" /tmp/ws-trigger.log; then
    echo ""
    echo "✅ SUCCESS: Real-time notification received via WebSocket!"
else
    echo ""
    echo "⚠️  No booking notification received"
    echo ""
    echo "Checking PostgreSQL NOTIFY logs..."
    pm2 logs api --nostream --lines 50 | grep -E "PostgresListener.*notification|NOTIFY|booking" | tail -10
fi

# Clean up
kill $WS_PID 2>/dev/null
echo ""
echo "Test complete!"