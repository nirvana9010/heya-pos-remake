# Notification Testing Guide

## Setup Verification

1. All services are running (API, Merchant App, Booking App)
2. Source-based notification filtering has been implemented

## What's Been Implemented

### 1. BookingCreatedEvent now includes source field
- Location: `/apps/api/src/contexts/bookings/domain/events/booking-created.event.ts`
- The event tracks where the booking originated from

### 2. Booking services pass source when creating events
- BookingCreationService passes source to the outbox event
- RescheduleBookingCommandHandler includes source in events
- CancelBookingCommandHandler includes source in events

### 3. NotificationEventHandler filters by source
- Only creates merchant notifications when `source === 'ONLINE'`
- Applies to:
  - booking.created
  - booking.cancelled
  - booking.rescheduled
  - booking.completed

## Testing Steps

### Test 1: Merchant App Booking (Should NOT trigger notification)
1. Open merchant app at http://localhost:3002
2. Create a new booking from the calendar
3. Check PM2 logs: `pm2 logs api --nostream --lines 50 | grep -i "notification"`
4. Expected: See "Skipping merchant notification for MERCHANT booking"

### Test 2: Booking App Booking (SHOULD trigger notification)
1. Open booking app at http://localhost:3003
2. Create a new booking as a customer
3. Check PM2 logs: `pm2 logs api --nostream --lines 50 | grep -i "notification"`
4. Expected: See "Creating merchant notification for ONLINE booking"

### Test 3: Verify Notifications List
1. In merchant app, check the notifications bell icon
2. Should only see notifications from bookings made via booking app
3. Should NOT see notifications from merchant-created bookings

## Monitoring Commands

```bash
# Watch for notification events in real-time
pm2 logs api | grep -E "notification|booking\.(created|cancelled|rescheduled)|source:"

# Check outbox events being published
pm2 logs api | grep "Publishing event"

# Check notification handler activity
pm2 logs api | grep "NotificationEventHandler"
```

## Expected Log Patterns

### For Merchant-Created Booking:
```
[OutboxPublisherService] Publishing event booking.created with data: { source: "MERCHANT", ... }
[NotificationEventHandler] Handling booking created event: [id], source: MERCHANT
[NotificationEventHandler] Skipping merchant notification for MERCHANT booking [id]
```

### For Customer-Created Booking:
```
[OutboxPublisherService] Publishing event booking.created with data: { source: "ONLINE", ... }
[NotificationEventHandler] Handling booking created event: [id], source: ONLINE
[NotificationEventHandler] Creating merchant notification for ONLINE booking [id]
[NotificationEventHandler] Merchant notification created for booking [id]
```