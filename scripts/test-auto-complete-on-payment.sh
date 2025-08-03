#!/bin/bash

# Test script to verify auto-complete behavior when bookings are paid
# Tests that confirmed/pending bookings auto-complete even if never started

set -e

echo "=============================================="
echo "Testing Auto-Complete on Payment Feature"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Configuration
API_URL="http://localhost:3000/api"
MERCHANT_EMAIL="admin@hamiltonbeauty.com"
MERCHANT_PASSWORD="demo123"

# Function to get auth token
get_auth_token() {
    echo "Authenticating as merchant..."
    AUTH_RESPONSE=$(curl -s -X POST "$API_URL/v1/auth/merchant/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$MERCHANT_EMAIL\", \"password\": \"$MERCHANT_PASSWORD\"}")
    
    TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo -e "${RED}✗ Failed to authenticate${NC}"
        echo "Response: $AUTH_RESPONSE"
        exit 1
    fi
    echo -e "${GREEN}✓ Authenticated successfully${NC}"
    echo ""
}

# Function to create a test booking
create_test_booking() {
    local status=$1
    local customer_name=$2
    
    echo "Creating $status test booking for $customer_name..."
    
    # Get first service and staff
    SERVICES=$(curl -s "$API_URL/v1/services" \
        -H "Authorization: Bearer $TOKEN")
    
    SERVICE_ID=$(echo "$SERVICES" | jq -r '.data[1].id')  # Skip check-in service at index 0
    
    # Get first staff member (staff endpoint returns array directly, not wrapped in data)
    STAFF_RESPONSE=$(curl -s "$API_URL/v1/staff" \
        -H "Authorization: Bearer $TOKEN")
    STAFF_ID=$(echo "$STAFF_RESPONSE" | jq -r '.[0].id')
    
    # Create booking with specific status
    BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/v2/bookings/commands/create" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"customer\": {
                \"firstName\": \"$customer_name\",
                \"lastName\": \"AutoComplete\",
                \"phone\": \"0400123456\",
                \"email\": \"test@example.com\"
            },
            \"services\": [{
                \"serviceId\": \"$SERVICE_ID\",
                \"staffId\": \"$STAFF_ID\",
                \"date\": \"$(date -d '+1 day' '+%Y-%m-%d')\",
                \"time\": \"14:00\"
            }],
            \"source\": \"MERCHANT\",
            \"notes\": \"Testing auto-complete on payment - $status booking\"
        }")
    
    BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.id')
    
    if [ "$BOOKING_ID" = "null" ] || [ -z "$BOOKING_ID" ]; then
        echo -e "${RED}✗ Failed to create booking${NC}"
        echo "Response: $BOOKING_RESPONSE"
        return 1
    fi
    
    # Set booking to desired status if not already pending
    if [ "$status" = "CONFIRMED" ]; then
        curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING_ID" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"CONFIRMED\"}" > /dev/null
    fi
    
    echo "$BOOKING_ID"
}

