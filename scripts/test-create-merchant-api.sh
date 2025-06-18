#!/bin/bash

echo "🧪 Testing Merchant Creation API"
echo "================================"

# Create a new merchant
echo -e "\n📝 Creating new merchant: Urban Style Salon"
curl -X POST http://localhost:3000/api/v1/admin/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Urban Style Salon",
    "email": "admin@urbanstyle.com",
    "phone": "+61 2 8765 4321",
    "subdomain": "urban-style",
    "username": "URBANSTYLE",
    "password": "demo789",
    "packageName": "Professional",
    "address": "789 Fashion Avenue",
    "suburb": "Bondi",
    "city": "Sydney",
    "state": "NSW",
    "postalCode": "2026"
  }' | python3 -m json.tool

echo -e "\n\n📋 Listing all merchants:"
curl -s http://localhost:3000/api/v1/admin/merchants | python3 -m json.tool | grep -E '"name"|"subdomain"' | head -10

echo -e "\n\n✅ Test complete!"
echo "You can now access the new merchant at:"
echo "http://localhost:3001/urban-style"