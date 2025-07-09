#\!/bin/bash

# Test CORS from different origins
API_URL="${1:-https://heya-pos-remake-production.up.railway.app}"
ORIGIN="${2:-https://booking.heyapos.com}"

echo "Testing CORS from origin: $ORIGIN to API: $API_URL"
echo "----------------------------------------"

# Test preflight request
echo "1. Testing OPTIONS (preflight) request:"
curl -X OPTIONS "$API_URL/api/health" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,x-merchant-subdomain" \
  -v 2>&1  < /dev/null |  grep -E "(< HTTP|< access-control-allow-origin|< access-control-allow-methods|< access-control-allow-headers)"

echo ""
echo "2. Testing GET request:"
curl -X GET "$API_URL/api/health" \
  -H "Origin: $ORIGIN" \
  -v 2>&1 | grep -E "(< HTTP|< access-control-allow-origin)"

echo ""
echo "3. Testing API request with headers:"
curl -X GET "$API_URL/api/services" \
  -H "Origin: $ORIGIN" \
  -H "X-Merchant-Subdomain: hamilton" \
  -v 2>&1 | grep -E "(< HTTP|< access-control-allow-origin)"
