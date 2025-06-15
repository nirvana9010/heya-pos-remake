# API Versioning Guide

## Overview

This guide outlines our API versioning strategy for the Heya POS API. We use URL-based versioning for clarity, simplicity, and ease of debugging.

## Versioning Strategy

### URL-Based Versioning
- Format: `/api/v{version}/{resource}`
- Example: `/api/v1/bookings`, `/api/v2/bookings`
- Default version: `v1` (for backward compatibility)

### Why URL Versioning?
1. **Explicit and Clear**: Version is visible in logs, browser history, and analytics
2. **Simple for Consumers**: Easy to test with browsers, curl, and non-technical stakeholders
3. **Cache-Friendly**: Different versions have distinct URLs for HTTP caches
4. **Well-Understood Pattern**: Industry-standard approach that minimizes friction

## Directory Structure

```
src/
├── bookings/
│   ├── v1/
│   │   ├── dtos/
│   │   │   ├── create-booking.v1.dto.ts
│   │   │   └── update-booking.v1.dto.ts
│   │   └── bookings.v1.controller.ts
│   ├── v2/
│   │   ├── dtos/
│   │   │   ├── create-booking.v2.dto.ts
│   │   │   └── update-booking.v2.dto.ts
│   │   └── bookings.v2.controller.ts
│   ├── common/
│   │   ├── dtos/
│   │   │   └── booking-response.dto.ts
│   │   └── entities/
│   │       └── booking.entity.ts
│   ├── bookings.module.ts
│   ├── bookings.service.ts
│   └── booking.repository.ts
```

## Implementation Guidelines

### 1. Controller Versioning

```typescript
// v1 Controller
@Controller({
  path: 'bookings',
  version: '1', // Explicitly set version
})
export class BookingsV1Controller {
  constructor(private readonly bookingsService: BookingsService) {}
  
  @Get()
  async findAll() {
    // v1 implementation
  }
}

// v2 Controller
@Controller({
  path: 'bookings',
  version: '2',
})
export class BookingsV2Controller {
  constructor(private readonly bookingsService: BookingsService) {}
  
  @Get()
  async findAll() {
    // v2 implementation with enhanced features
  }
}
```

### 2. DTO Versioning

Each version should have its own DTOs to maintain type safety and clear documentation:

```typescript
// v1 DTO
export class CreateBookingV1Dto {
  @IsString()
  customerId: string;
  
  @IsString()
  serviceId: string;
  
  @IsDateString()
  startTime: string;
}

// v2 DTO - adds new field
export class CreateBookingV2Dto extends CreateBookingV1Dto {
  @IsOptional()
  @IsBoolean()
  sendReminder?: boolean; // New field in v2
}
```

### 3. Service Layer

Services remain version-agnostic where possible:

```typescript
@Injectable()
export class BookingsService {
  // Shared logic for all versions
  async findAll(filters: BookingFilters) {
    return this.bookingRepository.findMany(filters);
  }
  
  // Version-specific methods when needed
  async createV1(dto: CreateBookingV1Dto) {
    // v1 logic
  }
  
  async createV2(dto: CreateBookingV2Dto) {
    // v2 logic with additional features
  }
}
```

### 4. Module Registration

Register all versioned controllers in the module:

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [
    BookingsV1Controller,
    BookingsV2Controller, // Both versions active
  ],
  providers: [BookingsService, BookingRepository],
  exports: [BookingsService],
})
export class BookingsModule {}
```

## Version Lifecycle

### 1. Active Development (v1)
- Current stable version
- Receives bug fixes and non-breaking improvements
- All new consumers should use this version

### 2. Feature Development (v2)
- Next version under development
- May contain breaking changes
- Available for early adopters and testing

### 3. Deprecated (v0)
- Marked for removal
- Returns deprecation headers
- Documentation updated with migration guide

### 4. Sunset
- Version removed after deprecation period
- Returns 410 Gone status
- Clients must upgrade

## Breaking vs Non-Breaking Changes

### Non-Breaking Changes (No Version Bump)
- Adding optional fields to responses
- Adding new endpoints
- Adding optional query parameters
- Performance improvements
- Bug fixes

### Breaking Changes (Requires New Version)
- Removing or renaming fields
- Changing field types
- Changing required fields
- Changing response structure
- Removing endpoints
- Changing authentication methods

## Migration Guide Template

When introducing a new version, create a migration guide:

```markdown
# Migrating from v1 to v2

## Breaking Changes

### 1. Field Renamed: `startTime` → `scheduledAt`
**v1**: `{ "startTime": "2024-01-01T10:00:00Z" }`
**v2**: `{ "scheduledAt": "2024-01-01T10:00:00Z" }`

### 2. New Required Field: `locationId`
**v1**: Not required
**v2**: `{ "locationId": "uuid" }` - Must specify booking location

## New Features

### 1. Reminder System
- Optional `sendReminder` field
- Automatic SMS/email notifications

## Migration Steps

1. Update your API client to v2 endpoints
2. Add `locationId` to all booking requests
3. Update field mappings for renamed fields
4. Test in staging environment
5. Deploy changes
```

## Testing Versioned APIs

### Integration Tests

```typescript
describe('Bookings API Versioning', () => {
  it('should handle v1 request format', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send(v1BookingData)
      .expect(201);
      
    expect(response.body).toMatchV1Schema();
  });
  
  it('should handle v2 request format', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v2/bookings')
      .send(v2BookingData)
      .expect(201);
      
    expect(response.body).toMatchV2Schema();
  });
  
  it('should use v1 as default version', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bookings') // No version specified
      .expect(200);
      
    expect(response.body).toMatchV1Schema();
  });
});
```

## Client Communication

### Deprecation Headers

When a version is deprecated, include headers:

```typescript
@Controller({
  path: 'bookings',
  version: '0', // Deprecated version
})
export class BookingsV0Controller {
  @Get()
  @Header('Sunset', 'Sat, 1 June 2024 00:00:00 GMT')
  @Header('Deprecation', 'true')
  @Header('Link', '</api/v1/bookings>; rel="successor-version"')
  async findAll() {
    // Legacy implementation
  }
}
```

### Version Discovery

Provide an endpoint for version discovery:

```typescript
@Controller('versions')
@Public()
export class VersionsController {
  @Get()
  getVersions() {
    return {
      current: 'v1',
      supported: ['v1', 'v2'],
      deprecated: ['v0'],
      sunset: {
        v0: '2024-06-01T00:00:00Z',
      },
    };
  }
}
```

## Best Practices

1. **Version from Day One**: Even if you only have v1, set up the versioning infrastructure
2. **Document Everything**: Every breaking change must be documented
3. **Long Deprecation Periods**: Give clients ample time to migrate (minimum 6 months)
4. **Version Discovery**: Provide endpoints for clients to discover available versions
5. **Consistent Patterns**: Use the same versioning pattern across all endpoints
6. **Monitor Usage**: Track version usage to inform sunset decisions
7. **Communicate Early**: Announce deprecations well in advance
8. **Provide Migration Tools**: Offer scripts or tools to help clients migrate

## Monitoring and Analytics

Track version usage to make informed decisions:

```typescript
@Injectable()
export class VersioningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const version = request.version || '1';
    
    // Log version usage
    this.analytics.track('api.version.used', {
      version,
      endpoint: request.url,
      method: request.method,
    });
    
    return next.handle();
  }
}
```

## Conclusion

API versioning is crucial for maintaining backward compatibility while allowing the API to evolve. By following these guidelines, we ensure a smooth experience for both API consumers and maintainers.