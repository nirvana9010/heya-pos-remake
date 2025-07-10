# Merchant Notification Settings

## Overview

Merchants can now control which notifications are sent to customers and when they receive notifications about bookings. This feature allows fine-grained control over email and SMS notifications for different booking events.

## Database Schema

Notification settings are stored in the `Merchant.settings` JSON field with the following properties:

- `bookingConfirmationEmail` (boolean, default: true) - Send booking confirmation via email
- `bookingConfirmationSms` (boolean, default: true) - Send booking confirmation via SMS
- `appointmentReminder24hEmail` (boolean, default: true) - Send 24-hour reminder via email
- `appointmentReminder24hSms` (boolean, default: true) - Send 24-hour reminder via SMS
- `appointmentReminder2hEmail` (boolean, default: true) - Send 2-hour reminder via email
- `appointmentReminder2hSms` (boolean, default: true) - Send 2-hour reminder via SMS
- `newBookingNotification` (boolean, default: true) - Receive notifications for new bookings from booking app
- `cancellationNotification` (boolean, default: true) - Receive notifications for cancellations from booking app

## How It Works

### Customer Notifications

1. **Booking Confirmations**: When a booking is created, the system checks if the merchant has enabled email and/or SMS confirmations before sending.

2. **Appointment Reminders**: The scheduler checks merchant settings before sending 24-hour and 2-hour reminders.

3. **Channel Selection**: The system respects both merchant settings (whether to send) and customer preferences (which channel to use):
   - If merchant disables a channel, it won't be used regardless of customer preference
   - If merchant enables both channels, customer preference determines which is used
   - If only one channel is enabled by merchant, only that channel is used

### Merchant Notifications

1. **New Bookings**: Merchants only receive notifications for bookings made through the booking app (not internal bookings)

2. **Cancellations**: Similar to new bookings, only external cancellations trigger notifications

## Frontend Settings

The notification settings are managed in the Settings page under the "Notifications" tab:

```
Settings > Notifications > Customer Notifications
- Booking Confirmations (Email/SMS toggles)
- 24-Hour Appointment Reminders (Email/SMS toggles)
- 2-Hour Appointment Reminders (Email/SMS toggles)

Settings > Notifications > Staff Notifications
- New Bookings (toggle)
- Cancellations (toggle)
```

## API Endpoints

- `GET /merchant/settings` - Returns all merchant settings including notification preferences
- `PUT /merchant/settings` - Updates merchant settings

## Migration

All existing merchants have been updated with default notification settings (all enabled). The migration script is located at:
`apps/api/src/scripts/add-notification-settings.ts`

## Testing

To test notification settings:
1. Navigate to Settings > Notifications in the merchant app
2. Toggle different notification options
3. Create a test booking to verify notifications are sent according to settings
4. Check that reminders are scheduled only for enabled notification types

## Technical Details

### Notification Event Handler
- Located at `apps/api/src/notifications/handlers/notification-event.handler.ts`
- Checks merchant settings before sending any notification
- Handles the logic for channel selection based on merchant and customer preferences

### Simple Scheduler Service
- Located at `apps/api/src/notifications/simple-scheduler.service.ts`
- Processes scheduled reminders every 5 minutes
- Checks merchant settings before sending each reminder

### Type Definitions
- `MerchantSettings` interface updated in `apps/api/src/types/models/merchant.ts`
- All notification settings are optional booleans defaulting to true

## Default Behavior

If a notification setting is not explicitly set (undefined), the system defaults to `true` (enabled). This ensures backward compatibility and that notifications continue to work for existing merchants until they explicitly disable them.