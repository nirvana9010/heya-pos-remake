#!/bin/bash

echo "🔍 Debugging Merchant Count Issue"
echo "=================================="
echo ""

# 1. Check production API directly
echo "1. Production API Response:"
echo "----------------------------"
RESPONSE=$(curl -s https://heya-pos-api.fly.dev/api/v1/admin/merchants)
COUNT=$(echo "$RESPONSE" | jq 'length')
echo "Merchant count: $COUNT"
echo ""
echo "Merchant names:"
echo "$RESPONSE" | jq -r '.[].name' | nl

echo ""
echo "2. Looking for 'Orange Nails Maddingley':"
echo "----------------------------"
if echo "$RESPONSE" | jq -r '.[].name' | grep -q "Orange Nails Maddingley"; then
    echo "❌ FOUND 'Orange Nails Maddingley' in production!"
    echo "This merchant should NOT be in production."
else
    echo "✅ 'Orange Nails Maddingley' NOT in production (correct)"
fi

echo ""
echo "3. Full merchant details (first 3):"
echo "----------------------------"
echo "$RESPONSE" | jq '.[:3] | .[] | {id, name, subdomain, createdAt}'

echo ""
echo "4. Checking for duplicates:"
echo "----------------------------"
echo "$RESPONSE" | jq -r '.[].name' | sort | uniq -d
if [ $? -eq 0 ] && [ -z "$(echo "$RESPONSE" | jq -r '.[].name' | sort | uniq -d)" ]; then
    echo "No duplicate merchant names found"
fi

echo ""
echo "5. Checking database directly via Fly SSH:"
echo "----------------------------"
/home/lukas/.fly/bin/flyctl ssh console -a heya-pos-api -C "cd app && npx prisma db execute --stdin" <<'EOF'
SELECT COUNT(*) as merchant_count FROM "Merchant";
EOF

echo ""
echo "6. List all merchant names from database:"
echo "----------------------------"
/home/lukas/.fly/bin/flyctl ssh console -a heya-pos-api -C "cd app && npx prisma db execute --stdin" <<'EOF'
SELECT name FROM "Merchant" ORDER BY "createdAt" DESC;
EOF