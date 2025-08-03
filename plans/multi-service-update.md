# Multi-Service Booking Update Implementation Plan

## Problem Statement

When users add additional services to an existing booking:
1. **Frontend** correctly sends an array of services to the backend
2. **Backend V2 controller** accepts the services array in the DTO
3. **BUT** the controller only uses the first service (`dto.services[0].serviceId`)
4. **BookingService** join table records are never updated
5. **Result**: UI shows optimistic updates that don't persist after refresh

### Current Code Issue Location
File: `/apps/api/src/contexts/bookings/infrastructure/controllers/bookings.v2.controller.ts`
Lines 314-317:
```typescript
if (dto.services && dto.services.length > 0) {
  // For now, handle single service update
  updateData.serviceId = dto.services[0].serviceId;
}
```

## Database Schema Context

The database properly supports multi-service bookings through:
- **Booking** table: Main booking record
- **BookingService** table: Join table linking bookings to services with individual pricing/duration
- **Service** table: Service definitions

```prisma
model BookingService {
  id        String   @id @default(uuid())
  bookingId String
  serviceId String
  price     Decimal  @db.Decimal(10, 2)
  duration  Int
  staffId   String?
  createdAt DateTime @default(now())
  booking   Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  service   Service  @relation(fields: [serviceId], references: [id])
  staff     Staff?   @relation(fields: [staffId], references: [id])
}
```

## Implementation Phases

### Phase 1: Update BookingUpdateService

**File**: `/apps/api/src/contexts/bookings/application/services/booking-update.service.ts`

#### 1.1 Update the UpdateBookingData Interface

Add services array to the interface (around line 20):
```typescript
interface UpdateBookingData {
  bookingId: string;
  merchantId: string;
  staffId?: string;
  serviceId?: string;  // Keep for backward compatibility
  services?: Array<{    // NEW: Add services array
    serviceId: string;
    staffId?: string;
    price?: number;
    duration?: number;
  }>;
  startTime?: Date;
  endTime?: Date;
  locationId?: string;
  notes?: string;
  status?: string;
  cancellationReason?: string;
}
```

#### 1.2 Handle Services in updateBooking Method

In the transaction (after line 123 where `directUpdates` are handled):
```typescript
// Handle multi-service updates
if (data.services && data.services.length > 0) {
  // Delete existing BookingService records
  await tx.bookingService.deleteMany({
    where: { bookingId: data.bookingId }
  });
  
  // Calculate total amount and duration
  let totalAmount = 0;
  let totalDuration = 0;
  
  // Create new BookingService records
  const bookingServices = [];
  for (const service of data.services) {
    // Fetch service details if price/duration not provided
    const serviceDetails = await tx.service.findUnique({
      where: { id: service.serviceId },
      select: { price: true, duration: true }
    });
    
    if (!serviceDetails) {
      throw new BadRequestException(`Service not found: ${service.serviceId}`);
    }
    
    const servicePrice = service.price ?? serviceDetails.price;
    const serviceDuration = service.duration ?? serviceDetails.duration;
    
    bookingServices.push({
      bookingId: data.bookingId,
      serviceId: service.serviceId,
      staffId: service.staffId || data.staffId || booking.staffId,
      price: servicePrice,
      duration: serviceDuration
    });
    
    totalAmount += Number(servicePrice);
    totalDuration += serviceDuration;
  }
  
  // Create all BookingService records
  await tx.bookingService.createMany({
    data: bookingServices
  });
  
  // Update main booking fields
  directUpdates.serviceId = data.services[0].serviceId; // Keep first service for backward compat
  directUpdates.totalAmount = totalAmount;
  
  // Recalculate endTime based on new total duration
  if (!data.endTime && totalDuration > 0) {
    const newEndTime = new Date(
      (data.startTime || booking.timeSlot.start).getTime() + totalDuration * 60000
    );
    directUpdates.endTime = newEndTime;
  }
}
```

#### 1.3 Update the Return Statement

