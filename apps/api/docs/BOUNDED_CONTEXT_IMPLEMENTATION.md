# Bounded Context Implementation Guide

## Overview

This document describes the implementation of bounded contexts in the Heya POS system, following Domain-Driven Design (DDD) principles. The first bounded context implemented is the Bookings context.

## Architecture

### Directory Structure

```
/src/contexts/
└── bookings/                    # Bookings Bounded Context
    ├── domain/                  # Domain Layer (Core Business Logic)
    │   ├── entities/           # Domain Entities
    │   │   └── booking.entity.ts
    │   ├── value-objects/      # Value Objects
    │   │   ├── time-slot.vo.ts
    │   │   └── booking-status.vo.ts
    │   ├── events/             # Domain Events
    │   │   └── booking-created.event.ts
    │   └── repositories/       # Repository Interfaces
    │       └── booking.repository.interface.ts
    ├── application/            # Application Layer (Use Cases)
    │   ├── commands/          # Command Handlers
    │   │   ├── create-booking.command.ts
    │   │   └── create-booking.handler.ts
    │   ├── queries/           # Query Handlers
    │   └── services/          # Application Services
    ├── infrastructure/         # Infrastructure Layer
    │   ├── persistence/       # Database Implementation
    │   │   ├── booking.mapper.ts
    │   │   └── prisma-booking.repository.ts
    │   └── controllers/       # API Controllers
    │       └── bookings.v2.controller.ts
    └── bookings.context.module.ts  # Module Definition
```

## Key Components

### 1. Domain Layer

#### Entities
- **Booking Entity**: Core domain model with business logic
  - Encapsulates booking state and behaviors
  - Enforces business rules (e.g., state transitions)
  - Emits domain events on state changes

#### Value Objects
- **TimeSlot**: Immutable time period with validation
  - Ensures start time is before end time
  - Minimum 15 minutes, maximum 8 hours
  - Provides overlap detection

- **BookingStatus**: Enumeration with transition rules
  - Valid states: CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
  - Enforces valid state transitions
  - Identifies terminal states

#### Domain Events
- `BookingCreatedEvent`: Emitted when a booking is created
- Events include all necessary data for downstream contexts

### 2. Application Layer

#### Command Handlers
- `CreateBookingHandler`: Orchestrates booking creation
  - Validates input
  - Calls repository to create booking
  - Emits domain events
  - Returns domain entity

### 3. Infrastructure Layer

#### Persistence
- **BookingMapper**: Anti-corruption layer
  - Translates between Prisma models and domain entities
  - Isolates domain from persistence concerns
  - Handles complex nested relations

- **PrismaBookingRepository**: Repository implementation
  - Implements domain repository interface
  - Initially delegates to legacy repository for complex operations
  - Uses mapper to return domain entities

#### Controllers
- **BookingsV2Controller**: API endpoint for V2
  - Exposes bounded context functionality
  - Maps between DTOs and domain models
  - Available at `/api/v2/bookings`

## Migration Strategy

### Strangler Fig Pattern
We're using the Strangler Fig pattern to gradually migrate from the legacy system:

1. **Coexistence**: Both V1 (legacy) and V2 (bounded context) run side by side
2. **Gradual Migration**: Clients migrate to V2 endpoints at their own pace
3. **Feature Parity**: V2 implements all V1 features with improved architecture
4. **Deprecation**: V1 can be removed once all clients migrate

### API Versioning
- V1: `/api/v1/bookings` - Legacy implementation
- V2: `/api/v2/bookings` - Bounded context implementation

## Domain Events Architecture

### Current Implementation (Phase 1)
- Using NestJS EventEmitter for in-process events
- Synchronous event handling within the same context
- Suitable for intra-context communication

### Future Implementation (Phase 2)
- Transactional Outbox pattern for inter-context events
- Guaranteed delivery with at-least-once semantics
- Event storage in database for reliability

## Testing the Implementation

### Unit Tests
- Domain entities have pure business logic tests
- Value objects validate invariants
- Handlers test orchestration logic

### Integration Tests
- Test V2 endpoints end-to-end
- Verify domain behaviors (state transitions)
- Ensure backward compatibility with V1

### Test Script
Run `test-bounded-context.ts` to verify:
- V2 endpoint functionality
- Domain state transitions
- Anti-corruption layer mapping
- Event emission

## Benefits

1. **Separation of Concerns**
   - Domain logic isolated from infrastructure
   - Business rules enforced in domain layer
   - Clear boundaries between contexts

2. **Maintainability**
   - Changes to business logic don't affect infrastructure
   - Easy to test domain logic in isolation
   - Clear dependency flow (inward to domain)

3. **Scalability**
   - Can extract to microservice if needed
   - Domain events enable loose coupling
   - Repository pattern allows changing persistence

4. **Developer Experience**
   - Clear structure and responsibilities
   - Type-safe domain models
   - Explicit business rules in code

## Next Steps

1. **Add Query Side**
   - Implement CQRS pattern
   - Optimize read models for queries
   - Add projection handlers

2. **Implement Outbox Pattern**
   - Add OutboxEvent entity
   - Create transactional event publisher
   - Implement retry mechanism

3. **Add More Bounded Contexts**
   - Customer context
   - Payment context
   - Staff context
   - Each with clear boundaries

4. **Event Sourcing (Optional)**
   - Store events as source of truth
   - Rebuild state from events
   - Enable temporal queries