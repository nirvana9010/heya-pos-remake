# Supabase Realtime Migration Guide

> **Archived September 2025** – Supabase realtime integration was paused and its client code (`apps/merchant-app/src/lib/services/supabase.ts`) has been removed. This guide remains for historical context only.

This guide documents the migration from custom SSE implementation to Supabase Realtime for notifications (legacy).

## Current Status

- ✅ Supabase client libraries installed
- ✅ Backend Supabase service created
- ✅ JWT exchange endpoint implemented
- ✅ Frontend Supabase client wrapper created
- ✅ NotificationsContext updated to support both SSE and Supabase
- ✅ Feature flag system implemented
- ✅ **Supabase Realtime is now the DEFAULT** (as of latest update)
- ⏳ Waiting for Supabase keys from dashboard
- ⏳ SQL migration needs to be run
- ⏳ Testing required

## Prerequisites

1. **Get Supabase Keys**
   - Go to [Supabase Dashboard](https://app.supabase.com/project/hpvnmqvdgkfeykekosrh/settings/api)
   - Copy the `anon` key and `service_role` key
   - Add to `/apps/api/.env`:
     ```
     SUPABASE_ANON_KEY=your-anon-key-here
     SUPABASE_SERVICE_KEY=your-service-key-here
     ```

2. **Run SQL Migration**
   - Go to Supabase Dashboard > SQL Editor
   - Run the migration from `/apps/api/prisma/migrations/setup_supabase_realtime.sql`
   - This enables Realtime and sets up RLS policies

## Testing the Migration

### 1. Enable/Disable Feature Flag

**Note: Supabase is now enabled by default!**

To disable Supabase and use SSE instead:
```javascript
// In browser console on merchant app:
localStorage.setItem('feature_supabaseRealtime', 'false');
// Then refresh the page
```

To re-enable Supabase (default):
```javascript
// Remove the override
localStorage.removeItem('feature_supabaseRealtime');
// Then refresh the page
```

### 2. Check Connection

Open browser console and look for:
```
[NotificationsContext] Using Supabase Realtime
[Supabase] Client initialized
[Supabase] Successfully subscribed to notifications
```

### 3. Test Real-time Updates

1. Create a booking from the booking app
2. Check if notification appears instantly in merchant app
3. No 30-second polling delay should occur

### 4. Test Merchant Isolation

1. Log in as different merchants in different browsers
2. Create bookings for each merchant
3. Verify notifications only appear for the correct merchant

## Gradual Rollout Plan

### Phase 1: Internal Testing
- Enable for development environment only
- Test with team members
- Monitor for issues

### Phase 2: Beta Merchants
```javascript
// In feature-flags.ts, add merchant IDs:
const enabledMerchants = [
  'merchant-uuid-1', // Beta merchant 1
  'merchant-uuid-2', // Beta merchant 2
];
```

### Phase 3: Full Rollout
```javascript
// Set environment variable:
NEXT_PUBLIC_ENABLE_SUPABASE_REALTIME=true
```

### Phase 4: Cleanup
- Remove SSE implementation
- Remove feature flag
- Update documentation

## Monitoring

### Check Supabase Connection Count
```sql
-- In Supabase SQL Editor
SELECT count(*) 
FROM pg_stat_activity 
WHERE application_name = 'Supabase Realtime';
```

### Check Active Subscriptions
Look in browser console for active channels:
```javascript
// Number of active channels
console.log('[Supabase] Active channels:', supabaseRealtime.channels.size);
```

## Rollback Plan

If issues occur:

1. **Immediate Rollback**
   ```javascript
   // Disable feature flag
   localStorage.setItem('feature_supabaseRealtime', 'false');
   ```

2. **Full Rollback**
   - Set `NEXT_PUBLIC_ENABLE_SUPABASE_REALTIME=false`
   - SSE will continue working as before
   - No data loss occurs

## Known Limitations

1. **Supabase Keys Required**
   - Cannot test without proper keys from dashboard
   - Service key needed for custom JWT generation

2. **Connection Limits**
   - Supabase has connection limits per project
   - Monitor usage in production

3. **JWT Compatibility**
   - Custom JWT implementation may need adjustment
   - Test thoroughly with your auth system

## Benefits After Migration

1. **Instant Notifications** - No more 30-second delays
2. **Reduced Server Load** - No polling requests
3. **Better Scalability** - Supabase handles millions of connections
4. **Automatic Reconnection** - Built-in connection management
5. **Global Distribution** - Clients connect to nearest Supabase edge

## Next Steps

1. Add Supabase keys to environment
2. Run SQL migration in Supabase
3. Test with feature flag enabled
4. Monitor performance
5. Begin gradual rollout
