#!/bin/bash

# Clear Admin Dashboard Cache
# This script helps clear caching issues when the admin dashboard shows stale data

echo "🧹 Clearing Admin Dashboard Cache..."

# 1. Clear browser cache (instructions)
echo ""
echo "📱 Browser Cache:"
echo "1. Open the admin dashboard: https://heya-pos-remake-admin-dashboard.vercel.app/"
echo "2. Open DevTools (F12)"
echo "3. Right-click the refresh button"
echo "4. Select 'Empty Cache and Hard Reload'"
echo ""

# 2. Test API directly
echo "🔍 Testing API directly..."
echo "Production merchant count:"
curl -s "https://heya-pos-api.fly.dev/api/v1/admin/merchants" | jq 'length'

echo ""
echo "Production merchants (should NOT include 'Orange Nails Maddingley'):"
curl -s "https://heya-pos-api.fly.dev/api/v1/admin/merchants" | jq '.[].name'

# 3. Force cache bypass test
echo ""
echo "📊 Testing with cache bypass..."
TIMESTAMP=$(date +%s)
COUNT=$(curl -s -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://heya-pos-api.fly.dev/api/v1/admin/merchants?_t=$TIMESTAMP" | jq 'length')
echo "Merchant count with cache bypass: $COUNT"

# 4. Vercel edge cache (if applicable)
echo ""
echo "🌐 Vercel Edge Cache:"
echo "If the issue persists after clearing browser cache:"
echo "1. Go to Vercel dashboard"
echo "2. Navigate to your admin dashboard project"
echo "3. Go to Settings → Functions → Purge Cache"
echo "4. Or redeploy the admin dashboard to force cache clear"

echo ""
echo "✅ Cache clearing instructions complete!"
echo ""
echo "Expected result: 8 merchants (production MPG cluster)"
echo "If you still see 9 merchants after clearing cache, the issue may be:"
echo "- React Query cache in the app (requires page reload)"
echo "- Service Worker cache (check DevTools → Application → Service Workers)"
echo "- CDN cache (wait a few minutes for propagation)"