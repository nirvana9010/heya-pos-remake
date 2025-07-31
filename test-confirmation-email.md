# Testing Confirmation Email Flow

## Steps to Test

1. **Monitor the API logs**:
   ```bash
   pm2 logs api --nostream --lines 200 | grep -E "CONFIRMATION|confirmed|📧|📮|✉️|🎯|📨|🔔|✅"
   ```

2. **Create a PENDING booking** (use the public booking page):
   - Go to http://localhost:3001/orange-nails-beauty/booking
   - Create a booking for Lukas Nguyen
   - This will create a PENDING booking (since Orange Nails Beauty has autoConfirmBookings: false)

3. **Log in to merchant dashboard**:
   - Go to http://localhost:3002
   - Login with Orange Nails Beauty credentials

4. **Find the pending booking**:
   - Go to Calendar view
   - Look for the PENDING booking (yellow status)

5. **Confirm the booking**:
   - Click on the booking to open details
   - Change status from PENDING to CONFIRMED
   - Save

6. **Check the logs** for the following sequence:
   ```
   [BookingUpdateService] ======= CONFIRMATION FLOW DEBUG =======
   [BookingUpdateService] Booking xxx status changed: PENDING → CONFIRMED
   [BookingUpdateService] ✓ Outbox event saved to database
   
   [OutboxPublisherService] 📧 Found 1 BOOKING CONFIRMATION events!
   [OutboxPublisherService] 🔔 PROCESSING CONFIRMATION EVENT
   [OutboxPublisherService] 📨 EMITTING CONFIRMATION EVENT
   [OutboxPublisherService] ✓ Event 'booking.confirmed' emitted to EventEmitter2
   
   [NotificationEventHandler] 🎯 RECEIVED booking.confirmed event!
   [NotificationEventHandler] 📧 ====== CONFIRMATION EMAIL DECISION ======
   [NotificationEventHandler] 📤 SENDING CONFIRMATION NOTIFICATION...
   [NotificationEventHandler] ✅ CONFIRMATION EMAIL SENT SUCCESSFULLY
   ```

## What Each Log Means

- **CONFIRMATION FLOW DEBUG**: The booking status was changed from PENDING to CONFIRMED
- **Outbox event saved**: The confirmation event was saved to the outbox table
- **Found BOOKING CONFIRMATION events**: The outbox processor found the event (runs every 5 seconds)
- **EMITTING CONFIRMATION EVENT**: The event is being published to the event bus
- **RECEIVED booking.confirmed event**: The notification handler received the event
- **CONFIRMATION EMAIL SENT**: The email was successfully sent

## Troubleshooting

If you don't see all these logs:

1. **No "CONFIRMATION FLOW DEBUG"**: The status change isn't being detected properly
2. **No "Found BOOKING CONFIRMATION events"**: The outbox event isn't being created or the publisher isn't running
3. **No "RECEIVED booking.confirmed event"**: The event isn't being published or the handler isn't listening
4. **No "CONFIRMATION EMAIL SENT"**: The email service is failing

## Direct Database Check

You can also check the OutboxEvent table directly:
```sql
SELECT * FROM "OutboxEvent" 
WHERE "eventType" = 'confirmed' 
AND "processedAt" IS NULL
ORDER BY "createdAt" DESC;
```

This will show any unprocessed confirmation events waiting to be sent.