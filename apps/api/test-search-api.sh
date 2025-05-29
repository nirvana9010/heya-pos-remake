#!/bin/bash

MERCHANT_ID="cmb510apf0003voculb1wkfzz"

echo "Testing Service Search API..."
echo "=============================="

echo -e "\n1. Search for 'facial' (lowercase):"
curl -s "http://localhost:3000/api/services?searchTerm=facial" \
  -H "x-merchant-id: $MERCHANT_ID" | \
  grep -o '"name":"[^"]*"' | head -5

echo -e "\n2. Search for 'FACIAL' (uppercase):"
curl -s "http://localhost:3000/api/services?searchTerm=FACIAL" \
  -H "x-merchant-id: $MERCHANT_ID" | \
  grep -o '"name":"[^"]*"' | head -5

echo -e "\n3. Search for 'FaCiAl' (mixed case):"
curl -s "http://localhost:3000/api/services?searchTerm=FaCiAl" \
  -H "x-merchant-id: $MERCHANT_ID" | \
  grep -o '"name":"[^"]*"' | head -5

echo -e "\n\nTesting Customer Search API..."
echo "=============================="

echo -e "\n1. Search for 'jane' (lowercase):"
curl -s "http://localhost:3000/api/api/customers?search=jane" \
  -H "x-merchant-id: $MERCHANT_ID" | \
  grep -o '"firstName":"[^"]*"' | head -5

echo -e "\n2. Search for 'JANE' (uppercase):"
curl -s "http://localhost:3000/api/api/customers?search=JANE" \
  -H "x-merchant-id: $MERCHANT_ID" | \
  grep -o '"firstName":"[^"]*"' | head -5