#!/bin/bash

# Comprehensive test for auto-complete on payment feature
# Tests multiple scenarios to ensure bookings auto-complete when paid

set -e

echo "=============================================="
echo "Comprehensive Auto-Complete Payment Test"
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

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to authenticate
authenticate() {
    echo "Authenticating..."
    AUTH_RESPONSE=$(curl -s -X POST "$API_URL/v1/auth/merchant/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$MERCHANT_EMAIL\", \"password\": \"$MERCHANT_PASSWORD\"}")
    
    TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo -e "${RED}✗ Failed to authenticate${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Authenticated${NC}"
}

# Function to get test data
get_test_data() {
    # Get service
    SERVICES=$(curl -s "$API_URL/v1/services" \
        -H "Authorization: Bearer $TOKEN")
    SERVICE_ID=$(echo "$SERVICES" | jq -r '.data[1].id')  # Skip check-in service
    
    # Get staff
    STAFF=$(curl -s "$API_URL/v1/staff" \
        -H "Authorization: Bearer $TOKEN")
    STAFF_ID=$(echo "$STAFF" | jq -r '.[0].id')
    
    # Get customer
    CUSTOMERS=$(curl -s "$API_URL/v1/customers" \
        -H "Authorization: Bearer $TOKEN")
    CUSTOMER_ID=$(echo "$CUSTOMERS" | jq -r '.data[0].id')
    
    echo "Test data ready: Service=$SERVICE_ID, Staff=$STAFF_ID, Customer=$CUSTOMER_ID"
}

# Function to create a booking
create_booking() {
    local notes=$1
    local hour=$2
    
    # Use specified hour or random to avoid conflicts
    if [ -z "$hour" ]; then
        hour=$(printf "%02d" $(( ( RANDOM % 6 ) + 1 )))
    fi
    
    local booking_time=$(date '+%Y-%m-%d')T${hour}:00:00Z
    
    BOOKING_DATA='{
        "customerId": "'$CUSTOMER_ID'",
        "staffId": "'$STAFF_ID'",
        "startTime": "'$booking_time'",
        "services": [{
            "serviceId": "'$SERVICE_ID'",
            "staffId": "'$STAFF_ID'"
        }],
        "notes": "'$notes'"
    }'
    
    BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/v2/bookings" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$BOOKING_DATA")
    
    echo "$BOOKING_RESPONSE" | jq -r '.id'
}

# Function to check booking status
check_status() {
    local booking_id=$1
    BOOKING=$(curl -s "$API_URL/v2/bookings/$booking_id" \
        -H "Authorization: Bearer $TOKEN")
    echo "$BOOKING" | jq -r '.status'
}

# Function to mark booking as paid
mark_paid() {
    local booking_id=$1
    curl -s -X POST "$API_URL/v2/bookings/$booking_id/mark-paid" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"paymentMethod": "CASH", "notes": "Test payment"}' > /dev/null
}

# Function to start a booking
start_booking() {
    local booking_id=$1
    curl -s -X PATCH "$API_URL/v2/bookings/$booking_id" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status": "IN_PROGRESS"}' > /dev/null
}

# Function to run a test
run_test() {
    local test_name=$1
    local booking_id=$2
    local initial_status=$3
    local expected_final=$4
    
    echo -n "  $test_name: "
    
    # Get initial status
    local actual_initial=$(check_status "$booking_id")
    
    # Mark as paid
    mark_paid "$booking_id"
    sleep 2
    
    # Check final status
    local final_status=$(check_status "$booking_id")
    
    # Normalize case for comparison
    final_status=$(echo "$final_status" | tr '[:upper:]' '[:lower:]')
    expected_final=$(echo "$expected_final" | tr '[:upper:]' '[:lower:]')
    
    if [ "$final_status" = "$expected_final" ]; then
        echo -e "${GREEN}✓ PASSED${NC} ($actual_initial → $final_status)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_final, got $final_status)"
        ((TESTS_FAILED++))
    fi
}

# Main test execution
echo "Starting comprehensive tests..."
echo ""

# Authenticate
authenticate
echo ""

# Get test data
get_test_data
echo ""

# Test Suite
echo "Running test scenarios:"
echo "----------------------"

# Test 1: Confirmed booking auto-completes when paid
echo "1. Confirmed → Completed (never started)"
BOOKING1=$(create_booking "Test 1: Confirmed to Completed")
if [ ! -z "$BOOKING1" ] && [ "$BOOKING1" != "null" ]; then
    run_test "Confirmed booking" "$BOOKING1" "confirmed" "completed"
else
    echo -e "  ${RED}✗ FAILED${NC} - Could not create booking"
    ((TESTS_FAILED++))
fi

# Test 2: Pending booking auto-completes when paid
echo ""
echo "2. Pending → Completed (never started)"
BOOKING2=$(create_booking "Test 2: Pending to Completed")
if [ ! -z "$BOOKING2" ] && [ "$BOOKING2" != "null" ]; then
    # Update to pending status
    curl -s -X PATCH "$API_URL/v2/bookings/$BOOKING2" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status": "PENDING"}' > /dev/null 2>&1
    
    run_test "Pending booking" "$BOOKING2" "pending" "completed"
else
    echo -e "  ${RED}✗ FAILED${NC} - Could not create booking"
    ((TESTS_FAILED++))
fi

# Test 3: In-progress booking auto-completes when paid
echo ""
echo "3. In-Progress → Completed (started)"
BOOKING3=$(create_booking "Test 3: In-Progress to Completed")
if [ ! -z "$BOOKING3" ] && [ "$BOOKING3" != "null" ]; then
    # Start the booking
    start_booking "$BOOKING3"
    sleep 1
    
    run_test "In-progress booking" "$BOOKING3" "in-progress" "completed"
else
    echo -e "  ${RED}✗ FAILED${NC} - Could not create booking"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "The auto-complete on payment feature is working correctly:"
    echo "- Bookings automatically complete when marked as paid"
    echo "- Works for confirmed, pending, and in-progress bookings"
    echo "- Simplifies workflow by reducing manual steps"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Please check the implementation"
    exit 1
fi