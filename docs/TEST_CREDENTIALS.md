# Test Credentials for Heya POS

These are test credentials for UI testing. They bypass actual authentication for development purposes.

## Merchant App (Port 3001)

### Step 1: Merchant Login
- **Merchant Code**: `HAMILTON`
- **Email**: `admin@hamiltonbeauty.com`
- **Password**: `demo123`

### Step 2: Staff PIN
After merchant login, use one of these PINs:

- **Manager Access** (Emma Wilson): `1234`
  - Access Level: 2
  - Can: View reports, manage schedules, process refunds

- **Staff Access** (James Brown): `5678`
  - Access Level: 1
  - Can: View own bookings, process payments, manage customers

- **Owner Access** (Test Owner): `9999`
  - Access Level: 3
  - Can: Full access to all features

## Booking App (Port 3002)
No authentication required - public facing app for customers to book appointments.

## Admin Dashboard (Port 3003)
Currently no test credentials implemented. Would need platform admin access.

## Running the Apps

```bash
npm run dev
```

Then visit:
- Merchant App: http://localhost:3001/login
- Booking App: http://localhost:3002
- Admin Dashboard: http://localhost:3003

## Notes
- These credentials only work in development mode
- They simulate successful authentication without hitting the API
- Session data is stored in localStorage/sessionStorage
- Clear browser storage to reset authentication state