# Real-time Notification Debug Guide

## Current Issues
1. SSE notifications aren't reaching the frontend when bookings are created
2. Calendar doesn't update automatically with new bookings
3. Both SSE and Supabase real-time connections seem to have issues

## Quick Debugging Steps

### 1. Check SSE Connection
Open merchant app console and run:
```javascript
// Check if SSE is connected
const sseClient = window.sseClient || null;
console.log('SSE Client:', sseClient);
console.log('SSE Connected:', sseClient?.isConnected());
```

### 2. Test Manual Notification
```bash
# Login and test notification
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hamiltonbeauty.com", "password": "demo123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -X POST http://localhost:3000/api/v1/merchant/notifications/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Monitor API Events
```bash
# Watch for event emissions
pm2 logs api --lines 100 | grep -E "(notification.created|booking.created|SSE)"
```

### 4. Test SSE Stream Directly
```bash
# Get token and test SSE stream
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hamiltonbeauty.com", "password": "demo123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/v1/merchant/notifications/stream?token=$TOKEN"
```

## Event Flow
1. **Booking Created** → `booking.created` event emitted
2. **NotificationEventHandler** → Creates notification in DB
3. **MerchantNotificationsService** → Emits `notification.created` event
4. **NotificationsSseController** → Sends to SSE clients
5. **Frontend NotificationsContext** → Receives SSE event
6. **BookingEvents** → Broadcasts to calendar
7. **Calendar** → Refreshes bookings

## Common Issues

### SSE Client Disconnecting
- Check if token is valid
- Verify CORS settings
- Check for proxy timeouts

### Events Not Emitting
- Ensure EventEmitterModule is global
- Check if service has EventEmitter2 injected
- Verify event names match

### Calendar Not Updating
- Check if bookingEvents.subscribe is working
- Verify event source is 'ONLINE' or 'slideout'
- Check React Query cache invalidation