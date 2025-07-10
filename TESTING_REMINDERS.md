# Testing Appointment Reminders Without Waiting

This guide shows you how to test 24h and 2h appointment reminders without actually waiting for the scheduled times.

## Method 1: Send Test Reminders Immediately

Use these endpoints to send reminder notifications immediately (simulating what would be sent at the scheduled time):

### Test 24-hour Reminder
```bash
curl -X POST http://localhost:3000/api/v1/test/notifications/test-reminder/24h \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "lukas.tn90@gmail.com",
    "customerName": "Lukas"
  }'
```

### Test 2-hour Reminder
```bash
curl -X POST http://localhost:3000/api/v1/test/notifications/test-reminder/2h \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "lukas.tn90@gmail.com",
    "customerName": "Lukas"
  }'
```

## Method 2: Force Process Scheduled Reminders

If you have bookings with scheduled reminders waiting in the queue, you can force the scheduler to process them immediately:

```bash
curl -X POST http://localhost:3000/api/v1/test/notifications/force-process-reminders
```

Then check the logs:
```bash
pm2 logs api --nostream --lines 50 | grep -i reminder
```

## Method 3: Create a Booking with Immediate Reminders

Create a test booking that will have reminders scheduled for processing soon:

1. Create a booking for 2 hours and 5 minutes from now
2. This will schedule:
   - 24h reminder: immediately (already in the past)
   - 2h reminder: in 5 minutes

The scheduler runs every 5 minutes, so reminders will be processed in the next cycle.

## Method 4: Database Manipulation (Advanced)

Run the test script to manipulate scheduled notifications directly:

```bash
cd /home/nirvana9010/projects/heya-pos-remake/heya-pos
node test-reminders.js
```

This script will:
- Find pending scheduled notifications
- Update their scheduled times to be in the past
- Create test bookings with immediate reminders

## Testing Merchant Settings

To test that reminders respect merchant settings:

1. Go to Settings → Notifications in the merchant app
2. Toggle OFF specific reminder types (e.g., turn off 24h SMS reminders)
3. Send a test reminder using Method 1 above
4. Check logs to verify the reminder was skipped:
   ```bash
   pm2 logs api --nostream --lines 50 | grep -E "(Skipped|merchant settings)"
   ```

## Monitoring Reminder Processing

Watch for reminder activity in real-time:

```bash
# Watch all notification activity
pm2 logs api | grep -i notification

# Watch specifically for reminders
pm2 logs api | grep -i reminder

# Check scheduler activity
pm2 logs api | grep "Found.*scheduled notifications"

# See processing results
pm2 logs api | grep "Processed scheduled notification"
```

## Expected Log Messages

When reminders are processed, you'll see:

```
Found X scheduled notifications to process
Processed scheduled notification {id}: sent
Booking reminder sent - Email: true, SMS: true
```

If merchant has disabled reminders:
```
Skipped scheduled notification {id}: merchant settings disabled
```

## Email/SMS Verification

- **Emails**: Check the inbox for the email address you used
- **SMS**: Currently using test number (+15005550006), so no actual SMS is sent but you'll see success responses

## Troubleshooting

1. **No scheduled notifications found**
   - Create a booking first
   - Check that reminders were scheduled: look for "Scheduled 24h reminder" in logs

2. **Reminders not being sent**
   - Check merchant settings haven't disabled them
   - Verify customer has email/phone and notification preferences set
   - Check for errors in logs: `pm2 logs api --nostream --lines 100 | grep -i error`

3. **Force immediate processing**
   - Restart API to trigger startup processing: `pm2 restart api`
   - Use the force-process endpoint above