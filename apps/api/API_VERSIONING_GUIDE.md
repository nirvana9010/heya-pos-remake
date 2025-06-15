# API Versioning Guide

## Overview
We use URL path-based versioning to maintain backward compatibility while evolving our API.

## Setup (Already configured in main.ts)
```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

## How to Version Endpoints

### 1. Keep existing endpoints as v1 (default)
Existing endpoints continue to work without changes:
- `/api/bookings` → v1 by default
- `/api/services` → v1 by default

### 2. Create new versions for breaking changes
```typescript
// New controller for v2
@Controller('bookings')
@Version('2')
export class BookingsV2Controller {
  // This will be available at /api/v2/bookings
}

// Or version individual endpoints
@Controller('bookings')
export class BookingsController {
  @Get()
  @Version('1')
  findAllV1() { /* old logic */ }
  
  @Get()
  @Version('2')
  findAllV2() { /* new logic */ }
}
```

## Migration Strategy

### Phase 1: Parallel Development
1. Keep v1 endpoints unchanged
2. Develop v2 endpoints with new format
3. Document differences

### Phase 2: Client Migration
1. Update clients to use v2 endpoints
2. Monitor v1 usage
3. Add deprecation headers to v1

### Phase 3: Sunset
1. Set sunset date for v1
2. Return deprecation warnings
3. Eventually remove v1

## Current Versioning Status

| Endpoint | v1 Status | v2 Status | Notes |
|----------|-----------|-----------|-------|
| `/bookings` | Active | Planned | v2 will use ISO timestamps |
| `/services` | Active | Not needed | No breaking changes |
| `/availability` | - | Active | New in v2 |

## Best Practices
1. Only create v2 when breaking changes are needed
2. Keep v1 and v2 logic separate (use different DTOs)
3. Document all differences between versions
4. Set clear deprecation timelines