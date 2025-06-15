# Bookings Module Architecture

## Overview
The Bookings module is our first bounded context, demonstrating clean architecture principles.

## Directory Structure
```
bookings/
├── domain/
│   ├── entities/
│   │   ├── booking.entity.ts        # Rich domain model
│   │   └── booking-slot.entity.ts   # Value object
│   ├── events/
│   │   ├── booking-created.event.ts
│   │   └── booking-cancelled.event.ts
│   └── repositories/
│       └── booking.repository.interface.ts
├── application/
│   ├── commands/
│   │   ├── create-booking.command.ts
│   │   └── cancel-booking.command.ts
│   ├── queries/
│   │   ├── get-availability.query.ts
│   │   └── get-bookings.query.ts
│   └── services/
│       ├── booking.service.ts
│       └── availability.service.ts
├── infrastructure/
│   ├── persistence/
│   │   └── prisma-booking.repository.ts
│   └── controllers/
│       ├── bookings.controller.ts
│       └── bookings-v2.controller.ts
└── bookings.module.ts
```

## Key Principles

### 1. Domain Layer
- Contains business logic
- No dependencies on infrastructure
- Rich models with behavior

### 2. Application Layer
- Orchestrates use cases
- CQRS pattern (Commands/Queries)
- Emits domain events

### 3. Infrastructure Layer
- Implements interfaces
- Handles persistence
- HTTP controllers

## Example: Rich Domain Model

```typescript
// domain/entities/booking.entity.ts
export class Booking {
  constructor(
    private readonly id: string,
    private status: BookingStatus,
    private readonly timeSlot: TimeSlot,
    // ... other fields
  ) {}

  cancel(reason: string): BookingCancelledEvent {
    if (this.status !== BookingStatus.CONFIRMED) {
      throw new DomainException('Only confirmed bookings can be cancelled');
    }
    
    if (this.timeSlot.isInPast()) {
      throw new DomainException('Cannot cancel past bookings');
    }
    
    this.status = BookingStatus.CANCELLED;
    
    return new BookingCancelledEvent(
      this.id,
      reason,
      new Date()
    );
  }
  
  reschedule(newTimeSlot: TimeSlot): BookingRescheduledEvent {
    // Business logic for rescheduling
  }
}
```

## Inter-Module Communication

### Events Published
- `booking.created`
- `booking.cancelled`
- `booking.completed`

### Events Consumed
- `payment.completed` → Update booking status
- `customer.deleted` → Anonymize bookings

## Testing Strategy

### Unit Tests
- Domain entities
- Application services
- Individual components

### Integration Tests
- Repository implementations
- Controller endpoints
- Event handling

### E2E Tests
- Complete booking flows
- Cross-module interactions