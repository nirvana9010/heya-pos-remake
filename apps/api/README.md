# Heya POS API - Authentication System

## Overview

This API implements a dual authentication system as specified in the design document:

1. **Merchant Login**: Shared username/password authentication for merchant accounts
2. **Staff PIN System**: 4-6 digit PIN authentication for staff members

## Authentication Flow

### 1. Merchant Login

```bash
POST /api/auth/merchant/login
{
  "username": "merchant_username",
  "password": "merchant_password"
}
```

Returns:
- JWT token
- Refresh token
- Merchant details
- Available locations

### 2. Staff PIN Authentication

After merchant login, authenticate staff with PIN:

```bash
POST /api/auth/staff/pin
Authorization: Bearer <merchant_token>
{
  "pin": "1234",
  "locationId": "location_id"
}
```

Returns:
- Staff details
- New JWT token with staff context
- Permissions based on access level

### 3. PIN-Protected Actions

For sensitive operations, include PIN in request:

```bash
POST /api/bookings/cancel
Authorization: Bearer <staff_token>
{
  "bookingId": "booking_id",
  "reason": "Customer request",
  "staffPin": "1234"
}
```

Or use header:
```bash
X-Staff-Pin: 1234
```

## Access Levels

- **Level 1 (Employee)**: Basic operations
- **Level 2 (Manager)**: Extended permissions
- **Level 3 (Owner)**: Full access

## Security Features

- **PIN Lockout**: 3 failed attempts = 15 minute lockout
- **Session Duration**: 12 hours (full working day)
- **Session Activity**: Sessions stay active with use
- **Audit Logging**: All PIN-protected actions logged
- **Token Expiry**: 7 days for access tokens, 30 days for refresh

## Guards & Decorators

### Guards
- `@UseGuards(JwtAuthGuard)` - Require authentication
- `@UseGuards(PermissionsGuard)` - Check permissions
- `@UseGuards(PinRequiredGuard)` - Require PIN verification

### Decorators
- `@RequirePermissions('booking.cancel')` - Specify required permissions
- `@PinRequired('booking.cancel')` - Mark action as PIN-protected
- `@CurrentUser()` - Get current user from request

## Example Usage

```typescript
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  @Post('cancel/:id')
  @RequirePermissions('booking.cancel')
  @PinRequired('booking.cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: CurrentUser,
  ) {
    // PIN already verified by guard
    // Proceed with cancellation
  }
}
```

## Environment Variables

```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
SESSION_TIMEOUT_HOURS=12
```