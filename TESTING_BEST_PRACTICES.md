# API Testing Best Practices

## The Problem with Mock Fallbacks

Using mock API as a fallback **hides real failures** and makes testing unreliable:

```javascript
// ❌ BAD: Silent fallback to mock
try {
  return await realApi.getBookings();
} catch (error) {
  return mockApi.getBookings(); // Hides the failure!
}
```

## Better Testing Approaches

### 1. Explicit Test Modes

```javascript
// ✅ GOOD: Clear separation of concerns
const apiClient = process.env.USE_MOCK_API 
  ? new MockApiClient()    // Explicitly using mock
  : new RealApiClient();    // Explicitly using real API
```

### 2. Visible Failure Indicators

```typescript
// Development Tools Component
export const ApiHealthIndicator = () => {
  const [apiHealth, setApiHealth] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  
  return (
    <div className={`
      fixed bottom-4 right-4 p-2 rounded-full
      ${apiHealth === 'healthy' ? 'bg-green-500' : 
        apiHealth === 'degraded' ? 'bg-yellow-500 animate-pulse' : 
        'bg-red-500 animate-bounce'}
    `}>
      {apiHealth === 'down' && '🚨 API DOWN'}
    </div>
  );
};
```

### 3. Test Environment Configurations

```bash
# .env.test - Real API testing
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_FAIL_ON_API_ERROR=true

# .env.mock - Mock API testing
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_API_URL=mock://api
NEXT_PUBLIC_FAIL_ON_API_ERROR=false

# .env.development - Development with monitoring
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SHOW_API_MONITOR=true
```

### 4. Integration Test Example

```typescript
describe('Booking Flow - Real API', () => {
  beforeEach(() => {
    // Ensure we're using real API
    expect(process.env.NEXT_PUBLIC_USE_MOCK_API).toBe('false');
  });

  it('should create booking successfully', async () => {
    // Monitor API calls
    const apiMonitor = new ApiCallMonitor();
    
    // Create booking
    const booking = await createBooking(testData);
    
    // Verify real API was called
    expect(apiMonitor.getCalls()).toContainEqual({
      method: 'POST',
      endpoint: '/api/bookings',
      status: 201
    });
    
    // Verify NO mock fallback was used
    expect(apiMonitor.getMockCalls()).toHaveLength(0);
  });

  it('should handle API failures gracefully', async () => {
    // Force API to fail
    mockServer.use(
      rest.post('/api/bookings', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    // Attempt to create booking
    await expect(createBooking(testData)).rejects.toThrow('Server error');
    
    // Verify error was shown to user
    expect(screen.getByText(/server error/i)).toBeInTheDocument();
    
    // Verify NO silent fallback to mock
    expect(apiMonitor.getMockCalls()).toHaveLength(0);
  });
});
```

### 5. E2E Test with Failure Simulation

```typescript
// Cypress test
describe('E2E: Booking Creation', () => {
  it('should show error when API is down', () => {
    // Intercept and fail API calls
    cy.intercept('POST', '/api/bookings', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('createBooking');
    
    // Fill form and submit
    cy.get('[data-testid="booking-form"]').within(() => {
      cy.get('input[name="customer"]').type('John Doe');
      cy.get('button[type="submit"]').click();
    });
    
    // Wait for API call
    cy.wait('@createBooking');
    
    // Verify error is shown
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Failed to create booking');
    
    // Verify no success message
    cy.get('[data-testid="success-message"]').should('not.exist');
  });
});
```

### 6. Performance Monitoring

```typescript
// Track API performance
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  recordApiCall(endpoint: string, duration: number) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    this.metrics.get(endpoint)!.push(duration);
    
    // Alert if slow
    if (duration > 3000) {
      console.warn(`⚠️ Slow API call: ${endpoint} took ${duration}ms`);
    }
  }
  
  getP95(endpoint: string): number {
    const times = this.metrics.get(endpoint) || [];
    if (times.length === 0) return 0;
    
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }
}
```

### 7. Mock Service Worker for Controlled Testing

```typescript
// Use MSW for deterministic API mocking
import { setupWorker, rest } from 'msw';

const worker = setupWorker(
  rest.post('/api/bookings', (req, res, ctx) => {
    // Simulate different scenarios based on test flags
    if (window.__TEST_SCENARIO__ === 'network-error') {
      return res.networkError('Failed to connect');
    }
    
    if (window.__TEST_SCENARIO__ === 'server-error') {
      return res(ctx.status(500));
    }
    
    // Normal response
    return res(ctx.json({ id: '123', ...req.body }));
  })
);

// In tests
beforeEach(() => {
  window.__TEST_SCENARIO__ = null;
});

test('handles network errors', async () => {
  window.__TEST_SCENARIO__ = 'network-error';
  // Test network error handling...
});
```

## Testing Checklist

### Unit Tests
- [ ] Test with mock API client (isolated)
- [ ] No network calls
- [ ] Fast and deterministic

### Integration Tests  
- [ ] Test with real API (local/staging)
- [ ] Verify actual API contracts
- [ ] Test error scenarios
- [ ] Monitor for mock fallback usage

### E2E Tests
- [ ] Test complete user flows
- [ ] Simulate API failures
- [ ] Verify error handling UI
- [ ] Check performance metrics

### Performance Tests
- [ ] Load testing with real API
- [ ] Monitor response times
- [ ] Check for memory leaks
- [ ] Validate caching behavior

## Key Principles

1. **Be Explicit**: Always know whether you're using mock or real API
2. **Fail Loudly**: Never hide API failures in tests
3. **Monitor Everything**: Track all API calls and their outcomes
4. **Test Failures**: Explicitly test error scenarios
5. **No Surprises**: Mock fallback should be obvious, not silent

## Summary

The goal is to **know immediately when something fails** rather than having it masked by fallback behavior. Use mocks for isolation in unit tests, but integration and E2E tests should use the real API with proper error handling and monitoring.