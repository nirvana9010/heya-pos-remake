# Loyalty System Documentation

## Overview

The Heya POS loyalty system supports two mutually exclusive loyalty program types:
1. **Visits-based (Punch Card)** - Customers earn rewards after X visits
2. **Points-based** - Customers earn points based on spending

Merchants can only have ONE type active at a time.

## Database Schema

### Customer Model Updates
```prisma
model Customer {
  // ... existing fields ...
  loyaltyPoints       Float    @default(0)    // For points-based
  loyaltyVisits       Int      @default(0)    // Current punch card progress
  lifetimeVisits      Int      @default(0)    // Total visits ever
}
```

### LoyaltyProgram Model
```prisma
model LoyaltyProgram {
  id                String    @id @default(cuid())
  merchantId        String    @unique
  name              String
  type              String    @default("POINTS") // VISITS or POINTS
  
  // Visit-based settings (punch card)
  visitsRequired    Int?      // e.g., 10 visits for reward
  visitRewardType   String?   // FREE or PERCENTAGE
  visitRewardValue  Float?    // 100 for free, or 20 for 20% off
  
  // Points-based settings
  pointsPerDollar   Float?    @default(1)
  pointsValue       Float     @default(0.01) // Dollar value per point
  
  isActive          Boolean   @default(true)
  // ... other fields ...
}
```

### LoyaltyTransaction Model
```prisma
model LoyaltyTransaction {
  id               String      @id @default(cuid())
  customerId       String
  merchantId       String
  type             String      // EARNED, REDEEMED, EXPIRED, ADJUSTED
  points           Float       @default(0)
  visitsDelta      Int         @default(0) // +1 for earned, -X for redeemed
  bookingId        String?     // Prevents double-earning
  // ... other fields ...
}
```

## API Endpoints

### Get Current Program
```
GET /api/loyalty/program
Authorization: Bearer {token}
```

### Update Program
```
POST /api/loyalty/program
Authorization: Bearer {token}
Content-Type: application/json

// For visits-based:
{
  "type": "VISITS",
  "visitsRequired": 10,
  "visitRewardType": "FREE",
  "visitRewardValue": 100,
  "name": "Punch Card Rewards",
  "description": "Get your 10th visit free!",
  "isActive": true
}

// For points-based:
{
  "type": "POINTS", 
  "pointsPerDollar": 1,
  "pointsValue": 0.01,
  "name": "Beauty Points",
  "description": "Earn 1 point per $1 spent",
  "isActive": true
}
```

### Get Customer Loyalty Status
```
GET /api/loyalty/customers/{customerId}
Authorization: Bearer {token}
```

### Redeem Visit Reward
```
POST /api/loyalty/redeem-visit
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "...",
  "bookingId": "..." // optional
}
```

### Redeem Points
```
POST /api/loyalty/redeem-points
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "...",
  "points": 100,
  "bookingId": "..." // optional
}
```

### Manual Adjustment
```
POST /api/loyalty/adjust
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "...",
  "visits": 5,        // or
  "points": 100,      // or both
  "reason": "Manual adjustment reason"
}
```

### Quick Check (for POS)
```
GET /api/loyalty/check/{customerId}
Authorization: Bearer {token}
```

## Business Logic

### Earning Logic

#### Visits-based System
- Customer earns 1 visit when booking status changes to COMPLETED
- Only one visit per booking (tracked by bookingId)
- Both `loyaltyVisits` and `lifetimeVisits` are incremented

#### Points-based System  
- Points earned = booking.totalAmount * program.pointsPerDollar
- Points are added to customer's `loyaltyPoints` balance
- Transaction recorded with booking reference

### Redemption Logic

#### Visits-based Redemption
- Requires customer to have >= program.visitsRequired visits
- Deducts the required visits from customer's balance
- Creates negative visitsDelta transaction
- Returns reward information (FREE or PERCENTAGE discount)

#### Points-based Redemption
- Customer can redeem any amount of points they have
- Points are deducted from balance
- Dollar value = points * program.pointsValue

### Integration with Bookings

The loyalty system is automatically triggered when a booking is completed:

```typescript
// In bookings.service.ts
if (dto.status === BookingStatus.COMPLETED) {
  await this.loyaltyService.processBookingCompletion(id);
}
```

## Testing

### Quick Test Commands

1. **Login and get token:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
```

2. **Check current program:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/loyalty/program | python3 -m json.tool
```

3. **Run comprehensive test:**
```bash
cd apps/api && npx ts-node test/test-loyalty-system.ts
```

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** Loyalty endpoints require JWT authentication. Always include the Bearer token.

### Issue: Customer not found
**Solution:** Ensure customer exists in the database before checking loyalty status.

### Issue: Double earning
**Solution:** The system tracks bookingId to prevent earning multiple times for the same booking.

### Issue: Program type conflicts
**Solution:** When switching between VISITS and POINTS, the system maintains separate balances. Old data is preserved but not used.

## Edge Cases Handled

1. **Booking cancellation** - No loyalty impact if booking never reached COMPLETED status
2. **Partial refunds** - Currently does not affect earned loyalty (future enhancement)
3. **Program deactivation** - Customers keep their balance but can't earn/redeem
4. **Missing customer** - Returns zero balances instead of error
5. **Concurrent bookings** - Atomic transactions prevent race conditions

## Future Enhancements

1. Tier-based rewards (Bronze, Silver, Gold)
2. Point expiration system
3. Loyalty notifications
4. Detailed reporting and analytics
5. Mobile app integration
6. QR code-based loyalty cards