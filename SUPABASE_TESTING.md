# Testing Supabase Realtime Integration

## Current Status
✅ Supabase keys configured
✅ Backend service created and working
✅ Frontend client wrapper implemented
✅ NotificationsContext updated with feature flag support

## Testing Steps

### 1. Run SQL Migration
First, you need to enable Realtime in Supabase:

1. Go to [Supabase SQL Editor](https://app.supabase.com/project/hpvnmqvdgkfeykekosrh/sql/new)
2. Run the migration from `/apps/api/prisma/migrations/setup_supabase_realtime.sql`
3. This will:
   - Enable Realtime for MerchantNotification table
   - Set up RLS policies for merchant isolation
   - Create indexes for performance

### 2. Enable Feature Flag
In the merchant app browser console:
```javascript
localStorage.setItem('feature_supabaseRealtime', 'true');
// Then refresh the page
```

### 3. Test Real-time Notifications
1. Open merchant app in one browser (logged in as admin@hamiltonbeauty.com)
2. Open booking app in another browser
3. Create a new booking
4. Check if notification appears instantly in merchant app (no 30-second delay)

### 4. Check Console Logs
In merchant app console, you should see:
```
[NotificationsContext] Using Supabase Realtime
[Supabase] Client initialized
[Supabase] Successfully subscribed to notifications
```

### 5. Test Endpoint
The realtime token endpoint is working:
```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hamiltonbeauty.com", "password": "demo123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Get realtime token
curl -X POST http://localhost:3000/api/v1/merchant/notifications/realtime-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### If Realtime doesn't work:
1. Check if SQL migration was run successfully
2. Verify in Supabase dashboard that Realtime is enabled for the table
3. Check browser console for errors
4. Ensure feature flag is enabled
5. Try disabling and re-enabling: `localStorage.setItem('feature_supabaseRealtime', 'false')`

### Connection Issues:
- The system will fall back to 5-minute polling if Supabase fails
- SSE remains as a backup (still active)
- No data loss occurs

## Next Steps
1. Test with multiple merchants for isolation
2. Monitor connection stability
3. Check performance improvements
4. Plan SSE removal after successful testing