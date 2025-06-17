# V1 vs V2 API Architecture Guide

## Overview

The Heya POS API implements two architectural patterns across different versions:
- **V1**: Traditional service layer pattern with direct database access
- **V2**: Domain-Driven Design (DDD) with Command Query Responsibility Segregation (CQRS) and bounded contexts

## Why V2 Was Created

### Problems with V1 Architecture
1. **Tight coupling** between controllers and database schema
2. **Business logic scattered** across services and controllers
3. **No clear domain boundaries** - everything accessed everything
4. **Difficult to scale** - all changes required touching multiple layers
5. **No event-driven capabilities** - hard to integrate with external systems

### V2 Solutions
1. **CQRS Pattern**: Separates read and write operations for better performance and scalability
2. **Bounded Contexts**: Clear domain boundaries with self-contained business logic
3. **Event Sourcing Ready**: Outbox pattern for reliable event delivery
4. **Domain Models**: Rich business logic encapsulated in domain entities
5. **Clean Architecture**: Dependencies point inward, making the core business logic framework-agnostic

## Architecture Comparison

### V1 Architecture (Traditional)
```
Controller → Service → Repository → Database
     ↓          ↓           ↓
    DTO       Logic     Prisma ORM
```

Example: `/api/v1/customers`
- Direct CRUD operations
- Service contains business logic mixed with data access
- Controllers handle validation and transformation

### V2 Architecture (CQRS + DDD)
```
Controller → Command/Query → Handler → Domain → Repository
     ↓            ↓             ↓         ↓          ↓
    DTO      Command/Query   Use Case  Entity   Interface
                                         ↓
                                    Domain Events → Outbox
```

Example: `/api/v2/bookings`
- Commands for write operations (CreateBooking, UpdateBooking)
- Queries for read operations (GetBookingsList, GetCalendarView)
- Domain entities contain business rules
- Repository interfaces hide data access details

## Current Implementation Status

### V1 Endpoints (Still Active)
- **Authentication**: `/api/v1/auth/*` - All auth endpoints remain V1
- **Customers**: `/api/v1/customers/*` - Traditional CRUD
- **Services**: `/api/v1/services/*` - Service management
- **Staff**: `/api/v1/staff/*` - Staff management
- **Payments**: `/api/v1/payments/*` - Payment processing
- **Locations**: `/api/v1/locations/*` - Location management
- **Merchant**: `/api/v1/merchant/*` - Merchant settings
- **Loyalty**: `/api/v1/loyalty/*` - Loyalty program
- **Public**: `/api/v1/public/*` - Public-facing endpoints

### V2 Endpoints (New Architecture)
- **Bookings**: `/api/v2/bookings/*` - Full CQRS implementation
  - Commands: Create, Update, Start, Complete, Cancel
  - Queries: List, Calendar View, Availability Check
  - Domain Events: BookingCreated, BookingUpdated, etc.
  - Outbox Pattern: Reliable event delivery

## Known Issues and Fixes

### DisplayOrder Field Issue
**Problem**: The V2 `get-bookings-list.handler.ts` was trying to order by `displayOrder` on the `BookingService` relation, but this field only exists on the `Service` model.

**Fix**: Update the query to access `displayOrder` through the nested service relation:
```typescript
// Before (incorrect)
orderBy: {
  displayOrder: 'asc',
},

// After (correct)
orderBy: {
  service: {
    displayOrder: 'asc',
  },
},
```

## When to Use V1 vs V2

### Use V1 When:
- Working with existing features that haven't been migrated
- Simple CRUD operations without complex business logic
- Quick prototypes or admin-only features
- Maintaining backward compatibility

### Use V2 When:
- Building new features with complex business rules
- Need event-driven capabilities
- Want clear separation of read/write concerns
- Building for scalability and maintainability

## Migration Strategy

### Phase 1: Implement V2 alongside V1 ✅
- Keep V1 endpoints running for backward compatibility
- Implement V2 for new bounded contexts (completed for bookings)

### Phase 2: Gradual Migration
- Identify next bounded context (suggested: Customers or Inventory)
- Implement V2 version while keeping V1
- Update frontend to use V2 endpoints
- Monitor for issues

### Phase 3: Deprecate V1
- Mark V1 endpoints as deprecated
- Provide migration guide for API consumers
- Set sunset date for V1 endpoints

## Best Practices

### For V1 Development
1. Keep it simple - don't over-engineer V1 endpoints
2. Focus on backward compatibility
3. Document any business logic for future V2 migration

### For V2 Development
1. Start with domain modeling - identify entities, value objects, and aggregates
2. Define clear command and query contracts
3. Keep domain logic in domain entities, not in handlers
4. Use repository interfaces to hide data access
5. Emit domain events for important state changes
6. Use the outbox pattern for reliable event delivery

## Testing Approach

### V1 Testing
- Integration tests at controller level
- Mock services for unit tests
- Database seeding for e2e tests

### V2 Testing
- Unit tests for domain entities (no dependencies)
- Unit tests for command/query handlers (mock repositories)
- Integration tests for full flow
- Event testing for outbox pattern

## Future Considerations

1. **GraphQL Support**: V2 architecture makes it easier to add GraphQL layer
2. **Microservices**: Bounded contexts can be extracted to separate services
3. **Event Streaming**: Outbox pattern enables Kafka/RabbitMQ integration
4. **CQRS Read Models**: Separate read database for complex queries
5. **Event Sourcing**: V2 architecture is ready for full event sourcing if needed

## Conclusion

The V2 architecture provides a more maintainable and scalable foundation for the Heya POS system. While V1 endpoints continue to serve their purpose, new complex features should be built using the V2 pattern to ensure long-term maintainability and flexibility.