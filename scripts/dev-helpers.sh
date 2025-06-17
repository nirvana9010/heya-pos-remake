#!/bin/bash

# Development helper functions
# Source this file to use: source scripts/dev-helpers.sh

# API base URL
export API_URL="${API_URL:-http://localhost:3000}"

# Get the dev token from .env.local
export DEV_TOKEN=$(grep "DEV_MERCHANT_TOKEN=" apps/merchant-app/.env.local | cut -d'=' -f2)

# Helper function for authenticated API calls
api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$DEV_TOKEN" ]; then
        echo "Error: No dev token found. Run: ./scripts/dev-auth.sh get"
        return 1
    fi
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $DEV_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL/api/$endpoint" | python3 -m json.tool
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $DEV_TOKEN" \
            "$API_URL/api/$endpoint" | python3 -m json.tool
    fi
}

# Shortcuts for common operations
get_bookings() {
    echo "📅 Fetching bookings..."
    api GET "v2/bookings?limit=${1:-10}"
}

get_booking() {
    if [ -z "$1" ]; then
        echo "Usage: get_booking <booking-id>"
        return 1
    fi
    echo "📋 Fetching booking $1..."
    api GET "v2/bookings/$1"
}

get_services() {
    echo "✨ Fetching services..."
    api GET "v1/services"
}

get_customers() {
    echo "👥 Fetching customers..."
    api GET "v1/customers?limit=${1:-10}"
}

create_test_booking() {
    echo "🆕 Creating test booking..."
    local tomorrow=$(date -d tomorrow +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
    
    api POST "v1/public/bookings" '{
        "customerName": "Test Customer",
        "customerEmail": "test'$(date +%s)'@example.com",
        "customerPhone": "0400000000",
        "services": [
            {"serviceId": "580115e6-6a6b-4eee-af47-161c9ca48c3d"},
            {"serviceId": "fe283936-b595-45e9-9132-a161d88b27d9"}
        ],
        "date": "'$tomorrow'",
        "startTime": "14:00"
    }'
}

# Show available commands
dev_help() {
    echo "🛠️  Development Helper Commands"
    echo "=============================="
    echo ""
    echo "API Commands:"
    echo "  api <method> <endpoint> [data]  - Make authenticated API call"
    echo "  get_bookings [limit]            - Get recent bookings (default: 10)"
    echo "  get_booking <id>                - Get specific booking details"
    echo "  get_services                    - Get all services"
    echo "  get_customers [limit]           - Get customers (default: 10)"
    echo "  create_test_booking             - Create a test booking"
    echo ""
    echo "Token Management:"
    echo "  ./scripts/dev-auth.sh get       - Get new auth token"
    echo "  ./scripts/dev-auth.sh test      - Test current token"
    echo ""
    echo "Examples:"
    echo "  api GET v2/bookings"
    echo "  api POST v1/services '{\"name\":\"Test Service\"}'"
    echo "  get_booking 93e1a2c2-beda-4506-85a4-29d49b824e7c"
}

echo "✅ Development helpers loaded. Type 'dev_help' for commands."