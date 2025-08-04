# WebSocket + PostgreSQL LISTEN/NOTIFY: Lessons Learned and Best Practices

## Executive Summary

Implementing real-time notifications using WebSocket with PostgreSQL LISTEN/NOTIFY is powerful but fraught with pitfalls. This document captures the hard-won lessons from days of debugging and trial-and-error to create a production-ready real-time system.

## Table of Contents
1. [The Journey: What Went Wrong](#the-journey-what-went-wrong)
2. [Architecture That Finally Worked](#architecture-that-finally-worked)
3. [Critical Pitfalls and Gotchas](#critical-pitfalls-and-gotchas)
4. [Best Practices for Future Implementation](#best-practices-for-future-implementation)
5. [Production Checklist](#production-checklist)

---

## The Journey: What Went Wrong

### 1. WebSocket Adapter Not Initialized (Day 1)
**Problem**: WebSocket connections weren't working despite correct Socket.IO setup.
```typescript
// ❌ WRONG - Forgot to initialize adapter
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

// ✅ CORRECT - Must initialize IoAdapter
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app)); // CRITICAL!
  await app.listen(3000);
}
```

### 2. Token Available But Not Used (Day 1-2)
**Problem**: Token existed in localStorage but WebSocket wasn't using it.
```typescript
// ❌ WRONG - Relying on auth context that might not be ready
const { user } = useAuth();
if (!user) return; // Token exists but user not loaded yet

// ✅ CORRECT - Get token directly from storage
const token = localStorage.getItem('access_token');
if (token) {
  connectWithToken(token);
}
```

### 3. React Hook Dependency Array Hell (Day 2)
**Problem**: useEffect dependencies changing caused infinite reconnection loops.
```typescript
// ❌ WRONG - Options object recreated every render
useEffect(() => {
  // WebSocket logic
}, [options]); // options is new object every time!

// ✅ CORRECT - Use ref pattern for stable reference
const optionsRef = useRef(options);
optionsRef.current = options;
useEffect(() => {
  // Use optionsRef.current
}, []); // Empty array, no dependencies!
```

### 4. Invalid Namespace Error (Day 2)
**Problem**: WebSocket URL included '/api' prefix causing namespace errors.
```typescript
// ❌ WRONG
const socket = io('http://localhost:3000/api/notifications');

// ✅ CORRECT - Remove /api prefix for WebSocket
const baseUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
const socket = io(`${baseUrl}/notifications`);
```

### 5. Database Column Mismatches (Day 3)
**Problem**: SQL triggers using wrong column names causing silent failures.
```sql
-- ❌ WRONG - serviceId doesn't exist in Booking table
'serviceId', NEW."serviceId"

-- ✅ CORRECT - No serviceId column in Booking
-- Must join with BookingService table to get service info
```

### 6. Missing Required Fields in NOTIFY Payload (Day 3)
**Problem**: Frontend expected fields that didn't exist or were named differently.
```sql
-- ❌ WRONG - Missing required fields
json_build_object('id', NEW.id)

-- ✅ CORRECT - Include all fields frontend expects
json_build_object(
  'id', NEW.id,
  'bookingNumber', NEW."bookingNumber",  -- Required!
  'status', NEW.status,
  'startTime', NEW."startTime"
)
```

### 7. JWT Expiration Edge Cases (Day 4)
**Problem**: 7-day tokens expired while users stayed logged in, WebSocket never recovered.
- No proactive refresh mechanism
- No reactive retry on auth failure
- Users stuck in limbo: logged in but disconnected

### 8. Error Toasts Confusing Users
**Problem**: WebSocket errors shown to merchants who didn't understand them.
```typescript
// ❌ WRONG - Showing technical errors to users
toast.error('WebSocket connection failed: JWT expired');

// ✅ CORRECT - Fail silently, show connection status instead
// No toasts! Use visual indicators
<ConnectionStatus status={connectionStatus} />
```

---

## Architecture That Finally Worked

### Backend Architecture
```
PostgreSQL Database
    ↓ (Triggers on INSERT/UPDATE/DELETE)
    ↓ pg_notify('channel_name', json_payload)
    ↓
PostgresListenerService (NestJS)
    ↓ (Node pg client listening)
    ↓ EventEmitter2 events
    ↓
NotificationsGateway (Socket.IO)
    ↓ (JWT authentication)
    ↓ Room-based broadcasting (merchantId rooms)
    ↓
WebSocket Connection → Frontend
```

### Frontend Architecture
```
useRobustWebSocket Hook
    ├── Connection State Machine
    │   ├── INITIALIZING
    │   ├── CONNECTED
    │   ├── RECONNECTING
    │   └── DEGRADED (fallback to polling)
    ├── Proactive Token Refresh (AuthContext)
    ├── Reactive Token Refresh (on auth failure)
    ├── Circuit Breaker (max 5 attempts)
    ├── Exponential Backoff
    ├── Heartbeat/Zombie Detection
    └── Visual Status Indicator
```

---

## Critical Pitfalls and Gotchas

### 1. Database Triggers Are Fragile
- **Column names must match exactly** (case-sensitive with quotes)
- **Check for NULL values** - COALESCE everything
- **Test with actual SQL** before implementing triggers
- **Log trigger failures** - They fail silently otherwise

### 2. WebSocket URL Gotchas
- Remove `/api` prefix for Socket.IO namespaces
- Use full URL for CORS in production
- WebSocket path is NOT the same as HTTP endpoint path

### 3. Token Management Complexity
- Tokens in localStorage != tokens in memory
- Auth context might not be ready when WebSocket initializes
- Multiple token sources (localStorage, cookies, auth context)
- Refresh tokens need separate handling

### 4. React Hook Pitfalls
- Dependency arrays with objects = infinite loops
- Missing dependencies = stale closures
- Too many dependencies = excessive re-renders
- Solution: useRef for stable references

### 5. Silent Failures Everywhere
- Database triggers fail silently
- NOTIFY has 8KB payload limit (fails silently if exceeded)
- WebSocket disconnections might not trigger events
- JWT expiration might not throw errors

### 6. Development vs Production Differences
- CORS behaves differently
- WebSocket transports (polling vs websocket)
- SSL/WSS requirements in production
- Proxy servers may block WebSocket upgrades

---

## Best Practices for Future Implementation

### 1. Start Simple, Add Complexity Gradually
```typescript
// Phase 1: Basic connection
const socket = io(url, { auth: { token } });

// Phase 2: Add reconnection logic
// Phase 3: Add token refresh
// Phase 4: Add circuit breaker
// Phase 5: Add heartbeat
```

### 2. Always Use the Ref Pattern for Hooks
```typescript
export function useWebSocket(options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  useEffect(() => {
    // Use optionsRef.current, not options
  }, []); // Empty dependency array
}
```

### 3. Implement Comprehensive Logging
```typescript
const debug = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WebSocket] ${message}`, ...args);
  }
};
```

### 4. Database Trigger Best Practices
```sql
CREATE OR REPLACE FUNCTION notify_changes()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  -- Build payload with NULL checks
  payload := json_build_object(
    'id', NEW.id,
    'field', COALESCE(NEW.field, 'default'),
    'timestamp', NOW()
  );
  
  -- Check payload size (8KB limit)
  IF length(payload::text) < 8000 THEN
    PERFORM pg_notify('channel', payload::text);
  ELSE
    -- Log error or send minimal payload
    PERFORM pg_notify('channel', json_build_object(
      'id', NEW.id,
      'error', 'payload_too_large'
    )::text);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Trigger notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5. Implement Proper State Machine
```typescript
type ConnectionState = 
  | 'INITIALIZING'    // First connection
  | 'CONNECTED'       // Working perfectly
  | 'RECONNECTING'    // Temporary issue
  | 'DEGRADED';       // Fallback mode

// State transitions should be explicit
const transition = (from: ConnectionState, to: ConnectionState) => {
  console.log(`Transition: ${from} → ${to}`);
  setState(to);
};
```

### 6. Token Refresh Strategy
```typescript
// Proactive: Refresh before expiry
const scheduleRefresh = (expiresAt: Date) => {
  const refreshTime = expiresAt.getTime() - (60 * 60 * 1000); // 1hr before
  setTimeout(() => refreshToken(), refreshTime - Date.now());
};

// Reactive: Refresh on failure
socket.on('connect_error', async (error) => {
  if (error.message.includes('jwt')) {
    const newToken = await refreshToken();
    socket.auth.token = newToken;
    socket.connect();
  }
});
```

### 7. Visual Feedback is Critical
```typescript
// Users need to know connection status
<ConnectionStatus 
  status={state}
  onReconnect={manualReconnect}
/>

// States should be clear:
// 🟢 Live - Real-time updates active
// 🟡 Reconnecting - Temporary interruption
// 🔴 Delayed - Using 60s polling fallback
```

---

## Production Checklist

### Pre-Deployment
- [ ] WebSocket adapter initialized in main.ts
- [ ] Database triggers tested with production data volume
- [ ] NOTIFY payload size verified (<8KB)
- [ ] All column names verified in triggers
- [ ] Token refresh tested with actual expiry times
- [ ] Circuit breaker limits appropriate for production
- [ ] Heartbeat interval tuned for your use case
- [ ] Polling fallback interval acceptable for users
- [ ] Connection status UI implemented and visible
- [ ] No error toasts for connection issues
- [ ] CORS configured for production domains
- [ ] WSS (secure WebSocket) configured if using HTTPS
- [ ] Proxy/load balancer WebSocket support verified
- [ ] Monitoring/alerting for connection failures

### Post-Deployment Monitoring
- [ ] Track connection success rate
- [ ] Monitor average reconnection time
- [ ] Alert on high disconnection rates
- [ ] Monitor PostgreSQL LISTEN/NOTIFY queue
- [ ] Track payload sizes approaching 8KB limit
- [ ] Monitor token refresh success/failure rates
- [ ] Track time in DEGRADED state
- [ ] User feedback on real-time performance

### Rollback Plan
- [ ] Feature flag to disable WebSocket
- [ ] Fallback to polling-only mode
- [ ] Database triggers can be dropped without breaking app
- [ ] Client-side localStorage flag to force polling

---

## Code Template for Future Projects

### Backend Setup (NestJS)
```typescript
// 1. postgres-listener.service.ts
@Injectable()
export class PostgresListenerService implements OnModuleInit, OnModuleDestroy {
  private client: Client;
  
  async onModuleInit() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await this.client.connect();
    
    await this.client.query('LISTEN your_channel');
    
    this.client.on('notification', (msg) => {
      const payload = JSON.parse(msg.payload);
      this.eventEmitter.emit(`postgres.${msg.channel}`, payload);
    });
  }
}

// 2. notifications.gateway.ts
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;
  
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const room = `merchant-${payload.merchantId}`;
      await client.join(room);
      client.emit('connected', { room });
    } catch (error) {
      client.disconnect();
    }
  }
  
  @OnEvent('postgres.**')
  handleDatabaseEvent(payload: any) {
    const room = `merchant-${payload.merchantId}`;
    this.server.to(room).emit(payload.type, payload);
  }
}
```

### Frontend Setup (React)
```typescript
// useRobustWebSocket.ts
export function useRobustWebSocket(options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  const [state, setState] = useState('INITIALIZING');
  const socketRef = useRef(null);
  
  useEffect(() => {
    let mounted = true;
    
    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      socketRef.current = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      
      socketRef.current.on('connect', () => {
        if (mounted) setState('CONNECTED');
      });
      
      // ... other event handlers
    };
    
    connect();
    
    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, []); // Empty array!
  
  return { state, socket: socketRef.current };
}
```

### Database Triggers
```sql
-- Generic trigger function
CREATE OR REPLACE FUNCTION notify_table_changes()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    TG_TABLE_NAME || '_' || TG_OP,
    json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'id', CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id 
        ELSE NEW.id 
      END,
      'data', CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
        ELSE row_to_json(NEW)
      END,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to any table
CREATE TRIGGER booking_notify
AFTER INSERT OR UPDATE OR DELETE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION notify_table_changes();
```

---

## Conclusion

Building a production-ready WebSocket + PostgreSQL LISTEN/NOTIFY system requires:
1. **Meticulous attention to detail** - One wrong column name breaks everything
2. **Comprehensive error handling** - Assume everything can fail
3. **User-centric design** - Visual feedback > error messages
4. **Defensive programming** - Circuit breakers, fallbacks, retries
5. **Proper testing** - Especially edge cases like token expiry

The journey from "doesn't look to be connecting" to a robust real-time system involved solving dozens of interconnected problems. This document captures those lessons so future implementations can avoid the same pitfalls.

Remember: **Start simple, test everything, and always have a fallback plan.**