# Notification Testing Guide

This guide explains how to test email and SMS notifications in the Heya POS system.

## Overview

The notification system includes comprehensive test suites and mock implementations for both email (SendGrid) and SMS (Twilio) providers. These mocks allow full testing without requiring real API keys or sending actual messages.

## Test Files

### Unit Tests
- `email.service.spec.ts` - Tests for email service with mocked nodemailer
- `sms.service.spec.ts` - Tests for SMS service with mocked providers
- `notifications.service.spec.ts` - Tests for the orchestration service

### Integration Tests
- `notifications.integration.spec.ts` - End-to-end tests with mock providers

### Mock Implementations
- `mocks/notification-mocks.ts` - Mock providers for SendGrid, Twilio, and development tools

## Running Tests

```bash
# Run all notification tests
npm test -- --testPathPattern=notifications

# Run specific test suites
npm test -- email.service.spec.ts
npm test -- sms.service.spec.ts
npm test -- notifications.service.spec.ts
npm test -- notifications.integration.spec.ts

# Run with coverage
npm test -- --coverage --testPathPattern=notifications
```

## Mock Provider Features

### Email (MockSendGridProvider)
- Simulates SendGrid API responses
- Triggers failures for emails to `fail@*` addresses
- Simulates bounces for `bounce@*` addresses
- Tracks sent emails in development dashboard
- Configurable delays for realistic testing

### SMS (MockTwilioProvider)
- Simulates Twilio API responses
- Validates phone number formats
- Triggers failures for numbers containing `00000`
- Handles long messages (calculates segments)
- Tracks sent SMS in development dashboard

## Development Endpoints

When running in development/test mode, the following endpoints are available:

### Send Test Notification
```bash
POST /api/test/notifications/send-test
{
  "type": "booking_confirmation",
  "channel": "both", // "email", "sms", or "both"
  "customerEmail": "test@example.com",
  "customerPhone": "0412345678",
  "customerName": "Test Customer"
}
```

### Send Booking Notification
```bash
POST /api/test/notifications/send-booking/{bookingId}
{
  "type": "booking_reminder_24h"
}
```

### View Dashboard
```bash
GET /api/test/notifications/dashboard
```

### Verify Connections
```bash
GET /api/test/notifications/verify-connections
```

### Run Test Scenarios
```bash
POST /api/test/notifications/test-scenarios/{scenario}

Available scenarios:
- email-failure
- sms-failure
- bounce-email
- invalid-phone
- long-sms
- missing-email
- missing-phone
```

## Environment Configuration

### Development/Test Configuration
```env
# Email settings
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.test-key
EMAIL_FROM=noreply@heyapos.com
EMAIL_HOST=smtp.test.com
EMAIL_PORT=587
EMAIL_USER=test@test.com
EMAIL_PASS=testpass

# SMS settings
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC_test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+61400000000

# Mock settings
USE_MOCKS=true
MOCK_DELAY=false  # Set to true for realistic delays
```

### Production Configuration
```env
# Email settings
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.real-api-key  # Real SendGrid API key
EMAIL_FROM=noreply@yourdomain.com

# SMS settings
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC_real_sid  # Real Twilio SID
TWILIO_AUTH_TOKEN=real_token    # Real Twilio token
TWILIO_PHONE_NUMBER=+61400111222 # Your Twilio number

# Disable mocks
USE_MOCKS=false
```

## Testing Notification Types

The system supports the following notification types:
- `BOOKING_CONFIRMATION` - Sent when a booking is created
- `BOOKING_REMINDER_24H` - Sent 24 hours before appointment
- `BOOKING_REMINDER_2H` - Sent 2 hours before appointment
- `BOOKING_CANCELLED` - Sent when booking is cancelled
- `BOOKING_RESCHEDULED` - Sent when booking time changes

## Mock Dashboard

The notification dashboard provides:
- Total notifications sent
- Email/SMS breakdown
- Success/failure rates
- Recent notification history
- Test scenario results

Access at: `GET /api/test/notifications/dashboard`

## Transitioning to Production

When ready to use real providers:

1. **Obtain API Keys**
   - SendGrid: Sign up at sendgrid.com and create an API key
   - Twilio: Sign up at twilio.com and get Account SID, Auth Token, and phone number

2. **Update Environment Variables**
   - Set real API keys in production environment
   - Set `USE_MOCKS=false`
   - Remove or disable test endpoints

3. **Update Provider Implementation**
   - The mock providers in `notification-mocks.ts` show the expected interface
   - Real providers should implement the same methods
   - Use the `NotificationProviderFactory` to return real providers when configured

4. **Test with Real Providers**
   - Start with test phone numbers and email addresses
   - Monitor provider dashboards for delivery status
   - Check error logs for any issues

## Common Test Scenarios

### Testing Email Failures
```javascript
// Use fail@ prefix to trigger mock failures
const context = {
  customer: { email: 'fail@test.com', ... }
};
```

### Testing SMS Failures
```javascript
// Use numbers with 00000 to trigger failures
const context = {
  customer: { phone: '0400000000', ... }
};
```

### Testing Long Messages
```javascript
// Create context with long service names or descriptions
const context = {
  booking: { serviceName: 'A'.repeat(200), ... }
};
```

## Troubleshooting

### Tests Failing
1. Check that mock providers are properly initialized
2. Verify environment variables are set correctly
3. Look for typos in notification types
4. Check that all required context fields are provided

### Mocks Not Working
1. Ensure `USE_MOCKS=true` in environment
2. Check that NODE_ENV is not 'production'
3. Verify mock provider imports are correct

### Dashboard Not Updating
1. Check that notifications are using mock providers
2. Verify dashboard singleton is properly initialized
3. Clear dashboard and retry: `POST /api/test/notifications/dashboard/clear`

## Best Practices

1. **Always test all notification types** before deploying
2. **Use meaningful test data** that resembles production
3. **Test error scenarios** to ensure graceful handling
4. **Monitor mock dashboard** during development
5. **Validate phone numbers** before sending SMS
6. **Check email formatting** in different clients
7. **Test with various character sets** (emojis, special characters)
8. **Implement retry logic** for production use

## Future Enhancements

When implementing real providers, consider:
- Webhook handling for delivery status
- Template management in provider dashboards
- Batch sending for reminders
- Delivery reporting and analytics
- Unsubscribe handling
- Internationalization support