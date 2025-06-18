#!/bin/bash

echo "🧪 Testing Multi-Tenant Booking App"
echo "=================================="

API_URL="http://localhost:3000/api/v1"

echo ""
echo "1. Testing merchant lookup by subdomain..."
echo ""

# Test Hamilton merchant
echo "📍 Testing 'hamilton' merchant:"
curl -s "$API_URL/public/merchant-info?subdomain=hamilton" | jq '.'

echo ""
echo "📍 Testing invalid merchant:"
curl -s "$API_URL/public/merchant-info?subdomain=invalid-merchant" | jq '.'

echo ""
echo "2. Testing services endpoint with merchant subdomain..."
echo ""
curl -s "$API_URL/public/services?subdomain=hamilton" | jq '.data | length' | xargs -I {} echo "Found {} services for Hamilton"

echo ""
echo "3. Testing staff endpoint with merchant subdomain..."
echo ""
curl -s "$API_URL/public/staff?subdomain=hamilton" | jq '.data | length' | xargs -I {} echo "Found {} staff members for Hamilton"

echo ""
echo "📌 Next Steps:"
echo "1. Visit http://localhost:3001/hamilton in your browser"
echo "2. The booking app should load with Hamilton merchant data"
echo "3. Try an invalid subdomain like http://localhost:3001/invalid-merchant"
echo "4. It should show an error page"

echo ""
echo "📝 To create more test merchants:"
echo "1. Add them to the database with unique subdomains"
echo "2. Access them at http://localhost:3001/[subdomain]"