Ensure the updated booking includes services (around line 200):
```typescript
// After update, fetch the complete booking with services
const updatedBooking = await tx.booking.findUnique({
  where: { id: data.bookingId },
  include: {
    services: {
      include: {
        service: true,
        staff: true
      }
    },
    customer: true,
    provider: true,
    location: true
  }
});
```

### Phase 2: Update V2 Controller

**File**: `/apps/api/src/contexts/bookings/infrastructure/controllers/bookings.v2.controller.ts`

#### 2.1 Fix the Update Method

Replace lines 314-317 with:
```typescript
if (dto.services && dto.services.length > 0) {
  // Pass full services array to update service
  updateData.services = dto.services.map(s => ({
    serviceId: s.serviceId,
    staffId: s.staffId,
    price: s.price,
    duration: s.duration
  }));
}
```

#### 2.2 Ensure Response Includes Services

After the update (around line 325):
```typescript
// For all updates, return the full booking with services
const query = new GetBookingByIdQuery({
  bookingId: id,
  merchantId: user.merchantId,
});

const updatedBooking = await this.queryBus.execute(query);
return updatedBooking;
```

### Phase 3: Update Repository (if needed)

**File**: `/apps/api/src/contexts/bookings/infrastructure/persistence/prisma-booking.repository.ts`

#### 3.1 Verify Update Method Includes Services

The `update` method should return services (around line 220):
```typescript
async update(
  booking: Booking,
  tx: Prisma.TransactionClient = this.prisma,
): Promise<Booking> {
  const updateData = BookingMapper.toPersistence(booking);
  
  const updated = await tx.booking.update({
    where: {
      id: booking.id,
      merchantId: booking.merchantId,
    },
    data: updateData,
    include: {
      services: {
        include: {
          service: true,
          staff: true,
        },
      },
      customer: true,
      provider: true,
      location: true,
    },
  });

  return BookingMapper.toDomain(updated);
}
```

### Phase 4: Update Outbox Events

**File**: `/apps/api/src/contexts/bookings/application/services/booking-update.service.ts`

#### 4.1 Include Services in Outbox Event

In the outbox event creation (around line 250):
```typescript
// Create outbox event for booking update
const outboxEvent = OutboxEvent.create({
  aggregateId: updatedBooking.id,
  aggregateType: 'booking',
  eventType: 'updated',
  eventData: {
    bookingId: updatedBooking.id,
    bookingNumber: updatedBooking.bookingNumber,
    customerId: updatedBooking.customerId,
    staffId: updatedBooking.providerId,
    serviceIds: updatedBooking.services?.map(s => s.serviceId) || [updatedBooking.serviceId],
    services: updatedBooking.services?.map(s => ({
      serviceId: s.serviceId,
      staffId: s.staffId,
      price: Number(s.price),
      duration: s.duration
    })),
    locationId: updatedBooking.locationId,
    startTime: updatedBooking.startTime,
    endTime: updatedBooking.endTime,
    status: updatedBooking.status,
    totalAmount: Number(updatedBooking.totalAmount),
    notes: updatedBooking.notes
  },
  eventVersion: 1,
  merchantId: updatedBooking.merchantId,
});
```

### Phase 5: Frontend Verification

**File**: `/apps/merchant-app/src/lib/clients/bookings-client.ts`

#### 5.1 Verify updateBooking Method

Ensure it properly sends services (line 165):
```typescript
async updateBooking(id: string, data: UpdateBookingRequest): Promise<Booking> {
  // Log multi-service updates for debugging
  if (data.services && data.services.length > 1) {
    console.log(`[BookingsClient] Updating booking ${id} with ${data.services.length} services`);
  }
  
  const booking = await this.patch(
    `/bookings/${id}`, 
    data, 
    undefined, 
    'v2',
    requestSchemas.updateBooking,
    responseSchemas.booking
  );
  
  const transformedBooking = this.transformBooking(booking);
  
  // Verify services are included in response
  if (booking.services && booking.services.length > 1) {
    console.log(`[BookingsClient] Received ${booking.services.length} services in response`);
  }
  
  return transformedBooking;
}
```

#### 5.2 Verify transformBooking Method

Ensure it preserves services array (line 326):
```typescript
services: booking.services, // IMPORTANT: Preserve the services array for multi-service bookings
```

