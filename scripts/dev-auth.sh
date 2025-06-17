#!/bin/bash

# Development authentication helper script
# This script helps with authentication during development

echo "🔐 Development Authentication Helper"
echo "=================================="

# Base URLs
API_URL="${API_URL:-http://localhost:3000}"
MERCHANT_URL="${MERCHANT_URL:-http://localhost:3002}"

# Function to login and get token
get_merchant_token() {
    echo "Getting merchant token..."
    RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/merchant/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "HAMILTON", "password": "demo123"}')
    
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        echo "✅ Token obtained successfully"
        echo "$TOKEN" > /tmp/merchant-token.txt
        echo ""
        echo "Token saved to: /tmp/merchant-token.txt"
        echo "Use in requests: curl -H \"Authorization: Bearer \$(cat /tmp/merchant-token.txt)\" ..."
        echo ""
        echo "Token (for copying):"
        echo "$TOKEN"
    else
        echo "❌ Failed to get token"
        echo "Response: $RESPONSE"
    fi
}

# Function to test token
test_token() {
    if [ -f /tmp/merchant-token.txt ]; then
        TOKEN=$(cat /tmp/merchant-token.txt)
        echo "Testing saved token..."
        
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            "$API_URL/api/v1/auth/me")
        
        HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
        
        if [ "$HTTP_STATUS" = "200" ]; then
            echo "✅ Token is valid"
        else
            echo "❌ Token is invalid or expired"
            echo "Getting new token..."
            get_merchant_token
        fi
    else
        echo "No saved token found"
        get_merchant_token
    fi
}

# Main menu
case "${1:-test}" in
    "get")
        get_merchant_token
        ;;
    "test")
        test_token
        ;;
    "export")
        if [ -f /tmp/merchant-token.txt ]; then
            TOKEN=$(cat /tmp/merchant-token.txt)
            echo "export MERCHANT_TOKEN=\"$TOKEN\""
            echo ""
            echo "Run: eval \$(./scripts/dev-auth.sh export)"
        else
            echo "No token found. Run: ./scripts/dev-auth.sh get"
        fi
        ;;
    *)
        echo "Usage: $0 {get|test|export}"
        echo "  get    - Get new merchant token"
        echo "  test   - Test existing token (get new if invalid)"
        echo "  export - Export token as environment variable"
        ;;
esac