# Function to check booking status
check_booking_status() {
    local booking_id=$1
    
    BOOKING=$(curl -s "$API_URL/v2/bookings/$booking_id" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "$BOOKING" | jq -r '.status'
}

# Function to mark booking as paid
mark_as_paid() {
    local booking_id=$1
    
    echo "Marking booking as paid..."
    PAYMENT_RESPONSE=$(curl -s -X PATCH "$API_URL/v2/bookings/$booking_id/payment" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"paymentStatus\": \"PAID\",
            \"paymentMethod\": \"CASH\"
        }")
    
    # Check if request was successful
    if echo "$PAYMENT_RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ Failed to mark as paid${NC}"
        echo "Response: $PAYMENT_RESPONSE"
        return 1
    fi
    
    return 0
}

# Main test flow
echo "Starting auto-complete on payment tests..."
echo ""

# Get auth token
get_auth_token

# Test 1: Pending booking auto-completes when paid
echo "================================================"
echo "Test 1: PENDING booking auto-completes on payment"
echo "================================================"

PENDING_ID=$(create_test_booking "PENDING" "PendingTest")
if [ ! -z "$PENDING_ID" ] && [ "$PENDING_ID" != "null" ]; then
    echo "Created pending booking: $PENDING_ID"
    
    # Check initial status
    INITIAL_STATUS=$(check_booking_status "$PENDING_ID")
    echo "Initial status: $INITIAL_STATUS"
    
    # Mark as paid
    if mark_as_paid "$PENDING_ID"; then
        # Wait for processing
        sleep 2
        
        # Check final status
        FINAL_STATUS=$(check_booking_status "$PENDING_ID")
        echo "Final status after payment: $FINAL_STATUS"
        
        if [ "$FINAL_STATUS" = "COMPLETED" ]; then
            echo -e "${GREEN}✓ Test 1 PASSED: Pending booking auto-completed${NC}"
        else
            echo -e "${RED}✗ Test 1 FAILED: Expected COMPLETED, got $FINAL_STATUS${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Test 1 FAILED: Could not create pending booking${NC}"
fi

echo ""

# Test 2: Confirmed booking auto-completes when paid
echo "================================================"
echo "Test 2: CONFIRMED booking auto-completes on payment"
echo "================================================"

CONFIRMED_ID=$(create_test_booking "CONFIRMED" "ConfirmedTest")
if [ ! -z "$CONFIRMED_ID" ] && [ "$CONFIRMED_ID" != "null" ]; then
    echo "Created confirmed booking: $CONFIRMED_ID"
    
    # Check initial status
    INITIAL_STATUS=$(check_booking_status "$CONFIRMED_ID")
    echo "Initial status: $INITIAL_STATUS"
    
    # Mark as paid
    if mark_as_paid "$CONFIRMED_ID"; then
        # Wait for processing
        sleep 2
        
        # Check final status
        FINAL_STATUS=$(check_booking_status "$CONFIRMED_ID")
        echo "Final status after payment: $FINAL_STATUS"
        
        if [ "$FINAL_STATUS" = "COMPLETED" ]; then
            echo -e "${GREEN}✓ Test 2 PASSED: Confirmed booking auto-completed${NC}"
        else
            echo -e "${RED}✗ Test 2 FAILED: Expected COMPLETED, got $FINAL_STATUS${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Test 2 FAILED: Could not create confirmed booking${NC}"
fi

echo ""

# Test 3: In-progress booking completes when paid (existing behavior)
echo "================================================"
echo "Test 3: IN_PROGRESS booking completes on payment"
echo "================================================"

IN_PROGRESS_ID=$(create_test_booking "CONFIRMED" "InProgressTest")
if [ ! -z "$IN_PROGRESS_ID" ] && [ "$IN_PROGRESS_ID" != "null" ]; then
    echo "Created booking: $IN_PROGRESS_ID"
    
    # Start the booking
    echo "Starting booking..."
    curl -s -X PATCH "$API_URL/v2/bookings/$IN_PROGRESS_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"status\": \"IN_PROGRESS\"}" > /dev/null
    
    # Check status after starting
    INITIAL_STATUS=$(check_booking_status "$IN_PROGRESS_ID")
    echo "Status after starting: $INITIAL_STATUS"
    
    # Mark as paid
    if mark_as_paid "$IN_PROGRESS_ID"; then
        # Wait for processing
        sleep 2
        
        # Check final status
        FINAL_STATUS=$(check_booking_status "$IN_PROGRESS_ID")
        echo "Final status after payment: $FINAL_STATUS"
        
        if [ "$FINAL_STATUS" = "COMPLETED" ]; then
            echo -e "${GREEN}✓ Test 3 PASSED: In-progress booking auto-completed${NC}"
        else
            echo -e "${RED}✗ Test 3 FAILED: Expected COMPLETED, got $FINAL_STATUS${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Test 3 FAILED: Could not create booking${NC}"
fi

echo ""
echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo "All tests verify that bookings auto-complete when marked as paid,"
echo "regardless of whether they were started or not."
echo ""
echo "This ensures a simplified workflow where payment automatically"
echo "completes the service, reducing manual steps for staff."