### Phase 6: Testing Plan

#### 6.1 Unit Tests to Add

1. **BookingUpdateService Tests**
   - Test updating single service to multiple services
   - Test updating multiple services
   - Test removing services (empty array)
   - Test price/duration calculations
   - Test endTime recalculation

2. **Controller Tests**
   - Test PATCH with services array
   - Test response includes all services
   - Test validation of service data

#### 6.2 Manual Testing Scenarios

1. **Add Service to Existing Booking**
   - Open booking with 1 service
   - Add 2nd service
   - Save and verify:
     - Both services persist
     - Total amount is sum of both
     - Duration is sum of both
     - End time is adjusted

2. **Modify Services**
   - Change service prices
   - Change service durations
   - Change staff per service
   - Verify all changes persist

3. **Remove Services**
   - Start with multi-service booking
   - Remove one service
   - Verify removed service is deleted from DB

4. **Edge Cases**
   - Empty services array
   - Invalid service IDs
   - Duplicate service IDs
   - Services with different staff

#### 6.3 Database Verification Queries

```sql
-- Check BookingService records for a booking
SELECT bs.*, s.name as service_name 
FROM "BookingService" bs
JOIN "Service" s ON bs."serviceId" = s.id
WHERE bs."bookingId" = '<booking-id>';

-- Verify no orphaned BookingService records
SELECT bs.* 
FROM "BookingService" bs
LEFT JOIN "Booking" b ON bs."bookingId" = b.id
WHERE b.id IS NULL;

-- Check total amounts match
SELECT 
  b.id,
  b."totalAmount" as booking_total,
  SUM(bs.price) as services_total
FROM "Booking" b
JOIN "BookingService" bs ON b.id = bs."bookingId"
GROUP BY b.id, b."totalAmount"
HAVING b."totalAmount" != SUM(bs.price);
```

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   pm2 restart api
   ```

2. **Database Cleanup** (if needed)
   ```sql
   -- Remove duplicate BookingService records
   DELETE FROM "BookingService" 
   WHERE id NOT IN (
     SELECT MIN(id) 
     FROM "BookingService" 
     GROUP BY "bookingId", "serviceId"
   );
   ```

3. **Temporary Workaround**
   - Document that multi-service updates don't work
   - Advise users to delete and recreate bookings

## Success Metrics

1. **Functional Success**
   - [ ] Multi-service updates persist to database
   - [ ] Refresh shows all services
   - [ ] Total amounts are correct
   - [ ] Durations and end times are correct

2. **Performance Metrics**
   - [ ] Update response time < 500ms
   - [ ] No N+1 queries
   - [ ] Transaction completes < 1 second

3. **Data Integrity**
   - [ ] No duplicate BookingService records
   - [ ] No orphaned BookingService records
   - [ ] Booking totalAmount matches sum of services

## Implementation Order

1. **Day 1**: Backend Changes
   - [ ] Update BookingUpdateService
   - [ ] Update V2 Controller
   - [ ] Test with Postman/curl

2. **Day 2**: Frontend Verification
   - [ ] Verify frontend handling
   - [ ] Add console logging
   - [ ] Manual testing

3. **Day 3**: Testing & Cleanup
   - [ ] Complete all test scenarios
   - [ ] Remove debug logging
   - [ ] Document any limitations

## Notes and Considerations

1. **Backward Compatibility**
   - Keep `serviceId` field for single-service bookings
   - Support both single service and services array in API
   - Ensure existing bookings continue to work

2. **Performance Considerations**
   - Use `createMany` for bulk insert of BookingService records
   - Include services in single query with booking
   - Consider adding index on BookingService.bookingId

3. **Future Enhancements**
   - Allow different prices per service per booking
   - Support service-specific discounts
   - Enable partial service completion

## Code Review Checklist

- [ ] All TypeScript types are updated
- [ ] Error handling for invalid service IDs
- [ ] Transaction rollback on failure
- [ ] Audit logging for service changes
- [ ] API documentation updated
- [ ] No console.log statements in production
- [ ] Performance impact assessed
- [ ] Security implications reviewed