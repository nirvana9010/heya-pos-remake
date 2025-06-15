# Event-Driven Architecture Roadmap

## Phase 1: In-Memory Events (Current)
Using NestJS EventEmitter for decoupling modules.

```typescript
// Booking module emits
this.eventEmitter.emit('booking.created', {
  bookingId: booking.id,
  customerId: booking.customerId,
  startTime: booking.startTime,
});

// Notification module listens
@OnEvent('booking.created')
async handleBookingCreated(event: BookingCreatedEvent) {
  // Send confirmation email
}
```

## Phase 2: Persistent Event Store (Month 3-4)
Add event persistence for audit and replay capabilities.

```typescript
interface DomainEvent {
  id: string;
  aggregateId: string;
  eventType: string;
  eventData: any;
  occurredAt: Date;
  version: number;
}

// Store events before emitting
await this.eventStore.append(event);
this.eventEmitter.emit(event.eventType, event);
```

## Phase 3: Message Queue (Month 5-6)
Replace EventEmitter with RabbitMQ/AWS SQS for reliability.

### Benefits:
- Guaranteed delivery
- Retry mechanisms
- Dead letter queues
- Horizontal scaling

### Implementation:
```typescript
// Publisher
await this.messageQueue.publish('bookings.exchange', {
  routingKey: 'booking.created',
  payload: event,
});

// Consumer
@MessagePattern('booking.created')
async handleBookingCreated(@Payload() event: BookingCreatedEvent) {
  // Process event
}
```

## Event Catalog

### Booking Events
| Event | Payload | Consumers |
|-------|---------|-----------|
| booking.created | bookingId, customerId, services, startTime | Notifications, Analytics |
| booking.cancelled | bookingId, reason, cancelledBy | Notifications, Refunds |
| booking.completed | bookingId, completedAt | Loyalty, Analytics |

### Payment Events
| Event | Payload | Consumers |
|-------|---------|-----------|
| payment.processed | orderId, amount, method | Bookings, Accounting |
| payment.refunded | paymentId, amount, reason | Notifications, Accounting |

### Customer Events
| Event | Payload | Consumers |
|-------|---------|-----------|
| customer.created | customerId, email, source | Marketing, Analytics |
| customer.updated | customerId, changes | Sync services |

## Migration Strategy

### Step 1: Identify Integration Points
- List all cross-module dependencies
- Convert direct calls to events
- One module at a time

### Step 2: Add Event Publishing
- Keep existing direct calls
- Add event emission alongside
- Monitor both paths

### Step 3: Switch Consumers
- Update consumers to use events
- Remove direct dependencies
- Test thoroughly

### Step 4: Remove Legacy Code
- Delete old direct calls
- Clean up unused imports
- Update documentation

## Success Metrics
- Reduced coupling between modules
- Faster feature development
- Improved system resilience
- Better debugging via event logs