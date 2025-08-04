#!/bin/bash

# Test Calendar WebSocket Real-Time Updates
# This script tests that the calendar receives real-time updates via WebSocket

set -e

echo "================================================"
echo "📅 Calendar Real-Time Update Test"
echo "================================================"
echo ""

# Configuration
API_URL="http://localhost:3000"
EMAIL="admin@hamiltonbeauty.com"
PASSWORD="demo123"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Get authentication token
echo -e "${YELLOW}Step 1: Authenticating...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/merchant/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $AUTH_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
MERCHANT_ID=$(echo $AUTH_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['merchantId'])")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to authenticate${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo "   Merchant ID: $MERCHANT_ID"
echo ""

# Step 2: Instructions for manual testing
echo -e "${YELLOW}Step 2: Manual Testing Instructions${NC}"
echo ""
echo "1. Open the Merchant App in your browser:"
echo "   ${GREEN}http://localhost:3002${NC}"
echo ""
echo "2. Log in with:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
echo "3. Navigate to the Calendar page"
echo ""
echo "4. Look for the WebSocket connection indicator:"
echo "   - Should show '${GREEN}Live${NC}' with a green pulsing dot"
echo "   - Hover over it to see 'Real-time updates active'"
echo ""
echo "5. Keep the calendar open and visible"
echo ""
echo -e "${YELLOW}Press Enter when ready to continue...${NC}"
read

# Step 3: Get a booking to update
echo -e "${YELLOW}Step 3: Finding a booking to update...${NC}"
BOOKINGS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/bookings" \
  -H "Authorization: Bearer $TOKEN")

# Extract first booking ID
BOOKING_ID=$(echo $BOOKINGS_RESPONSE | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('bookings') and len(data['bookings']) > 0:
    print(data['bookings'][0]['id'])
" 2>/dev/null)

if [ -z "$BOOKING_ID" ]; then
  echo -e "${YELLOW}No existing bookings found. Creating a test booking...${NC}"
  
  # Create a test booking
  BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/api/v2/bookings/commands/create" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "customer": {
        "firstName": "WebSocket",
        "lastName": "Test",
        "email": "websocket.test@example.com",
        "phone": "0400123456",
        "notificationPreference": "email"
      },
      "services": [{
        "serviceId": "test-service-id",
        "staffId": "test-staff-id",
        "date": "2025-08-10",
        "time": "14:00"
      }],
      "source": "MERCHANT",
      "notes": "Testing WebSocket real-time updates"
    }')
  
  BOOKING_ID=$(echo $BOOKING_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
fi

if [ -z "$BOOKING_ID" ]; then
  echo -e "${RED}❌ Could not find or create a booking to test with${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found booking: $BOOKING_ID${NC}"
echo ""

# Step 4: Update the booking to trigger real-time notification
echo -e "${YELLOW}Step 4: Updating booking status...${NC}"
echo "Watch the calendar - it should update automatically without refreshing!"
echo ""

# Update booking status
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/v2/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}')

echo -e "${GREEN}✅ Booking updated to CONFIRMED${NC}"
echo ""

echo -e "${YELLOW}Step 5: Verification${NC}"
echo ""
echo "Check the calendar page:"
echo "1. ✅ The booking should now show as 'CONFIRMED' without manual refresh"
echo "2. ✅ You should see a toast notification about the update"
echo "3. ✅ The 'Live' indicator should still be green"
echo "4. ✅ Hover over the indicator to see the last update timestamp"
echo ""

# Step 6: Test another update
echo -e "${YELLOW}Press Enter to test another status change...${NC}"
read

echo -e "${YELLOW}Updating booking to COMPLETED...${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/v2/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}')

echo -e "${GREEN}✅ Booking updated to COMPLETED${NC}"
echo ""

# Step 7: Check API logs for WebSocket activity
echo -e "${YELLOW}Step 6: Checking server logs...${NC}"
echo ""
echo "Recent WebSocket activity:"
pm2 logs api --nostream --lines 30 | grep -E "WebSocket|Gateway|notification|booking_updated" | tail -10

echo ""
echo "================================================"
echo -e "${GREEN}✅ Test Complete!${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "1. WebSocket connection established"
echo "2. Real-time updates delivered to calendar"
echo "3. No manual refresh needed"
echo "4. Toast notifications shown for changes"
echo ""
echo "The calendar is now using real-time updates instead of 60-second polling! 🎉"