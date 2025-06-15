# Timezone Implementation Plan for Heya POS

## Executive Summary
- UTC-native storage with timezone as presentation layer concern
- Use date-fns v4 with @date-fns/tz for timezone handling (already using date-fns)
- Merchant-level default timezone with location-level overrides
- All API dates in ISO 8601 UTC format

## Phase 1: Infrastructure Setup

### 1.1 Database Schema Changes
```sql
-- Add to merchants table
ALTER TABLE merchants ADD COLUMN timezone VARCHAR(255) NOT NULL DEFAULT 'Australia/Sydney';

-- Ensure locations.timezone can inherit from merchant
ALTER TABLE locations ALTER COLUMN timezone DROP NOT NULL;
```

### 1.2 Consolidate Timezone Utilities
- Remove duplicate `/apps/api/src/utils/shared/timezone.ts`
- Upgrade `/packages/utils/src/timezone.ts` to use @date-fns/tz
- Add methods for DST handling and validation

### 1.3 API Architecture
- All timestamps stored as UTC in database
- API accepts local times with location context
- API returns UTC with timezone context
- Example request/response patterns

## Phase 2: API Implementation

### 2.1 Booking Creation
```typescript
// POST /bookings
{
  "location_id": "123",
  "start_local": "2024-11-05T10:00:00",
  "duration_minutes": 60,
  "services": [...]
}
```

### 2.2 Response Format
```typescript
{
  "id": "booking-123",
  "start_utc": "2024-11-04T23:00:00Z",
  "end_utc": "2024-11-05T00:00:00Z",
  "timezone": "Australia/Sydney",
  "display": {
    "date": "5 Nov 2024",
    "start_time": "10:00 AM AEDT",
    "end_time": "11:00 AM AEDT"
  }
}
```

## Phase 3: Frontend Implementation

### 3.1 Display Strategy
- Primary: Merchant timezone (e.g., "10:00 AM AEDT")
- Secondary: User timezone on hover/tooltip
- Clear timezone indicators throughout UI

### 3.2 Component Updates
- Calendar: Display in location timezone
- Booking confirmation: Show merchant timezone
- Time slot picker: Merchant timezone with indicators

## Phase 4: Migration Strategy

### 4.1 Data Migration
1. Add new UTC columns alongside existing ones
2. Backfill script to convert existing timestamps
3. Verify conversions, especially around DST boundaries
4. Switch to new columns
5. Remove old columns after verification

### 4.2 Migration Script Example
```typescript
// Convert existing naive timestamps to UTC
const convertBookingTimestamps = async () => {
  const bookings = await prisma.booking.findMany({
    include: { location: true }
  });
  
  for (const booking of bookings) {
    const timezone = booking.location.timezone || 'Australia/Sydney';
    const startUtc = zonedTimeToUtc(booking.startTime, timezone);
    const endUtc = zonedTimeToUtc(booking.endTime, timezone);
    
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startTimeUtc: startUtc,
        endTimeUtc: endUtc
      }
    });
  }
};
```

## Phase 5: Edge Cases & Testing

### 5.1 DST Handling
- Spring forward gap: Reject invalid times with clear error
- Fall back ambiguity: Initially reject, later disambiguate
- Lord Howe Island: 30-minute DST shifts

### 5.2 Testing Strategy
- Unit tests for timezone conversions
- Integration tests for API endpoints
- E2E tests with mocked browser timezones
- DST boundary test cases

## Phase 6: Rollout Plan

### 6.1 Implementation Order
1. Week 1: Infrastructure setup and utilities
2. Week 2: API endpoints and data migration
3. Week 3: Frontend components
4. Week 4: Testing and verification
5. Week 5: Staged rollout

### 6.2 Feature Flags
- `USE_NEW_TIMEZONE_HANDLING`: Enable new system
- `SHOW_USER_TIMEZONE_HINTS`: Display secondary timezone

## Appendix: Australian Timezone Reference
- Australia/Sydney (AEDT/AEST) - UTC+11/+10
- Australia/Melbourne (AEDT/AEST) - UTC+11/+10
- Australia/Brisbane (AEST) - UTC+10 (no DST)
- Australia/Perth (AWST) - UTC+8 (no DST)
- Australia/Adelaide (ACDT/ACST) - UTC+10:30/+9:30
- Australia/Lord_Howe (LHDT/LHST) - UTC+11/+10:30 (30-min DST)